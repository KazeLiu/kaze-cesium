import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";

// 事件监听的方法放这里
export default class CesiumEvent {
    _eventHandlers = {};
    _type = 3; // type代表地图上动态操作的类型，使用changeMouseEventType改变 0/null:默认，其他类型会让左键点击获取entity失效 1:点，2:线，3:面
    _showDistance = true; // 在线面的情况下  是否显示长度和周长与面积

    constructor(viewer) {
        this.geometry = new CesiumGeometry(viewer);
        this.utils = new CesiumUtils(viewer);
        this.event(new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas), viewer);
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

    changeMouseEventType(type) {
        if (type == 0) {
            type = null;
        }
        this._type = type
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
        // 这个是当前正在画的实体，是线面本身，因为它每次只会画一个，所以是对象。在右键后把数据传到addLine，addPolygon方法后删除
        let drewEntity = null;
        // 在线面类型表示弯折点，点类型表示List
        let markerList = [];

        /**
         * 停止画线面
         * @param saveEntity 是否保存实体 不保存实体约等于取消这次画图
         */
        function stopDrawing(saveEntity) {
            // 右键后返回的值 通过修改entity来调整实体的样式和数据
            // 点返回数组，线面返回对象
            let entityList = null;
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
                }
                that.trigger("draw", entityList, activeShapePoint);
            }
            activeShapePoint = [];
        }

        // 左键
        handler.setInputAction(evt => {
            const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene);
            if (!Cesium.defined(pick)) {
                return;
            }
            const position = this.utils.cartesian3ToDegree2(pick);

            if (!this._type) {
                // 返回点击的经纬度或者是entity点
                const entityId = pick?.id?.id;
                const entity = entityId ? this.geometry.getEntityById(entityId) : null;
                const info = {id: entityId, position, entity};
                this.trigger("handleClick", info);
            } else {
                markerList.push(viewer.entities.add({
                    position: pick, point: {
                        color: Cesium.Color.WHITE,
                        pixelSize: 10,
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
                    } else if (this._type === 3) {
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
            // 添加起始点和根据type添加动态点
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
                    activeEntity.label = new Cesium.LabelGraphics({
                        text: "请标记",
                        fillColor: Cesium.Color.WHITE,
                        showBackground: true,
                        backgroundColor: Cesium.Color.BLACK.withAlpha(0.75),
                        style: Cesium.LabelStyle.FILL,
                        pixelOffset: new Cesium.Cartesian2(0, 40),
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        font: '14px microsoft YaHei'
                    })
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
                        activeEntity.label.text = new Cesium.ConstantProperty(`${location.longitude.toFixed(6)},${location.latitude.toFixed(6)}`);
                        return;
                    }
                    let length = 0;
                    // 计算长度
                    for (let i = 1; i < activeShapePoint.length; i++) {
                        length += this.utils.computePointDistance(activeShapePoint[i], activeShapePoint[i - 1]);
                    }
                    if (this._type == 2) {
                        activeEntity.label.text = new Cesium.ConstantProperty(`共${length.toFixed(2)}米`);
                    }
                    // 面积计算未包含起伏山地的计算 只有投影大小
                    if (this._type == 3 && activeShapePoint.length > 2) {
                        let area = this.utils.computePolygonArea(activeShapePoint);
                        // 周长还需要添加一个末尾点到起始点的距离
                        length += this.utils.computePointDistance(activeShapePoint[activeShapePoint.length - 1], activeShapePoint[0]);
                        activeEntity.label.text = new Cesium.ConstantProperty(`周长${length.toFixed(2)}米，面积${area.toFixed(2)}平方米`);
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
}