// 基础计算方法放这里 比如坐标系转换 颜色转化 视角锁定解锁
import * as Cesium from "cesium";
import area from "@turf/area";

export default class CesiumUtils {
    constructor(viewer) {
        this.viewer = viewer;
    }

    /**
     * js生成uuid
     */
    generateUUID() {
        let d = new Date().getTime()
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (d + Math.random() * 16) % 16 | 0
            d = Math.floor(d / 16)
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
        })
        return uuid
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
     * 判断是不是世界坐标系 如果是世界坐标系直接返回，如果是经纬度就转化为世界坐标系返回，接受一个世界坐标系或者坐标系组
     */
    convertToCartesian(position) {
        if (Array.isArray(position)) {
            if (position[0] instanceof Cesium.Cartesian3) {
                // 数组里面第一个是Cartesian3对象，判定为整个数组都是Cartesian3，直接返回
                return position;
            } else if (Array.isArray(position[0])) {
                // [[xx, yy], [xx, yy]]
                // 循环position数组，将每个数组转换为世界坐标系
                return position.map(pos => {
                    if (pos instanceof Cesium.Cartesian3) {
                        return pos;
                    } else {
                        return Cesium.Cartesian3.fromDegrees(...pos);
                    }
                });
            } else {
                // [xx, yy]
                // 将数字转换为世界坐标系
                return Cesium.Cartesian3.fromDegrees(...position);
            }
        } else if (position instanceof Cesium.Cartesian3) {
            // 不是数组，直接判断是否是Cartesian3对象
            return position;
        } else {
            console.log(position + "，它不是地球坐标系，也不是经纬度的数组");
        }
    }

    /**
     * 世界坐标系转经纬度
     * 在Cesium中，Cesium.Cartographic.fromCartesian 方法只能使用 WGS84 椭球体 所以不用。
     */
    cartesian3ToDegree2(cartesian) {
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

    /**
     * 长度计算
     * @param point1
     * @param point2
     */
    computePointDistance(point1, point2) {
        return Cesium.Cartesian3.distance(this.convertToCartesian(point1), this.convertToCartesian(point2));
    }

    /**
     * 计算面积
     * @param polygonPointList
     */
    computePolygonArea(polygonPointList) {
        if (polygonPointList.length <= 2) {
            return 0
        }
        // 使用海伦公式 https://juejin.cn/post/7046566741438103583
        let array = []
        for (let i = 0, len = polygonPointList.length; i < len; i++) {
            let cartographic = this.cartesian3ToDegree2(polygonPointList[i])
            let longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
            let latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
            array.push({x: longitude, y: latitude})
        }

        let arrS = []
        let temS = []
        arrS.push(temS)
        for (let i = 0, len = array.length; i < len; i++) {
            temS.push([array[i].x, array[i].y])
        }
        let polygons = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: arrS
                    }
                },
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]]]
                    }
                }
            ]
        }
        return area(polygons)
    }
}
