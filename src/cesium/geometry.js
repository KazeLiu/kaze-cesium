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
     * 查找entity
     */
    getEntityById(id) {
        return this.viewer.entities.getById(id)
    }

    /**
     * 添加点
     */
    addMarker(marker = {}) {
        let info = Object.assign({
            scale: 0.1,
            hasLabel: true,
            hasMove: false,
            point: {
                show: false
            }
        }, marker);
        if (!info.iconImage) {
            console.error('iconImage为null')
            return
        }
        if (!info.position) {
            console.error('position为空')
            return
        }
        let entity = new Cesium.Entity({
            // http://cesium.xin/cesium/cn/Documentation1.72/Entity.html
            id: info.id,
            name: info.name,
            position: Cesium.Cartesian3.fromDegrees(...info.position),
            point: info.point,
            description: info.description,
            hasLabel: info.hasLabel,
            hasMove: info.hasMove,
            billboard: {
                image: info.iconImage,
                scale: info.scale,
                rotation: info.rotation,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
        });
        if (info.hasLabel) {
            entity.label = new Cesium.LabelGraphics({
                text: info.name.length > 8 ? info.name.slice(0, 8) + '...' : info.name,
                fillColor: Cesium.Color.WHITE,
                showBackground: true,
                backgroundColor: this.utils.colorToCesiumRGB('#000000', 0.5),
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineColor: Cesium.Color.RED,
                outlineWidth: 0,
                pixelOffset: new Cesium.Cartesian2(0, 40),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                font: '13px microsoft YaHei',
            })
        }
        this.addEntityToCollection(entity)
        this.utils.unlockCamera();
        return entity;
    }
}
