import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";

// 事件监听的方法放这里
export default class CesiumEvent {
    _eventHandlers = {};
    _type = 1; // type代表地图上动态操作的类型，使用changeMouseEventType改变 0/null:默认，其他类型会让左键点击获取entity失效 1:点，2:线，3:面

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
        // 这个实体，是一个点，会随着鼠标移动而更改，在右键后删除
        let activeEntity = null;
        // 这个是当前正在画的实体，是线面本身，因为它每次只会画一个，所以是对象。在右键后把数据传到addLine，addPolygon方法后删除
        let drewEntity = null;
        // 画点专用，因为标点是添加多个实体，所以画点用markerList。 在右键后把数据传到addMarker方法后删除
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
            if (saveEntity) {
                activeShapePoint.pop();
                if (that._type == 1) {
                    entityList = [];
                    activeShapePoint.forEach(x => {
                        entityList.push(that.geometry.addMarker({
                            position: x
                        }));
                    })
                    markerList.map(x => {
                        viewer.entities.remove(x);
                    })
                    markerList = [];
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
                // 添加起始点和根据type添加动态点
                if (!activeEntity) {
                    activeEntity = viewer.entities.add({
                        position: pick,
                        point: {
                            color: Cesium.Color.WHITE,
                            pixelSize: 5,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        },
                    });
                    activeShapePoint.push(pick);
                }

                // 画点
                if (this._type === 1) {
                    activeEntity = viewer.entities.add({
                        position: pick,
                        point: {
                            color: Cesium.Color.WHITE,
                            pixelSize: 10,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        },
                    });
                    markerList.push(viewer.entities.add({
                        position: pick,
                        point: {
                            color: Cesium.Color.WHITE,
                            pixelSize: 10,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        },
                    }));
                }

                // 画线面
                if (!drewEntity) {
                    let shapeEntityOptions;
                    if (this._type === 2) {
                        shapeEntityOptions = {
                            polyline: {
                                positions: new Cesium.CallbackProperty(() => activeShapePoint, false),
                                clampToGround: true,
                                width: 3,
                            },
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
                    position,
                    id: pick?.id?.id
                }
                this.trigger("contextMenu", info);
            } else {
                stopDrawing(true);
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        // 移动
        handler.setInputAction(evt => {
            if (Cesium.defined(activeEntity)) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.endPosition), viewer.scene);
                if (Cesium.defined(pick) && activeShapePoint.length > 0) {
                    activeEntity.position.setValue(pick)
                    activeShapePoint.pop();
                    activeShapePoint.push(pick);
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
}