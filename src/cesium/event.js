import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";
import * as turf from "@turf/turf";


// 事件监听的方法放这里
export default class CesiumEvent {
    _eventHandlers = {};
    // type代表地图上动态操作的类型，使用changeMouseEventType改变
    // null 默认 获取经纬度。其他类型会让左键点击获取entity失效 0:获取点，1:画点，2:画线，3:画面，4:面掏洞，5：移动图标，6:修改图形（线，面）
    _type = null;
    _showDistance = true; // 在线面的情况下  是否显示长度和周长与面积
    _viewer = null;
    _debug = false;

    constructor(viewer, isDebugger) {
        this._viewer = viewer;
        this.geometry = new CesiumGeometry(viewer);
        this.utils = new CesiumUtils(viewer);
        this.event(new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas), viewer);
        this.getNorth();
        // 是否为debugger模式
        this._debug = isDebugger;
    }

    /**
     * 订阅事件，用法：
     *  menu.on('select', function(item) { ... }
     */
    on(eventName, handler) {
        if (!this._eventHandlers) this._eventHandlers = {};
        if (!this._eventHandlers[eventName]) {
            this._eventHandlers[eventName] = [];
        }
        this._eventHandlers[eventName].push(handler);
    }

    /**
     * 取消订阅，用法：
     *  menu.off('select', handler)
     */
    off(eventName, handler) {
        let handlers = this._eventHandlers?.[eventName];
        if (!handlers) return;
        if (!handler) {
            return delete this._eventHandlers[eventName];
        }
        for (let i = 0; i < handlers.length; i++) {
            if (handlers[i] === handler) {
                handlers.splice(i--, 1);
            }
        }
    }

    /**
     * 生成具有给定名称和数据的事件
     *  this.trigger('select', data1, data2);
     */
    trigger(eventName, ...args) {
        if (!this._eventHandlers?.[eventName]) {
            return; // 该事件名称没有对应的事件处理程序（handler）
        }

        // 调用事件处理程序（handler）
        this._eventHandlers[eventName].forEach(handler => handler.apply(this, args));
    }

    /**
     * 切换操作类型
     * @param type 0:获取点，1:画点，2:画线，3:画面，4:面掏洞，5：移动图标，6:修改图形（线，面）
     * @param showDistance
     */
    changeMouseEventType(type, showDistance = true) {
        this._showDistance = showDistance
        this._type = type
        // 如果设置type为6  查找地球上全部的线和面，然后每个拐点放一个图标 允许拖拽
        if (this._type == 6) {
            let allEntity = this.geometry.getAllEntity();
            allEntity.forEach(entity => {
                this.reloadTypeIsSixPoint(entity);
            });
        } else {
            this.saveChangePolylineOrPolygon();
        }
    }

    // 保存修改的线或面
    saveChangePolylineOrPolygon() {
        let allEntity = this.geometry.getAllEntity();
        let entities = this._viewer.dataSources.getByName('defaultDraw')[0]?.entities;
        allEntity.forEach(entity => {
            let removePointList = entities.values.filter(item => item.id.startsWith(entity.id));
            removePointList.forEach(point => {
                entities.removeById(point.id)
            })
        });
    }

    /**
     * 当设置的type为6时，在线和面的拐点上标记出可拖拽的白点以修改线和面的位置
     * @param entity
     */
    reloadTypeIsSixPoint(entity) {
        // 先删除以这个entity为基准的全部的点
        let entities = this._viewer.dataSources.getByName('defaultDraw')[0]?.entities;
        let removePointList = entities.values.filter(item => item.id.startsWith(entity.id));
        removePointList.forEach(point => {
            entities.removeById(point.id)
        })
        let positionList = [];
        if (Cesium.defined(entity.polyline)) {
            entity.polyline.positions.getValue().forEach((position, index) => {
                positionList.push({
                    entity,
                    position,
                    index
                });
            });
        }
        if (Cesium.defined(entity.polygon)) {
            entity.polygon.hierarchy.getValue().positions.forEach((position, index) => {
                positionList.push({
                    entity,
                    position,
                    index
                });
            })
        }

        // 错开删除和添加事件，免得删除的时候把添加的点一起删除了
        setTimeout(() => {
                positionList.map(info => {
                    this.geometry.addMarker({
                        position: info.position,
                        hasMove: true,
                        id: info.entity.id + '@' + info.index,
                        label: this.utils.cartesian3ToDegree2(info.position, 2).toString(),
                        description: 'typeIsSixPoint'
                    }, 'defaultDraw')
                });
            }, 1
        )
    }

    /**
     * 每个事件只能绑定一次Cesium.ScreenSpaceEventType，所以一般的处理方法就是在事件里面通过if判断来处理逻辑。
     * event准备使用方法内区分业务逻辑
     * @param handler
     * @param viewer
     */
    event(handler, viewer) {
        let that = this;
        // 这个是当前的世界坐标系列表，包含点线面Entity的世界坐标系点。点击右键的时候会通过监听geometryData方法返回
        let activeShapePoint = [];
        // 这个实体，是一个点，会随着鼠标移动而更改，每次右键后删除
        let activeEntity = null;
        // 这个是当前正在画的实体（type=1,2,3,4）或者是移动图标的图标信息（type=5），是线面本身，因为它每次只会画一个，所以是对象。在右键后把数据传到addLine，addPolygon方法后删除
        let drewEntity = null;
        // 在线面类型表示弯折点（type=1,2,3,4），点类型表示点列表（type=0|null）
        let markerList = [];
        // 当前正在画的实体的id，鼠标点一下，图形多一个点，这个index+1，用于后期按住alt+鼠标点击圆点时找到被选的正在画的实体的那个拐角坐标
        let drewMarkerIndex = 0;

        // 是否保持着鼠标按下的操作
        let handleLeftDown = false;

        /**
         * 停止画线面
         * @param saveEntity 是否保存实体 不保存实体约等于取消这次画图 修改（_type == 6）不会走这个方法
         */
        function stopDrawing(saveEntity) {
            // 右键后返回的值 通过修改entity来调整实体的样式和数据
            // 点返回数组，线面返回对象
            let entityList = null;
            drewMarkerIndex = 0
            viewer.entities.remove(activeEntity);
            viewer.entities.remove(drewEntity);
            activeEntity = null;
            drewEntity = null;
            markerList.map(x => {
                viewer.entities.remove(x);
            })
            markerList = [];
            if (saveEntity) {
                activeShapePoint.pop();
                if (that._type == 1) {
                    entityList = [];
                    activeShapePoint.forEach(x => {
                        entityList.push(that.geometry.addMarker({
                            position: x
                        }));
                    })
                } else if (that._type == 2) {
                    entityList = that.geometry.addLine({positions: activeShapePoint}, 'defaultDraw');
                } else if (that._type == 3) {
                    entityList = that.geometry.addPolygon({positions: activeShapePoint}, 'defaultDraw');
                } else if (that._type == 4) {
                    let newHole = activeShapePoint.map(x => that.utils.cartesian3ToDegree2(x, 1))
                    // 首尾相连 下同
                    newHole.push(newHole[0]);
                    let entities = viewer.dataSources.getByName('defaultDraw')[0]?.entities
                    if (entities) {
                        // 计算是否包含 包含就把Polygon掏洞
                        let polygons = entities.values.filter(entity => entity.polygon !== undefined);
                        polygons.forEach(function (entity) {
                            let hierarchy = entity.polygon.hierarchy.getValue(undefined)
                            if (!hierarchy.holes) {
                                hierarchy.holes = [];
                            }
                            let entityPositions = hierarchy.positions.map(x => that.utils.cartesian3ToDegree2(x, 1))
                            entityPositions.push(entityPositions[0])
                            // 判定洞之间是否相交 相交就忽略这个洞并提示
                            let isError = false;
                            hierarchy.holes.forEach(hole => {
                                let holePosition = hole.positions.map(x => that.utils.cartesian3ToDegree2(x, 1));
                                let boolIntersect = turf.intersect(turf.polygon([[...holePosition, holePosition[0]]]), turf.polygon([newHole]))
                                if (boolIntersect) {
                                    // 相交
                                    isError = true;
                                    return false
                                }
                            })
                            if (isError) {
                                that.utils.kazeConsole("洞相交，当前图形作废", 2);
                                return;
                            }
                            // 判定是否包含在这个entity内
                            let isOverlap = turf.booleanContains(turf.polygon([entityPositions]), turf.polygon([newHole]));
                            if (isOverlap) {
                                entityPositions.pop();
                                newHole.pop();
                                hierarchy.holes.push({positions: that.utils.convertToCartesian3(newHole)});
                                entity.polygon.hierarchy = hierarchy
                            } else {
                                that.utils.kazeConsole("父级未完全包含洞，当前图形作废", 2);
                                return;
                            }
                            that.trigger("holeDraw", entity);
                        });
                    }
                }
                that.trigger("draw", entityList, activeShapePoint, that._type);
            }
            activeShapePoint = [];
        }

        // 左键
        handler.setInputAction(function (evt) {
            if (that._type == null) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene)
                return that.utils.cartesian3ToDegree2(pick);
            } else if (that._type == 0) {
                // 返回点击的经纬度或者是entity点
                const pick = viewer.scene.pick(evt.position)
                const position = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene)
                const windowCoordinates = that.utils.wgs84ToWindowCoordinates(viewer.scene, position);
                if (pick) {
                    const info = {
                        entity: pick?.id,
                        position: that.utils.cartesian3ToDegree2(position),
                        windowCoordinates
                    };
                    that.trigger("handleClick", info);
                }
            } else if ([1, 2, 3, 4].includes(that._type)) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene);
                if (!Cesium.defined(pick)) {
                    return;
                }
                markerList.push(viewer.entities.add({
                    description: 'kazeId-' + drewMarkerIndex++,
                    position: pick, point: {
                        color: Cesium.Color.WHITE,
                        pixelSize: 16,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    },
                }));

                // 画线面
                if (!drewEntity) {
                    let shapeEntityOptions;
                    if (that._type === 2) {
                        shapeEntityOptions = {
                            polyline: {
                                positions: new Cesium.CallbackProperty(() => activeShapePoint, false),
                                clampToGround: true,
                                width: 3,
                            }
                        };
                    } else if (that._type === 3 || that._type === 4) {
                        shapeEntityOptions = {
                            polygon: {
                                hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(activeShapePoint), false),
                                material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7)),
                            },
                        };
                    }
                    if (shapeEntityOptions) {
                        drewEntity = viewer.entities.add(shapeEntityOptions);
                    }
                }
                activeShapePoint.push(pick);
            }

            // 防止取消监听失败
            markerList.map(x => x.label = undefined)
            handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.ALT);
            handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.ALT);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 右键
        handler.setInputAction(evt => {
            if (that._type == null) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene)
                return that.utils.cartesian3ToDegree2(pick);
            } else if (that._type == 0 || that._type == 6) {
                const pick = viewer.scene.pick(evt.position)
                const position = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene)
                const windowCoordinates = that.utils.wgs84ToWindowCoordinates(viewer.scene, position);

                if(that._type == 0 && pick && position){
                    if (pick && position) {
                        const info = {
                            entity: pick?.id,
                            position: that.utils.cartesian3ToDegree2(position),
                            windowCoordinates
                        };
                        that.trigger("contextMenu", info);
                    }
                }

                if(that._type == 6){
                    let parent = null; // 如果点击的是拐点 这是他的父级
                    let parentIndex = null; // 如果点击的是拐点 这个表示它是父级拐点中的第几个
                    // 如果id带@ 则是某个图形的拐点，把parent也放进去
                    if (pick && pick.id && Cesium.defined(pick.id) && pick.id.id && pick.id.id.split('@').length > 1) {
                        let id = pick.id.id.split('@')[0];
                        parentIndex = pick.id.id.split('@')[1];
                        parent = that.geometry.getEntityById(id);
                    }
                    if (pick && position) {
                        const info = {
                                parent,
                                parentIndex,
                            entity: pick?.id,
                            position: that.utils.cartesian3ToDegree2(position),
                            windowCoordinates
                        };
                        that.trigger("contextMenu", info);
                    }
                }

            } else {
                stopDrawing(true);
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        // _type == 6 的时候使用，移动的时候因为时实时获取鼠标选中的图形，通过这个参数，在鼠标按下时获取当前点，然后一直操作这个点，直到鼠标松开
        let handlePoint = null;
        // 移动
        handler.setInputAction(evt => {
            const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.endPosition), viewer.scene);
            if (that._type == 1 || that._type == 2 || that._type == 3 || that._type == 4) {
                // 添加起始点和根据type添加动态点 type = 1,2,3,4
                if (!Cesium.defined(activeEntity) && Cesium.defined(pick)) {
                    activeEntity = viewer.entities.add({
                        position: pick,
                        point: {
                            color: Cesium.Color.WHITE,
                            pixelSize: 5,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        }
                    });

                    if (that._showDistance) {
                        that.geometry.markerAddLabel(activeEntity, "请标记")
                    }
                    activeShapePoint.push(pick);
                } else if (Cesium.defined(pick) && activeShapePoint.length > 0) {
                    activeEntity.position.setValue(pick)
                    activeShapePoint.pop();
                    activeShapePoint.push(pick);
                    // 线条计算长度 多边形计算长度面积
                    if (that._showDistance) {
                        if (that._type == 1) {
                            let location = that.utils.cartesian3ToDegree2(pick);
                            that.geometry.markerAddLabel(activeEntity, `${location.longitude.toFixed(6)},${location.latitude.toFixed(6)}`)
                            return;
                        }
                        let terrainLength = 0, length = 0;
                        // 计算长度
                        for (let i = 1; i < activeShapePoint.length; i++) {
                            terrainLength += that.utils.computePointDistanceWithTerrain(activeShapePoint[i], activeShapePoint[i - 1]);
                            length += that.utils.computePointDistance(that.utils.cartesian3ToDegree2(activeShapePoint[i], 1), that.utils.cartesian3ToDegree2(activeShapePoint[i - 1], 1));
                        }
                        if (that._type == 2) {
                            that.geometry.markerAddLabel(activeEntity, `共${terrainLength.toFixed(2)}米，投影长度${length.toFixed(2)}米`)
                        }
                        // 面积计算未包含起伏山地的计算 只有投影大小
                        if ((that._type == 3 || that._type == 4) && activeShapePoint.length > 2) {
                            let area = that.utils.computePolygonArea(activeShapePoint.map(x => that.utils.cartesian3ToDegree2(x, 1)));
                            // 周长还需要添加一个末尾点到起始点的距离
                            length += that.utils.computePointDistanceWithTerrain(activeShapePoint[activeShapePoint.length - 1], activeShapePoint[0]);
                            that.geometry.markerAddLabel(activeEntity, `周长${length.toFixed(2)}米，面积${area.toFixed(2)}平方米`)
                        }
                    }
                }
            } else if (that._type == 5 && Cesium.defined(drewEntity)) {
                drewEntity.position.setValue(pick);
                that.trigger('entityMove', {entity: drewEntity, location: that.utils.cartesian3ToDegree2(pick)})
            }
            // 如果是修改 则移动点
            else if (that._type == 6) {
                let pickPoint = that._viewer.scene.pick(evt.startPosition)?.id;
                // 悬浮上去后询问添加点或删除点
                if (pickPoint && Cesium.defined(pickPoint.point) && pickPoint.description?.getValue() == "typeIsSixPoint") {

                }

                // 鼠标长按并拖拽的操作点
                if (handlePoint == null && pickPoint && Cesium.defined(pickPoint.point) && pickPoint.description?.getValue() == "typeIsSixPoint" && handleLeftDown) {
                    handlePoint = pickPoint;
                }

                // 拖拽操作
                if (!handleLeftDown && Cesium.defined(handlePoint)) {
                    that.trigger("changePoint", {
                        handlePoint: handlePoint,
                        entity: that.geometry.getEntityById(pickPoint.id.split('@')[0])
                    });
                    handlePoint = null;
                    that.utils.unlockCamera()
                }
                if (Cesium.defined(handlePoint)) {
                    that.utils.lockCamera()
                    handlePoint.position.setValue(pick);
                    handlePoint.label.text.setValue(that.utils.cartesian3ToDegree2(pick, 1).toString());
                    /**
                     * 通过id找到它对应的图形的点 id生成方法查看 changeMouseEventType 中 if(_type == 6)的情况
                     * @see changeMouseEventType
                     */
                    let parentId = handlePoint.id.split('@')[0];
                    let entity = that.geometry.getEntityById(parentId);
                    if (Cesium.defined(entity.polyline)) {
                        let pointList = entity.polyline.positions.getValue();
                        pointList[parseInt(handlePoint.id.split('@')[1])] = pick;
                        entity.polyline.positions = pointList;
                    }
                    if (Cesium.defined(entity.polygon)) {
                        // 使用Entity.change方法更新属性
                        let pointList = entity.polygon.hierarchy.getValue();
                        entity.polygon.hierarchy = new Cesium.PolygonHierarchy(
                            pointList.positions.map((position, index) => index === parseInt(handlePoint.id.split('@')[1]) ? pick : position),
                            // 以上一行代码展开为下
                            // entity.polygon.hierarchy.getValue().positions.map( (position, index)=> {
                            //     if (index === parseInt(handlePoint.id.split('@')[1])) {
                            //         return pick;
                            //     } else {
                            //         return position;
                            //     }
                            // }),
                            pointList.holes
                        );
                    }
                }
            }
            // 切换到非画图时，走一次删除，把没花完的全部清除
            else if (that._type == 0 && Cesium.defined(activeEntity)) {
                // 如果有activeEntity，就表示是画图
                stopDrawing(false);
            }

            if (handleLeftDown) {
                let center = viewer.camera.position;
                let location = that.utils.cartesian3ToDegree2(center);
                that.trigger('cameraMove', {...location, cameraHeight: viewer.camera.positionCartographic.height})
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // 鼠标按下
        handler.setInputAction(evt => {
            handleLeftDown = true;
            const pick = viewer.scene.pick(evt.position)
            if (that._type == 5 && Cesium.defined(pick?.id)) {
                // 只有标记了hasMove才能被移动
                if (pick.id.hasMove) {
                    that.utils.lockCamera()
                    drewEntity = pick?.id;
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        // 鼠标抬起
        handler.setInputAction(evt => {
            handleLeftDown = false;
            if (that._type == 5 && Cesium.defined(drewEntity)) {
                drewEntity = null;
                that.utils.unlockCamera()
            }
        }, Cesium.ScreenSpaceEventType.LEFT_UP);

        // 在已经画好的图形上修改 初步想法是按住ALT，跟踪鼠标的activeEntity隐藏，然后鼠标左键拖拽点
        handler.setInputAction(evt => {
            // 隐藏activeEntity
            let pick = viewer.scene.pick(evt.position);
            let description = pick?.id?.description;
            let value = description ? description.getValue() : null;

            if (value) {
                let index = value.split('-')[1];
                handler.setInputAction(evt => {
                    const movePick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.endPosition), viewer.scene);
                    if (Cesium.defined(movePick)) {
                        // 改图形点
                        activeShapePoint[index] = movePick;
                        // 改markerList
                        markerList[index].position.setValue(movePick);
                        let location = that.utils.cartesian3ToDegree2(movePick);
                        that.geometry.markerAddLabel(markerList[index], `${location.longitude.toFixed(6)},${location.latitude.toFixed(6)}`)
                    }
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.ALT)
                handler.setInputAction(evt => {
                    markerList[index].label = undefined;
                    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.ALT);
                    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.ALT);
                }, Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.ALT)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.ALT)

        handler.setInputAction(() => {
            let center = viewer.camera.position;
            let location = that.utils.cartesian3ToDegree2(center);
            that.trigger('cameraMove', {...location, cameraHeight: viewer.camera.positionCartographic.height})
        }, Cesium.ScreenSpaceEventType.WHEEL)

        // 监听朝向
        viewer.scene.preRender.addEventListener(function () {
            // 获取当前视图的朝向（方向）
            let viewHeading = viewer.camera.heading;
            // 将视图的朝向转换为角度（0-360）
            let viewHeadingDeg = Cesium.Math.toDegrees(viewHeading);
            // 计算地图的北方向角度
            let northAngle = (360.0 - viewHeadingDeg) % 360.0;
            that.trigger('northAngle', northAngle)
        });


        // 不知道为什么只能触发一次，必须要移动地球一次才能再次触发一次
        // let popPoint = null;
        // let canvas = viewer.canvas;
        // // 监听键盘按下事件
        // canvas.addEventListener('keydown', function (event) {
        //     console.log(event)
        //     if (event.key === 'Alt' && Cesium.defined(activeEntity)) {
        //         activeEntity.show = false;
        //         popPoint = activeShapePoint.pop();
        //     }
        // });
        //
        // // // 监听键盘按下事件
        // document.addEventListener('keyup', function (event) {
        //     console.log(event)
        //     if (event.key === 'Alt' && Cesium.defined(activeEntity)) {
        //         activeEntity.show = true;
        //         activeShapePoint.push(popPoint);
        //         popPoint = null;
        //     }
        // });
    }

    getNorth() {
        let that = this;
        let oldNorthAngle = null;
        // 注册时钟的tick事件
        this._viewer.scene.preRender.addEventListener(function () {
            // 获取当前视图的朝向（方向）
            let viewHeading = that._viewer.camera.heading;

            // 将视图的朝向转换为角度（0-360）
            let viewHeadingDeg = Cesium.Math.toDegrees(viewHeading);

            // 计算地图的北方向角度
            let northAngle = (360.0 - viewHeadingDeg) % 360.0;
            if (oldNorthAngle != northAngle) {
                that.trigger('northAngle', northAngle)
                oldNorthAngle = northAngle
            }
        });
    }
}