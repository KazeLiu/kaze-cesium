import * as Cesium from "cesium";
import CesiumGeometry from "./geometry.js";
import CesiumUtils from "./utils.js";


// 事件监听的方法放这里
export default class CesiumEvent{
    _eventHandlers = {};
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

    event(handler, viewer) {
        handler.setInputAction(evt => {
            //设置监听方法
            let scene = viewer.scene;
            let pick = scene.pick(evt.position);
            let cartesian = evt.position;
            let info = {
                position: cartesian,
                id: pick?.id?.id
            }
            this.trigger("contextMenu", info);
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        handler.setInputAction(evt => {
            //设置监听方法
            let pick = viewer.scene.pick(evt.position);
            let position = this.utils.cartesian3ToDegree2(evt.position);
            let entity = null;
            if (pick?.id?.id) {
                entity = this.geometry.getEntityById(pick?.id?.id)
            }
            let info = {id: pick?.id?.id, position: position, entity};
            this.trigger("handleClick", info);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
}