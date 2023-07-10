import * as Cesium from "cesium";

export default class CesiumInit {
    viewer = null;
    dataSourceList = [];

    constructor(domId, option) {
        Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2);
        // 新建地球视图
        this.viewer = new Cesium.Viewer(domId, Object.assign({
            terrain: Cesium.Terrain.fromWorldTerrain(),
            infoBox: false,
            baseLayerPicker: false, // 图层小部件
            geocoder: false, // 搜索按钮
            timeline: false, // 时间轴
            animation: false, // 时钟按钮
            homeButton: false,
            navigationHelpButton: false, // 帮助按钮销毁,
            // homeButton: false, // 主页按钮
            sceneModePicker: false, // 视图模式切换按钮
            fullscreenButton: false, // 全屏按钮
            // imageryProvider: new Cesium.UrlTemplateImageryProvider({
            //     url: window.imageryProvider,
            //     tilingScheme: new Cesium.WebMercatorTilingScheme(),
            // }),
            // terrainProvider: new Cesium.CesiumTerrainProvider({
            //     url: window.terrainProvider,
            // }),
            terrainExaggeration: 100
        }, option));
    }

    getViewer() {
        return this.viewer;
    }

    async init() {
        // 版权信息隐藏
        this.viewer.cesiumWidget.creditContainer.style.display = "none";
        // 禁止默认点击事件、双击事件
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN, Cesium.KeyboardEventModifier.ALT);
        // 初始化组
        let promiseList = [];
        // 这个是分组，能批量控制图标，每个项目不一样，需要自己设置dataSourceList
        // 项目中默认添加两个defaultCollection和defaultDraw
        // 添加的实体但是没有规定类别时全部添加到defaultCollection
        // 手动画的点线面归类到defaultDraw
        [...new Set(['defaultCollection', 'defaultDraw', ...this.dataSourceList])].forEach(name => {
            const dataSource = new Cesium.CustomDataSource(name);
            promiseList.push(this.viewer.dataSources.add(dataSource));
        })
        await Promise.all(promiseList);

    }
}
