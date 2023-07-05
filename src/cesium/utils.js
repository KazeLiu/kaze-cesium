// 基础计算方法放这里 比如坐标系转换 颜色转化 视角锁定解锁
import * as Cesium from "cesium";

export default class CesiumUtils {
    constructor(viewer) {
        this.viewer = viewer;
    }

    /**
     * 转化为地图用的颜色
     */
    colorToCesiumRGB(color, alpha) {
        let sColor = color.toLowerCase();
        //十六进制颜色值的正则表达式
        let reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
        let sColorChange = [];
        // 如果是16进制颜色
        if (sColor && reg.test(sColor)) {
            if (sColor.length === 4) {
                let sColorNew = "#";
                for (let i = 1; i < 4; i += 1) {
                    sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                }
                sColor = sColorNew;
            }
            //处理六位的颜色值
            for (let i = 1; i < 7; i += 2) {
                sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
            }
        } else {
            console.error('传入的颜色不是16进制颜色')
            return;
        }
        return new Cesium.Color(sColorChange[0] / 255, sColorChange[1] / 255, sColorChange[2] / 255, alpha)
    }

    /**
     * 取消视角锁定
     */
    unlockCamera() {
        this.viewer.trackedEntity = undefined;
        this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    }

    /**
     * 世界坐标系转经纬度
     */
    cartesian3ToDegree2(cartesian){
        const ellipsoid = this.viewer.scene.globe.ellipsoid;
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const altitude = cartographic.height;
        return {
            longitude,
            latitude,
            altitude
        };
    }
}
