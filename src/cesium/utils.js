// 基础计算方法放这里 比如坐标系转换 颜色转化 视角锁定解锁
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

export default class CesiumUtils {
    constructor(viewer) {
        this.viewer = viewer;
    }

    /**
     * js生成uuid
     */
    generateUUID() {
        const d = new Date().getTime();
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (d + ((Math.random() * 16) >> 0)) % 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    /**
     * 取消视角锁定
     */
    unlockCamera() {
        const cameraController = this.viewer.scene.screenSpaceCameraController;
        this.setCameraLockStatus(cameraController, true);
    }

    /**
     * 取消视角锁定
     */
    lockCamera() {
        const cameraController = this.viewer.scene.screenSpaceCameraController;
        this.setCameraLockStatus(cameraController, false);
    }

    /**
     * 视角类统一管理
     * @param cameraController
     * @param lock
     */
    setCameraLockStatus(cameraController, lock) {
        const properties = ['enableRotate', 'enableTranslate', 'enableZoom', 'enableTilt', 'enableLook'];
        for (const property of properties) {
            cameraController[property] = lock;
        }
    }

    /**
     * 判断是不是世界坐标系 如果是世界坐标系直接返回，如果是经纬度就转化为世界坐标系返回，接受一个世界坐标系或者坐标系组
     */
    convertToCartesian3(position) {
        if (Array.isArray(position)) {
            if (position[0] instanceof Cesium.Cartesian3) {
                // 数组里面第一个是Cartesian3对象，判定为整个数组都是Cartesian3，直接返回
                return position;
            } else if (Array.isArray(position[0])) {
                // [[xx, yy], [xx, yy]]
                return position.map(pos => this.convertToCartesian3(pos));
            } else {
                // [xx, yy]
                return Cesium.Cartesian3.fromDegrees(...position);
                // return this.convertToCartesian3Single(position);
            }
        } else if (position instanceof Cesium.Cartesian3) {
            // 不是数组，直接判断是否是Cartesian3对象
            return position;
        } else {
            throw new Error(position + "，它不是地球坐标系，也不是经纬度的数组");
        }
    }

    /**
     * 世界坐标系转经纬度
     * 在Cesium中，Cesium.Cartographic.fromCartesian 方法只能使用 WGS84 椭球体 所以不用。
     * type 0:返回对象 {
     *                 longitude,
     *                 latitude,
     *                 altitude
     *             }
     *      1:返回没有高度的数组 [longitude, latitude]
     */
    cartesian3ToDegree2(cartesian, type = 0) {
        if (!cartesian) {
            return null;
        }
        const ellipsoid = this.viewer.scene.globe.ellipsoid;
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const altitude = cartographic.height;
        if (type == 0) {
            return {
                longitude,
                latitude,
                altitude
            };
        }
        if (type == 1) {
            return [longitude, latitude]
        }
    }

    /**
     * 长度计算 带地形
     * @param point1 世界坐标系
     * @param point2 世界坐标系
     */
    computePointDistanceWithTerrain(point1, point2) {
        return Cesium.Cartesian3.distance(this.convertToCartesian3(point1), this.convertToCartesian3(point2));
    }

    /**
     * 长度计算 不带地形
     * @param point1 经纬度 [longitude1, latitude1]
     * @param point2 经纬度 [longitude2, latitude2]
     */
    computePointDistance(point1, point2) {
        if (point1 && point2) {
            return turf.distance(point1, point2, {units: 'meters'});
        }
        return 0
    }

    /**
     * 计算面积
     * @param polygonPointList 经纬度
     */
    computePolygonArea(polygonPointList) {
        if (polygonPointList[0] != polygonPointList[polygonPointList.length - 1]) {
            polygonPointList.push(polygonPointList[0])
        }
        if (polygonPointList.length <= 2) {
            return 0
        }
        // 使用海伦公式 https://juejin.cn/post/7046566741438103583
        let polygon = turf.polygon([polygonPointList]);

        // 计算多边形的面积（单位为平方米）
        return turf.area(polygon)
    }

    /**
     * 标准时间转换为天文儒略日期
     * @param date
     * @returns {JulianDate}
     */
    iSODateToJulianDate(date) {
        return Cesium.JulianDate.fromDate(date);
    }

    /**
     * 天文儒略日期转换为标准时间
     * @param julianDate
     * @returns {Date}
     */
    julianDateToISODate(julianDate) {
        return new Date(julianDate.toString())
    }

    /**
     * 设置当前时间
     * @param timestamp 当前时间时间戳
     */
    changeTimeLine(timestamp) {
        let julianDate = this.iSODateToJulianDate(new Date(timestamp));
        this.viewer.clock.currentTime = julianDate;
    }

    /**
     * 在3D模式下回到正北
     */
    toN() {
        this.viewer.camera.flyTo({
            duration: 1,
            destination: this.viewer.camera.positionWC
        })
    }

    /**
     * 在3D模式下返回屏幕可视经纬度
     * @returns {{southwest: {lng: number, lat: number}, northeast: {lng: number, lat: number}}}
     */
    getBounds() {
        let viewer = this.viewer;
        let rectangle = viewer.camera.computeViewRectangle();
        let west = rectangle.west / Math.PI * 180;
        let north = rectangle.north / Math.PI * 180;
        let east = rectangle.east / Math.PI * 180;
        let south = rectangle.south / Math.PI * 180;
        let bounds = {
            southwest: {
                lng: west,
                lat: south
            },
            northeast: {
                lng: east,
                lat: north
            }
        };
        return bounds;
    }

    /**
     * 获取屏幕中心点经纬度数组
     * @returns {number[]}
     */
    getCenterPoint() {
        let viewer = this.viewer;
        const center = viewer.camera.positionWC; // 获取相机位置（笛卡尔坐标）
        const ellipsoid = viewer.scene.globe.ellipsoid;
        const cartographic = ellipsoid.cartesianToCartographic(center); // 将相机位置转换为经纬度坐标
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        return [longitude, latitude]
    }

    /**
     * 通过id获取entity
     * @param id
     * @returns {Entity}
     */
    getEntityById(id) {
        let viewer = this.viewer;
        return viewer.entities.getById(id);
    }

    /**
     * 将颜色和透明度转化为cesium使用的颜色
     * @param color
     * @param alpha
     * @returns {module:cesium.Color}
     */
    colorToCesiumRGB(color, alpha) {
        const sColor = color.toLowerCase();
        const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;

        if (!reg.test(sColor)) {
            throw new Error('传入的颜色不是16进制颜色');
        }

        let sColorNew = sColor.length === 4 ? `#${sColor[1]}${sColor[1]}${sColor[2]}${sColor[2]}${sColor[3]}${sColor[3]}` : sColor;
        const sColorChange = Array.from(sColorNew.slice(1), (c, i) => parseInt(sColorNew.substr(i * 2, 2), 16));

        return new Cesium.Color(
            sColorChange[0] / 255,
            sColorChange[1] / 255,
            sColorChange[2] / 255,
            alpha
        );
    }
}
