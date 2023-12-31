// 基础计算方法放这里 比如坐标系转换 颜色转化 视角锁定解锁
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

export default class CesiumUtils {
    _debug = false;

    constructor(viewer, isDebugger) {
        this.viewer = viewer;
        // 是否为debugger模式
        this._debug = isDebugger;
    }

    /**
     * 控制台输出内容
     * @param type 2 warn 3 error ||  warn error || other => log
     * @param data
     */
    kazeConsole(data, type) {
        if (type == 2 || type == 'warn') {
            console.warn(new Date(), data)
        }
        if (type == 3 || type == 'error') {
            console.error(new Date(), data)
        } else {
            console.log(new Date(), data)
        }
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
     * 这个是把经纬度转换为世界坐标系，不是初始化一个Cartesian3值，初始化需要使用`new cesiumKaze.cesium.Cartesian3(x,y,z)`
     */
    convertToCartesian3(position) {
        if (Array.isArray(position)) {
            if (position[0] instanceof Cesium.Cartesian3) {
                // 数组里面第一个是Cartesian3对象，判定为整个数组都是Cartesian3，直接返回
                return position;
            } else if (Array.isArray(position[0])) {
                // [[xx, yy, zz], [xx, yy, zz]]
                return position.map(pos => this.convertToCartesian3(pos));
            } else {
                // [xx, yy, zz]
                return Cesium.Cartesian3.fromDegrees(...position);
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
     *      1:返回没有高度的数字数组 [longitude, latitude]
     *      2:返回没有高度的六位字符数组 [longitude, latitude]
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
                longitude: longitude,
                latitude: latitude,
                altitude: altitude
            };
        }
        if (type == 1) {
            return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))]
        }
        if (type == 2) {
            return [longitude.toFixed(6), latitude.toFixed(6)]
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
            if (point1 instanceof Cesium.Cartesian3) {
                point1 = this.cartesian3ToDegree2(point1, 1)
            }
            if (point2 instanceof Cesium.Cartesian3) {
                point2 = this.cartesian3ToDegree2(point2, 1)
            }
            return turf.distance(point1, point2, {units: 'meters'});
        }
        return 0
    }

    /**
     * 两点间中心点 不带地形
     * @param point1 经纬度 [longitude1, latitude1]
     * @param point2 经纬度 [longitude2, latitude2]
     */
    computeMidPoint(point1, point2) {
        if (point1 && point2) {
            if (point1 instanceof Cesium.Cartesian3) {
                point1 = this.cartesian3ToDegree2(point1, 1)
            }
            if (point2 instanceof Cesium.Cartesian3) {
                point2 = this.cartesian3ToDegree2(point2, 1)
            }
            return turf.midpoint(point1, point2);
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
    jsDateToJulianDate(date) {
        return Cesium.JulianDate.fromDate(new Date(date));
    }

    /**
     * 天文儒略日期转换为标准时间
     * @param julianDate
     * @returns {Date}
     */
    julianDateToJsDate(julianDate) {
        return new Date(julianDate.toString())
    }

    /**
     * 设置当前时间
     * @param timestamp 当前时间时间戳
     */
    changeCurrentTime(timestamp) {
        this.viewer.clock.currentTime = this.jsDateToJulianDate(timestamp);
    }


    /**
     * 设置时钟控制器的选项
     * @param {Object} option - 时钟控制器的选项对象
     * @param {boolean} option.shouldAnimate - 设置步长
     * @param {'CLAMPED'|'LOOP_STOP'} option.clockRange -  时间轴循环模式 ("CLAMPED" 或 "LOOP_STOP")
     * @param {Number} option.multiplier - 时间流逝速度
     * @param {string} option.startTime - 时间轴开始时间
     * @param {string} option.stopTime - 结束时间
     * @returns {Cesium.Clock} - 更新后的时钟对象 时间轴也会修改为时间起止点
     */
    setClockController(option) {
        let clock = this.viewer.clock;
        let timeline = this.viewer.timeline;
        if (option.shouldAnimate) {
            clock.shouldAnimate = option.shouldAnimate;
        }
        if (option.clockRange) {
            // 时间轴内播放一次就停止或循环播放
            clock.clockRange = option.clockRange == "CLAMPED" ? Cesium.ClockRange.CLAMPED : Cesium.ClockRange.LOOP_STOP;
        }
        if (option.multiplier) {
            clock.multiplier = option.multiplier
        }
        if (option.startTime) {
            clock.startTime = this.jsDateToJulianDate(option.startTime);
        }
        if (option.stopTime) {
            clock.stopTime = this.jsDateToJulianDate(option.stopTime);
        }
        timeline.zoomTo(clock.startTime, clock.stopTime)
        return clock;
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
     * 返回屏幕可视经纬度
     * @returns {{southwest: {lng: number, lat: number}, northeast: {lng: number, lat: number}}}
     */
    getBounds() {
        let viewer = this.viewer;
        let rectangle = viewer.camera.computeViewRectangle();
        if (typeof rectangle === "undefined") {
            //2D下会可能拾取不到坐标，extend返回undefined,所以做以下转换
            let canvas = viewer.scene.canvas;
            let upperLeft = new Cesium.Cartesian2(0, 0);//canvas左上角坐标转2d坐标
            let lowerRight = new Cesium.Cartesian2(
                canvas.clientWidth,
                canvas.clientHeight
            );//canvas右下角坐标转2d坐标

            let ellipsoid = viewer.scene.globe.ellipsoid;
            let upperLeft3 = viewer.camera.pickEllipsoid(
                upperLeft,
                ellipsoid
            );//2D转3D世界坐标

            let lowerRight3 = viewer.camera.pickEllipsoid(
                lowerRight,
                ellipsoid
            );//2D转3D世界坐标

            let upperLeftCartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(
                upperLeft3
            );//3D世界坐标转弧度
            let lowerRightCartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(
                lowerRight3
            );//3D世界坐标转弧度

            let west = Cesium.Math.toDegrees(upperLeftCartographic.longitude);//弧度转经纬度
            let east = Cesium.Math.toDegrees(lowerRightCartographic.longitude);//弧度转经纬度

            let south = Cesium.Math.toDegrees(lowerRightCartographic.latitude);//弧度转经纬度
            let north = Cesium.Math.toDegrees(upperLeftCartographic.latitude);//弧度转经纬度

            return {
                southwest: {
                    lng: west,
                    lat: south
                },
                northeast: {
                    lng: east,
                    lat: north
                }
            };
        } else {
            // 获取经纬度
            let west = rectangle.west / Math.PI * 180;
            let north = rectangle.north / Math.PI * 180;
            let east = rectangle.east / Math.PI * 180;
            let south = rectangle.south / Math.PI * 180;
            return {
                southwest: {
                    lng: west,
                    lat: south
                },
                northeast: {
                    lng: east,
                    lat: north
                }
            };
        }
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
     * 将颜色和透明度转化为cesium使用的颜色
     * @param hexColor
     * @param alpha
     * @returns {module:cesium.Color}
     */
    colorToCesiumRGB(hexColor, alpha) {
        const reg = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

        if (!reg.test(hexColor)) {
            throw new Error('Invalid hexadecimal color format');
        }

        const normalizedHexColor = hexColor.length === 4 ?
            `#${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}` :
            hexColor;

        const red = parseInt(normalizedHexColor.slice(1, 3), 16);
        const green = parseInt(normalizedHexColor.slice(3, 5), 16);
        const blue = parseInt(normalizedHexColor.slice(5, 7), 16);

        return new Cesium.Color(
            red / 255,
            green / 255,
            blue / 255,
            alpha
        );
    }

    /**
     * 视角聚焦到经纬度
     * @param lng 经度
     * @param lat 纬度
     * @param height 高度 默认50000
     */
    cameraFly(lng, lat, height = 50000) {
        this.viewer.camera.flyTo({
            duration: 1,
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, height)
        })
    }

    /**
     * 从指定的地理坐标范围飞行至相机视角。
     *
     * @param {number} west - 范围的西经度。
     * @param {number} south - 范围的南纬度。
     * @param {number} east - 范围的东经度。
     * @param {number} north - 范围的北纬度。
     * @param {number} [height=50000] - 飞行的高度（可选，默认为 50000）。
     * @returns {void}
     * @throws {Error} 如果参数无效或飞行操作失败，将抛出错误。
     * @example
     * cameraFlyFromDegrees(10, 20, 30, 40); // 从 (10, 20) 到 (30, 40) 的地理范围飞行至相机视角。
     * 以getBounds()获取的数据为例，northEast中lng是east，lat是north。 southwest中lng是west，lat是south。
     */
    cameraFlyFromDegrees(west, south, east, north, height = 50000) {
        this.viewer.camera.flyTo({
            duration: 1,
            destination: Cesium.Rectangle.fromDegrees(west, south, east, north)
        })
    }


    /**
     * 控制摄像机高度
     * @param height
     */
    cameraFlyHeight(height) {
        // 获取当前摄像机位置的笛卡尔坐标
        let cameraPosition = this.viewer.camera.position;
        // 将笛卡尔坐标转换为地理坐标
        let cameraCartographic = Cesium.Cartographic.fromCartesian(cameraPosition);
        // 设置新的高度
        cameraCartographic.height = height;
        // 将地理坐标转换回笛卡尔坐标
        let newCameraPosition = this.viewer.scene.globe.ellipsoid.cartographicToCartesian(cameraCartographic);
        // 更新摄像机位置
        this.viewer.camera.position = newCameraPosition;
    }

    /**
     * 回到起始点
     * @param duration 飞行时间 秒
     */
    cameraToHome(duration) {
        this.viewer.camera.flyHome(duration)
    }

    /**
     * 世界坐标转屏幕坐标
     * @param scene
     * @param cartesian3
     * @returns {}
     */
    wgs84ToWindowCoordinates(scene, cartesian3) {
        return Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, cartesian3);
    }


    /**
     * 转换时间
     * @param datetime
     * @param viewModel
     * @param ignoreDate
     * @returns {string}
     * @constructor
     */
    static DateTimeFormatter(datetime, viewModel, ignoreDate) {
        let julianDT = new Cesium.JulianDate()
        Cesium.JulianDate.addHours(datetime, 8, julianDT)
        let gregorianDT = Cesium.JulianDate.toGregorianDate(julianDT)
        let objDT
        if (ignoreDate)
            objDT = ''
        else {
            objDT = new Date(gregorianDT.year, gregorianDT.month - 1, gregorianDT.day)
            objDT = gregorianDT.year + '年' + objDT.toLocaleString('zh-cn', {month: 'short'}) + gregorianDT.day + '日'
            if (viewModel || gregorianDT.hour + gregorianDT.minute === 0)
                return objDT
            objDT += ' '
        }
        return objDT + `${gregorianDT.hour < 10 ? `0${gregorianDT.hour}` : gregorianDT.hour}:${gregorianDT.minute < 10 ? `0${gregorianDT.minute}` : gregorianDT.minute}:${gregorianDT.second < 10 ? `0${gregorianDT.second}` : gregorianDT.second}`
    }

    static TimeFormatter(time, viewModel) {
        return CesiumUtils.DateTimeFormatter(time, viewModel, true)
    }

    /**
     * 计算任意角度下的经纬度
     * @param centerLongitude
     * @param centerLatitude
     * @param radius
     * @param angle
     * @returns {{latitude: *, longitude: *}}
     */
    calculateCoordinates(centerLongitude, centerLatitude, radius, angle) {
        // 将角度从度转换为弧度
        angle = angle * (Math.PI / 180);
        // 计算新的经度
        let newLongitude = centerLongitude + (radius / 111.32) * Math.cos(angle);

        // 计算新的纬度
        let newLatitude = centerLatitude + (radius / 111.32) * Math.sin(angle);

        return {
            longitude: newLongitude,
            latitude: newLatitude,
        };
    }
}
