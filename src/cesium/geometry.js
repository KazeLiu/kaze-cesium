// 创建点线面等几何方法放这里
import * as Cesium from "cesium";
import CesiumUtils from "./utils.js";
import {CesiumHeatmap} from "cesium-heatmap-es6"


export default class CesiumGeometry {

    _heatMapList = [];
    _debug = false;

    constructor(viewer, isDebugger) {
        this.utils = new CesiumUtils(viewer);
        this.viewer = viewer;
        // 是否为debugger模式
        this._debug = isDebugger;
        if (isDebugger) {
            debugger
        }
    }

    /**
     * 添加entity到collection
     * @param collectionName 类名称 默认defaultCollection
     * @param entity 点
     */
    addEntityToCollection(entity, collectionName = 'defaultCollection') {
        entity.collectionName = collectionName;
        let find = this.viewer.dataSources.getByName(collectionName)
        if (find && find.length > 0) {
            find[0].entities.add(entity);
        }
    }

    /**
     * ⚠，尚未完善，请勿使用：隐藏或显示带有附属性质的点是无法隐藏附属点
     * 比如addMarker中添加{attachImage: []} 就无法显示隐藏这个附属点
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
     * 按组别批量删除entity（按组名称）
     * @param collectionName 组名
     */
    removeCollection(collectionName) {
        let dataSourceList = this.viewer.dataSources.getByName(collectionName);
        if (dataSourceList && dataSourceList.length > 0) {
            let dataSource = dataSourceList[0];

            for (let i = dataSource.entities.values.length - 1; i >= 0; i--) {
                let entity = dataSource.entities.values[i];
                this.removeEntity(entity.id, true);
            }
        }
    }

    /**
     * 删除全部的热力图
     */
    removeAllHeatMap() {
        this._heatMapList.forEach(item => {
            item.cesiumHeatmap.remove();
        })
        this._heatMapList = [];
    }

    /**
     * 删除实体对象
     * @param id 删除的对象
     * @param removeChild 是否同时删除子集
     */
    removeEntity(id, removeChild = true) {
        let mainEntity = this.getEntityById(id);
        let _this = this;
        // 删除附属
        let defaultPrimitives = this.viewer.dataSources.getByName('defaultPrimitives')[0]
        let entities = defaultPrimitives.entities.values
        // 倒序遍历实体并安全删除满足条件的实体
        for (let entity of entities.slice().reverse()) {
            if (entity.description.getValue(undefined).searchId === id) {
                defaultPrimitives.entities.remove(entity);
            }
        }

        // 如果需要查找手动添加的附属（在add的时候添加过parent且parent的值等于mainEntity）
        if (removeChild) {
            this.getEntitiesByCondition((entity) => {
                if (entity.parent === mainEntity) {
                    _this.removeEntity(entity.id, true)
                }
            })
        }


        // 删除普通点
        if (Cesium.defined(mainEntity)) {
            let defaultDataSources = this.viewer.dataSources.getByName(mainEntity.collectionName)[0]
            defaultDataSources.entities.remove(mainEntity);
        }

        // 删除热力图
        let heatMap = this._heatMapList.find(x => x.id === 'heatMap' + id);
        if (heatMap) {
            heatMap.cesiumHeatmap.remove();
            this._heatMapList = this._heatMapList.filter(x => x.id !== 'heatMap' + id);
        }
    }


    /**
     * 获取全部的entity
     */
    getAllEntity() {
        let allEntity = [];
        const dataSources = this.viewer.dataSources;
        for (let i = 0; i < dataSources.length; i++) {
            allEntity.push(...dataSources.get(i).entities.values)
        }
        return allEntity;
    }

    /**
     * 根据条件查找entity
     */
    getEntitiesByCondition(condition) {
        const foundEntities = [];
        const allEntity = this.getAllEntity();
        allEntity.forEach((entity) => {
            if (condition(entity)) {
                foundEntities.push(entity);
            }
        });
        return foundEntities;
    };

