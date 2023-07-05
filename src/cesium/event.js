import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";


// 事件监听的方法放这里
export default class CesiumEvent {
    _eventHandlers = {};
    _type = 2; // type代表地图上动态操作的类型，使用changeMouseEventType改变 0/null:默认，其他类型会让左键点击获取entity失效 1:点，2:线，3:面

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
     * event准备使用方法内全局枚举的方式区分业务逻辑
     * @param handler
     * @param viewer
     */
    event(handler, viewer) {
        let activeShapeEntity = []; // 这个是当前的数据，包含点线面Entity本身 点击右键的时候会通过geometryData方法返回
        let activeShapePoint = []// 这个是当前的数据，包含点线面Entity的经纬度点 点击右键的时候会通过geometryData方法返回
        handler.setInputAction(evt => {
            if (this._type != null) {
                const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene);
                const position = this.utils.cartesian3ToDegree2(pick);
                let info = {
                    position,
                    id: pick?.id?.id
                }
                this.trigger("contextMenu", info);
            } else {
                this.trigger("geometryData", {
                    activeShapePoints: activeShapeEntity
                });
                activeShapeEntity = [];
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        handler.setInputAction(evt => {
            const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene);
            const position = this.utils.cartesian3ToDegree2(pick);
            if (this._type == 1) {
                const point = viewer.entities.add({
                    position: pick,
                    point: {
                        color: Cesium.Color.WHITE,
                        pixelSize: 5,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    },
                });
                activeShapeEntity.push(point)
            } else if (this._type == 2) {
                const line = viewer.entities.add({
                    polyline: {
                        positions: new Cesium.CallbackProperty(function () {
                            return activeShapeEntity;
                        }, false),
                        clampToGround: true,
                        width: 3,
                    },
                });
                activeShapeEntity.push(line)
            } else {
                // 这一段是返回点击的经纬度或者是entity点
                const entityId = pick?.id?.id;
                const entity = entityId ? this.geometry.getEntityById(entityId) : null;
                const info = {id: entityId, position, entity};
                this.trigger("handleClick", info);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction(evt => {
            const pick = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.endPosition), viewer.scene);
            if (this._type == 2 && activeShapeEntity.length > 0) {
                debugger
                // activeShapePoints[0].setValue(pick)
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
}