import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";
import * as turf from "@turf/turf";


// 事件监听的方法放这里
export default class CesiumEvent {
    _eventHandlers = {};
    // type代表地图上动态操作的类型，使用changeMouseEventType改变
    // 0|null:默认。其他类型会让左键点击获取entity失效 1:画点，2:画线，3:画面，4:面掏洞，5：移动图标
    static _type = null;
    _showDistance = true; // 在线面的情况下  是否显示长度和周长与面积
    _viewer = null;

    constructor(viewer) {
        this._viewer = viewer;
        this.geometry = new CesiumGeometry(viewer);
        this.utils = new CesiumUtils(viewer);
        this.event(new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas), viewer);
        this.haha();
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

    changeMouseEventType(type, showDistance = true) {
        if (type == 0) {
            type = null;
        }
        this._showDistance = showDistance
        this._type = type
    }

    haha() {
        document.addEventListener('click', () => {
            console.log(this)
        })
    }

    /**
     * 每个事件只能绑定一次Cesium.ScreenSpaceEventType，所以一般的处理方法就是在事件里面通过if判断来处理逻辑。
     * event准备使用方法内区分业务逻辑
     * @param handler
     * @param viewer
     */
    event(handler, viewer) {
        let that = this;
        // 这个是当前的经纬度列表，包含点线面Entity的经纬度点。点击右键的时候会通过监听geometryData方法返回
        let activeShapePoint = [];
        // 这个实体，是一个点，会随着鼠标移动而更改，每次右键后删除
        let activeEntity = null;
        // 这个是当前正在画的实体（type=1,2,3,4）或者是移动图标的图标信息（type=5），是线面本身，因为它每次只会画一个，所以是对象。在右键后把数据传到addLine，addPolygon方法后删除
        let drewEntity = null;
        // 在线面类型表示弯折点（type=1,2,3,4），点类型表示点列表（type=0|null）
        let markerList = [];
        // 当前正在画的实体的id，鼠标点一下，图形多一个点，这个index+1，用于后期按住alt+鼠标点击圆点时找到被选的正在画的实体的那个拐角坐标
        let drewMarkerIndex = 0;

        /**
         * 停止画线面
         * @param saveEntity 是否保存实体 不保存实体约等于取消这次画图
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
                                alert("洞相交，当前图形作废")
                                that.trigger('kazeError', "洞相交，当前图形作废")
                                return;
                            }
                            // 判定是否包含在这个entity内
                            let isOverlap = turf.booleanContains(turf.polygon([entityPositions]), turf.polygon([newHole]));
                            if (isOverlap) {
                                entityPositions.pop();
                                newHole.pop();
                                hierarchy.holes.push({positions: that.utils.convertToCartesian(newHole)});
                                entity.polygon.hierarchy = hierarchy
                            } else {
                                alert("父级未完全包含洞，当前图形作废")
                                that.trigger('kazeError', "父级未完全包含洞，当前图形作废")
                                return;
                            }
                        });
                    }
                }
                that.trigger("draw", entityList, activeShapePoint);
            }
            activeShapePoint = [];
        }

        // 左键
        handler.setInputAction(function (evt) {
            if (!that._type) {
                // 返回点击的经纬度或者是entity点
                const pick = viewer.scene.pick(evt.position)
                const position = this.utils.cartesian3ToDegree2(pick);
                const entityId = pick?.id?.id;
                const entity = entityId ? this.geometry.getEntityById(entityId) : null;
                const info = {id: entityId, position, entity};
                this.trigger("handleClick", info);
            } else {
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
                    if (this._type === 2) {
                        shapeEntityOptions = {
                            polyline: {
                                positions: new Cesium.CallbackProperty(() => activeShapePoint, false),
                                clampToGround: true,
                                width: 3,
                            }
                        };
                    } else if (this._type === 3 || this._type === 4) {
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
            if (this._type == null) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene);
                const position = this.utils.cartesian3ToDegree2(pick);
                let info = {
                    position, id: pick?.id?.id
                }
                this.trigger("contextMenu", info);
            } else {
                stopDrawing(true);
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        // 移动
        handler.setInputAction(evt => {
            const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.endPosition), viewer.scene);
            if (this._type == 1 || this._type == 2 || this._type == 3 || this._type == 4) {
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

                    if (this._showDistance) {
                        this.geometry.markerAddLabel(activeEntity, "请标记")
                    }
                    activeShapePoint.push(pick);
                } else if (Cesium.defined(pick) && activeShapePoint.length > 0) {
                    activeEntity.position.setValue(pick)
                    activeShapePoint.pop();
                    activeShapePoint.push(pick);
                    // 线条计算长度 多边形计算长度面积
                    if (this._showDistance) {
                        if (this._type == 1) {
                            let location = this.utils.cartesian3ToDegree2(pick);
                            this.geometry.markerAddLabel(activeEntity, `${location.longitude.toFixed(6)},${location.latitude.toFixed(6)}`)
                            return;
                        }
                        let length = 0;
                        // 计算长度
                        for (let i = 1; i < activeShapePoint.length; i++) {
                            length += this.utils.computePointDistance(activeShapePoint[i], activeShapePoint[i - 1]);
                        }
                        if (this._type == 2) {
                            this.geometry.markerAddLabel(activeEntity, `共${length.toFixed(2)}米`)
                        }
                        // 面积计算未包含起伏山地的计算 只有投影大小
                        if ((this._type == 3 || this._type == 4) && activeShapePoint.length > 2) {
                            let area = this.utils.computePolygonArea(activeShapePoint.map(x => that.utils.cartesian3ToDegree2(x, 1)));
                            // 周长还需要添加一个末尾点到起始点的距离
                            length += this.utils.computePointDistance(activeShapePoint[activeShapePoint.length - 1], activeShapePoint[0]);
                            this.geometry.markerAddLabel(activeEntity, `周长${length.toFixed(2)}米，面积${area.toFixed(2)}平方米`)
                        }
                    }
                }
            } else if (this._type == 5) {
                //拖拽已有的entity
                if (Cesium.defined(activeEntity)) {
                    activeEntity.position.setValue(pick);
                }
            }

        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // 鼠标按下
        handler.setInputAction(evt => {
            const pick = viewer.scene.pick(evt.position)
            if (this._type == 5 && Cesium.defined(pick?.id)) {
                that.utils.lockCamera()
                activeEntity = pick?.id;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        // 鼠标抬起
        handler.setInputAction(evt => {
            if (this._type == 5 && Cesium.defined(activeEntity)) {
                activeEntity = null;
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
                        let location = this.utils.cartesian3ToDegree2(movePick);
                        this.geometry.markerAddLabel(markerList[index], `${location.longitude.toFixed(6)},${location.latitude.toFixed(6)}`)
                    }
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.ALT)
                handler.setInputAction(evt => {
                    markerList[index].label = undefined;
                    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE, Cesium.KeyboardEventModifier.ALT);
                    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.ALT);
                }, Cesium.ScreenSpaceEventType.LEFT_UP, Cesium.KeyboardEventModifier.ALT)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.ALT)


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
}