    /**
     * 根据ID查找entity
     * @param id
     * @returns {*|null}
     */
    getEntityById(id) {
        let find = this.getEntitiesByCondition((entity) => entity.id === id);
        if (find && find.length > 0) {
            return find[0]
        } else {
            return null
        }
    }


    /**
     * 向集合中添加一个点。
     * @param {Object} marker - 标记的选项对象。
     * @param {string} collectionName - 要添加标记的集合名称。
     * @returns {Cesium.Entity} - 添加的实体对象。
     * @typedef {Object} MarkerOptions
     * @property {Cesium.Cartesian3} position - 标记的位置（世界坐标）。
     * @property {string} [description] - 标记的描述信息。
     * @property {boolean} [hasMove=false] - 标记是否可移动。
     * @property {boolean} [hasLabel=true] - 是否显示标记标签。
     * @property {Object} [labelOption] - 标签的选项对象，用于配置标签外观。
     * @property {string} [iconImage] - 标记的图标图像。
     * @property {Cesium.Entity} [parent] - 标记的父实体。
     * @property {Array<Object>} [attachImage] - 附加的图像标记选项列表。
     * @property {string} attachImage.url - 附加图像的URL。
     * @property {number} [attachImage.scale=0.3] - 附加图像的缩放比例。
     * @property {number} [attachImage.rotation=0] - 附加图像的旋转角度（弧度）。
     * @property {Cesium.Cartesian2} [attachImage.pixelOffset] - 附加图像的像素偏移。
     * @property {Object} [point] - 点标记的选项对象，用于配置点标记外观。
     * @property {Cesium.Color} [point.color=Cesium.Color.WHITE] - 点标记的颜色。
     * @property {number} [point.pixelSize=20] - 点标记的像素大小。
     * @property {number} [point.rotation] - 点标记的旋转角度（弧度）。
     * @property {number} [point.scale=0.1] - 点标记的缩放比例。
     */
    addMarker(marker = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            scale: 0.1,
            id,
            name: id,
            hasMove: false,
            hasLabel: true,
            labelOption: {},
        }, marker);
        info.heightReference = marker.clampToGround ? Cesium.HeightReference.CLAMP_TO_GROUND : Cesium.HeightReference.RELATIVE_TO_GROUND
        let entity = new Cesium.Entity({
            // http://cesium.xin/cesium/cn/Documentation1.72/Entity.html
            id: info.id,
            name: info.name,
            position: this.utils.convertToCartesian3(info.position),
            description: info.description,
            hasMove: info.hasMove,
            hasLabel: info.hasLabel,
            label: info.label,
            parent: info.parent
        });
        if (info.iconImage) {
            entity.billboard = new Cesium.BillboardGraphics({
                image: info.iconImage,
                scale: info.scale,
                rotation: info.rotation,
                heightReference: info.heightReference,
                eyeOffset: info.eyeOffset,
                pixelOffset: info.pixelOffset,
                pixelOffsetScaleByDistance: info.pixelOffsetScaleByDistance
            })
        } else {
            entity.point = new Cesium.PointGraphics(Object.assign({
                color: Cesium.Color.WHITE,
                pixelSize: 20,
                heightReference: info.heightReference,
            }, info.point))
        }
        if (info.hasLabel) {
            this.markerAddLabel(entity, info.label ?? info.name, {
                ...info.labelOption,
                heightReference: info.heightReference
            })
        }

        // 附加的entity
        if (info.attachImage && Array.isArray(info.attachImage) && info.attachImage.length > 0) {
            let tempEntityList = [];
            info.attachImage.forEach(attachImage => {
                let tempEntity = new Cesium.Entity({
                    parent: entity,
                    id: this.utils.generateUUID(),
                    billboard: new Cesium.BillboardGraphics({
                        image: attachImage.url,
                        scale: attachImage.scale ?? 0.3,
                        rotation: attachImage.rotation ?? 0,
                        heightReference: info.heightReference,
                        pixelOffset: new Cesium.Cartesian2(attachImage.pixelOffset.x, attachImage.pixelOffset.y)
                    }),
                    position: entity.position,
                    description: {searchId: entity.id, entity}
                });
                this.addEntityToCollection(tempEntity, 'defaultPrimitives')
                tempEntityList.push(tempEntity);
            })
            entity.attachList = tempEntityList
        }
        this.addEntityToCollection(entity, collectionName)
        this.utils.unlockCamera();
        return entity;
    }

    /**
     * 点添加文字 如果本来有文字则修改 否则添加
     * @param entity
     * @param text
     * @param option 个性化设置
     */
    markerAddLabel(entity, text, option) {
        entity.label = new Cesium.LabelGraphics(Object.assign({
            text: text,
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: this.utils.colorToCesiumRGB('#000000', 0.5),
            style: Cesium.LabelStyle.FILL,
            pixelOffset: new Cesium.Cartesian2(0, 40),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            font: '14px microsoft YaHei',
        }, option))
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
            id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            clampToGround: true,
        }, polyline);

        let line = new Cesium.Entity({
            id: info.id,
            name: info.name,
            parent: info.parent,
            polyline: {
                clampToGround: info.clampToGround,
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
            id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            clampToGround: true,
        }, polyline);

        let polygon = new Cesium.Entity({
            id: info.id,
            name: info.name,
            parent: info.parent,
            polygon: {
                clampToGround: info.clampToGround,
                hierarchy: new Cesium.PolygonHierarchy(this.utils.convertToCartesian3(info.positions)),
                width: 3,
                material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            },
        });
        if (info.holes) {
            let hierarchy = polygon.polygon.hierarchy.getValue(undefined)
            if (hierarchy) {
                hierarchy.holes.push(...info.holes);
            }

        }
        this.addEntityToCollection(polygon, collectionName)
        return polygon
    }

    /**
     * 添加椭圆
     * @param ellipse
     * @param collectionName
     * @returns {module:cesium.Entity}
     */
    addEllipse(ellipse = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            name: id,
            text: id,
            id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            outlineColor: this.utils.colorToCesiumRGB('#23ADE5', 1),
            semiMinorAxis: 100000, // Default radius in meters
            semiMajorAxis: 80000, // Default radius in meters
        }, ellipse);
        let circleEntity = new Cesium.Entity({
            id: info.id,
            name: info.name,
            parent: info.parent,
            ellipse: {
                semiMinorAxis: info.semiMinorAxis,
                semiMajorAxis: info.semiMajorAxis,
                outline: true,
                outlineColor: info.outlineColor,
                material: info.material,
            },
            position: Cesium.Cartesian3.fromDegrees(...info.position),
        });

        this.addEntityToCollection(circleEntity, collectionName);
        return circleEntity;
    }

    /**
     * 添加圆
     * @param circle
     * @param collectionName
     */
    addCircle(circle = {}, collectionName) {
        return this.addEllipse({
            ...circle,
            semiMinorAxis: circle.radius,
            semiMajorAxis: circle.radius,
        }, collectionName)
    }


    /**
     * 添加半圆罩
     * @param ellipsoid
     * @param collectionName
     * @returns {module:cesium.Entity}
     */
    addEllipsoid(ellipsoid = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            // 半径参考 https://zh.wikipedia.org/wiki/%E6%A4%AD%E7%90%83
            radii: [200000, 200000, 100000],
            id,
            material: this.utils.colorToCesiumRGB('#23ADE5', 0.3),
            outlineColor: this.utils.colorToCesiumRGB('#23ADE5', 1)
        }, ellipsoid);
        if (!info.position) {
            console.error('传入的值内没有坐标点（position为空）')
            return
        }
        let earthEllipsoid = new Cesium.Entity({
            name: info.name ?? id,
            id: info.id,
            parent: info.parent,
            position: Cesium.Cartesian3.fromDegrees(...info.position),
            ellipsoid: {
                radii: new Cesium.Cartesian3(...info.radii),
                maximumCone: Cesium.Math.PI_OVER_TWO,
                material: info.material,
                outlineColor: info.outlineColor,
                outline: true,
            }
        });
        this.addEntityToCollection(earthEllipsoid, collectionName)
        return earthEllipsoid
    }

    addArrow(arrow = {}, collectionName) {
        const id = this.utils.generateUUID();
        let info = Object.assign({
            name: id,
            text: id,
            id,
            color: this.utils.colorToCesiumRGB('#23ADE5', 0.7),
            dashed: false,
            clampToGround: true,
            lineWidth: 30,
        }, arrow);


        const arrowEntity = new Cesium.Entity({
            polyline: {
                positions: this.utils.convertToCartesian3(info.positions),
                width: info.lineWidth,
                material: new Cesium.PolylineArrowMaterialProperty(info.color),
                clampToGround: true
            }
        });

        this.addEntityToCollection(arrowEntity, collectionName);
        return arrowEntity;
    }


    /**
     * 历史轨迹
     * @param marker
     * @param timeAndPosition [{time:'2023-01-01 12:00:00',position:[122.4882,23.9999]},{time:'2023-01-02 12:00:00',position:[126.1321,39.2452]}]
     * @param hasLine 是否显示线条
     * @param velocity 图像是否根据移动方向改变方向
     */
    historyLine(marker, timeAndPosition, hasLine = true, velocity = false) {
        if (marker.model || marker.billboard) {
            let positionProperty = new Cesium.SampledPositionProperty();
            timeAndPosition.forEach(item => {
                positionProperty.addSample(this.utils.jsDateToJulianDate(item.time),
                    this.utils.convertToCartesian3(item.position));

            })
            marker.position = positionProperty;
            if (marker.model && velocity) {
                marker.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
            }
            if (marker.billboard && velocity) {
                marker.billboard.alignedAxis = new Cesium.VelocityVectorProperty(positionProperty)
            }

            if (hasLine) {
                marker.polyline = new Cesium.PolylineGraphics({
                    material: this.utils.colorToCesiumRGB('#4B8BF4', 1),
                    width: 2,
                    clampToGround: true,
                    positions: timeAndPosition.map(x => this.utils.convertToCartesian3(x.position))
                });
            }
            // 时间范围之外 不显示点和线  取消该代码也只能保持显示线不能显示点
            let availability = new Cesium.TimeIntervalCollection();
            availability.addInterval(
                new Cesium.TimeInterval({
                    start: this.utils.jsDateToJulianDate(timeAndPosition[0].time),
                    stop: this.utils.jsDateToJulianDate(timeAndPosition[timeAndPosition.length - 1].time),
                })
            );
            marker.availability = availability;
        }
    }

    /**
     * 热力图
     * @param option 参数 points必填
     * option.points = [{
     *                 "x": randomLng,
     *                 "y": randomLat,
     *                 "value": randomValue
     *             }]
     * @returns {CesiumHeatmap}
     */
    addHeatMap(option) {
        let options = Object.assign({
            zoomToLayer: false, //自动到热力图范围
            renderType: "entity",
            points: [],
            heatmapDataOptions: {max: 100, min: 0},
            heatmapOptions: {
                maxOpacity: 0.8,
                minOpacity: 0,
            },

        }, option)
        let cesiumHeatmap = new CesiumHeatmap(this.viewer, options)
        this._heatMapList.push({
            id: options.id == undefined ? this.utils.generateUUID() : 'heatMap' + options.id,
            cesiumHeatmap
        });
        return cesiumHeatmap
    }


    /**
     * 给entity设置它的父级entity，如果entity原来有，则替换
     * @param entity
     * @param parentEntity
     */
    giveEntityToParent(entity, parentEntity) {
        if (Cesium.defined(entity) && Cesium.defined(parentEntity)) {
            entity.parent = parentEntity;
        }
    }
}
