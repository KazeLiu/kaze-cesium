import CesiumInit from "./init.js";
import CesiumUtils from "./utils.js";
import CesiumGeometry from "./geometry.js";
import CesiumEvent from "./event.js"


export default class CesiumKaze extends mixinsCLass(CesiumInit, CesiumGeometry, CesiumUtils, CesiumEvent) {
    constructor(domId, option) {
        super(domId, option);
    }
}

function mixinsCLass(...mixins) {
    class MixinClass {
        constructor(domId, option) {
            let cesiumInit = new CesiumInit(domId, option)
            let viewer = cesiumInit.getViewer();
            copyProperties(this, cesiumInit);
            copyProperties(this, new CesiumGeometry(viewer));
            copyProperties(this, new CesiumUtils(viewer));
            copyProperties(this, new CesiumEvent(viewer));
        }
    }

    let proto = MixinClass.prototype;
    for (let mixin of mixins) {
        copyProperties(MixinClass, mixin); // 拷贝静态属性
        copyProperties(proto, mixin.prototype); // 拷贝原型属性
    }
    return MixinClass;
}

function copyProperties(target, source) {
    for (let key of Reflect.ownKeys(source)) {
        if (key !== 'constructor'
            && key !== 'prototype'
            && key !== 'name'
        ) {
            let desc = Object.getOwnPropertyDescriptor(source, key);
            Object.defineProperty(target, key, desc);
        }
    }
}
