// 创建点线面等几何方法放这里
import * as Cesium from "cesium";
import CesiumUtils from "./utils.js";

export default class CesiumGeometry {

    constructor(viewer) {
        this.utils = new CesiumUtils(viewer);
        this.viewer = viewer;

    }

    /**
     * 添加entity到collection
     * @param collectionName 类名称 默认defaultCollection
     * @param entity 点
     */
    addEntityToCollection(entity, collectionName = 'defaultCollection') {
        let find = this.viewer.dataSources.getByName(collectionName)
        if (find && find.length > 0) {
            find[0].entities.add(entity);
        }
    }

    /**
     * 按组别批量显示隐藏entity（按组名称）
     * @param type false 隐藏  true 显示
     * @param collectionName 组名
     */
    changeCollectionShowAndHide(show, collectionName = 'defaultCollection') {
        let list = this.viewer.dataSources.getByName(collectionName)
        if (list && list.length > 0) {
            list[0].show = show;
        }
    }

    /**
     * 根据查找entity
     */
    getEntityById(id) {
        return this.viewer.entities.getById(id)
    }

    /**
     * 添加点
     * @param marker
     * @param collectionName
     * @returns {module:cesium.Entity}
     */
    addMarker(marker = {}, collectionName) {

        // 添加海量点技术储备 https://www.cnblogs.com/onsummer/p/14059204.html
        // let billboards = cesium.getViewer().scene.primitives.add(
        //     new Cesium.BillboardCollection()
        // );
        //
        // for (let i = 0; i < 100000; i++) {
        //     // 生成随机经纬度
        //     let longitude = Math.random() * (135.0417 - 73.5577) + 73.5577;
        //     let latitude = Math.random() * (53.5608 - 18.1566) + 18.1566;
        //     billboards.add({
        //         position: new Cesium.Cartesian3.fromDegrees(longitude, latitude, 10.0),
        //         image: '/public/logo.jpg',
        //         scale:0.3
        //     });
        // }


        const id = this.utils.generateUUID();
        let info = Object.assign({
            scale: 0.1,
            id: id,
            name: id,
            hasLabel: true,
            hasMove: false,
            point: {
                show: false
            }
        }, marker);

        let entity = new Cesium.Entity({
            // http://cesium.xin/cesium/cn/Documentation1.72/Entity.html
            id: info.id,
            name: info.name,
            position: this.utils.convertToCartesian3(info.position),
            point: info.point,
            description: info.description,
            hasLabel: info.hasLabel,
            hasMove: info.hasMove,

        });
        if (info.iconImage) {
            entity.billboard = new Cesium.BillboardGraphics({
                image: info.iconImage,
                scale: info.scale,
                rotation: info.rotation,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            })
        } else {
            entity.point = new Cesium.PointGraphics({
                color: Cesium.Color.WHITE,
                pixelSize: 20,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            })
        }
        if (info.hasLabel) {
            this.markerAddLabel(entity, info.name)
        }
        this.addEntityToCollection(entity, collectionName)
        this.utils.unlockCamera();
        return entity;
    }

    /**
     * 点添加文字 如果本来有文字则修改 否则添加
     * @param entity
     * @param text
     * @param force 是否强制初始化
     */
    markerAddLabel(entity, text, force = false) {
        if (entity.label && entity.label instanceof Cesium.LabelGraphics && !force) {
            entity.label.text = new Cesium.ConstantProperty(text);
        } else {
            entity.label = new Cesium.LabelGraphics({
                text: text,
                fillColor: Cesium.Color.WHITE,
                showBackground: true,
                backgroundColor: this.utils.colorToCesiumRGB('#000000', 0.5),
                style: Cesium.LabelStyle.FILL,
                pixelOffset: new Cesium.Cartesian2(0, 40),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                font: '14px microsoft YaHei',
            })
        }
    }

    /**
     * 添加线
     * @param polyline
     * @param collectionName
     */
    addLine(polyline = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            name: id,
            text: id,
            id: id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
        }, polyline);

        let line = new Cesium.Entity({
            id: info.id,
            name: info.name,
            polyline: {
                clampToGround: true,
                positions: this.utils.convertToCartesian3(info.positions),
                width: 3,
                material: info.material,
            },
        });
        this.addEntityToCollection(line, collectionName)
        return line;
    }

    /**
     * 添加面
     * @param polyline
     * @param collectionName
     */
    addPolygon(polyline = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            name: id,
            text: id,
            id: id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
        }, polyline);

        let polygon = new Cesium.Entity({
            id: info.id,
            name: info.name,
            polygon: {
                clampToGround: true,
                hierarchy: new Cesium.PolygonHierarchy(this.utils.convertToCartesian3(info.positions)),
                width: 3,
                material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            },
        });
        this.addEntityToCollection(polygon, collectionName)
        return polygon
    }

    /**
     * 历史轨迹
     * @param marker
     * @param timeAndPosition [{time:'2023-01-01 12:00:00',position:[122.4882,23.9999]},{time:'2023-01-02 12:00:00',position:[126.1321,39.2452]}]
     */
    historyLine(marker, timeAndPosition, isAvailability) {
        let positionProperty = new Cesium.SampledPositionProperty();
        for (let i = 0; i < timeAndPosition.length; i++) {
            positionProperty.addSample(Cesium.JulianDate.fromDate(new Date(timeAndPosition[i].time)),
                this.utils.convertToCartesian3(timeAndPosition[i].position));
        }
        marker.position = positionProperty;
        marker.polyline = new Cesium.PolylineGraphics({
            material: this.utils.colorToCesiumRGB('#4B8BF4', 1),
            width: 2,
            clampToGround: true,
            positions: timeAndPosition.map(x => this.utils.convertToCartesian3(x.position))
        });
        // 时间范围之外 不显示点和线  取消该代码也只能保持显示线不能显示点
        let availability = new Cesium.TimeIntervalCollection();
        availability.addInterval(
            new Cesium.TimeInterval({
                start: Cesium.JulianDate.fromDate(new Date(timeAndPosition[0].time)),
                stop: Cesium.JulianDate.fromDate(new Date(timeAndPosition[timeAndPosition.length - 1].time)),
            })
        );
        marker.availability = availability;

        marker.orientation = new Cesium.VelocityOrientationProperty(positionProperty);

    }
}
