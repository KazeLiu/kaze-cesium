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
            position: this.utils.convertToCartesian(info.position),
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
            entity.label = new Cesium.LabelGraphics({
                text: info.name,
                fillColor: Cesium.Color.WHITE,
                showBackground: true,
                backgroundColor: this.utils.colorToCesiumRGB('#000000', 0.5),
                style: Cesium.LabelStyle.FILL,
                pixelOffset: new Cesium.Cartesian2(0, 40),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                font: '13px microsoft YaHei',
            })
        }
        this.addEntityToCollection(entity, collectionName)
        this.utils.unlockCamera();
        return entity;
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
                positions: this.utils.convertToCartesian(info.positions),
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
                hierarchy: new Cesium.PolygonHierarchy(this.utils.convertToCartesian(info.positions)),
                width: 3,
                material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            },
        });
        this.addEntityToCollection(polygon, collectionName)
        return polygon
    }
}
