import CesiumInit from "./init.js";
import CesiumUtils from "./utils.js";
import CesiumGeometry from "./geometry.js";
import CesiumEvent from "./event.js"
import * as Cesium from "cesium";


/**
 * 配置总览：
 * 初始化的option是cesium的内容，包含Cesium.Viewer的全部设置项目，详见 https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html#.ConstructorOptions
 */

export default class CesiumKaze {
    static cesium = Cesium;

    async init(domId, option, isOffline) {
        let init = new CesiumInit(domId, option, isOffline);
        await init.init();
        let utils = new CesiumUtils(init.getViewer());
        let geometry = new CesiumGeometry(init.getViewer());
        let event = new CesiumEvent(init.getViewer());
        const mergedClass = new Proxy({}, {
            get(target, prop) {
                const classes = [init, utils, geometry, event];
                for (const cls of classes) {
                    if (prop in cls) {
                        if (typeof cls[prop] === 'function') {
                            return cls[prop].bind(cls)
                        }
                    }
                }
            }
        });
        return mergedClass;
    }

}