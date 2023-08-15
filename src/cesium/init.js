import * as Cesium from "cesium";

export default class CesiumInit {
    viewer = null;
    dataSourceList = [];
    _debug = false;
    /**
     * 初始化
     * @param domId id
     * @param option 设置项
     * @param isOffline 是否为离线运行 如果是离线运行 需要在option添加配置项 IMAGERY_PROVIDER:[]
     */
    constructor(domId, option, isOffline, isDebugger) {
        // 是否为debugger模式
        this._debug = isDebugger;
        // 初始化时摄像机视角 在 new CesiumKaze().init 的option里面添加
        // DEFAULT_VIEW_RECTANGLE: Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2),
        if (option.DEFAULT_VIEW_RECTANGLE) {
            Cesium.Camera.DEFAULT_VIEW_RECTANGLE = option.DEFAULT_VIEW_RECTANGLE;
        }
        if (option.DATA_SOURCE_LIST) {
            this.dataSourceList = option.DATA_SOURCE_LIST;
        }
        let defOption = {};
        if (isOffline != true) {
            // 官方地形数据
            defOption.terrain = Cesium.Terrain.fromWorldTerrain();
        }
        // 新建地球视图
        this.viewer = new Cesium.Viewer(domId, Object.assign({
            infoBox: false, // 信息盒子
            baseLayerPicker: false, // 图层小部件
            geocoder: false, // 搜索按钮
            timeline: false, // 时间轴
            animation: false, // 时钟按钮
            navigationHelpButton: false, // 帮助按钮,
            homeButton: false, // 主页按钮
            sceneModePicker: false, // 视图模式切换按钮
            fullscreenButton: false, // 全屏按钮
        }, defOption, option));
        // 多个图层可以叠加 在 new CesiumKaze().init 的option里面添加
        // IMAGERY_PROVIDER: [
        //       new Cesium.UrlTemplateImageryProvider({
        //         url: '/map/{z}/{x}/{y}.jpg',
        //       }),
        //     ]
        if (option.IMAGERY_PROVIDER) {
            option.IMAGERY_PROVIDER.forEach(item => this.viewer.imageryLayers.addImageryProvider(item));
        }
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
        [...new Set(['defaultCollection', 'defaultDraw', 'defaultPrimitives', ...this.dataSourceList])].forEach(name => {
            const dataSource = new Cesium.CustomDataSource(name);
            promiseList.push(this.viewer.dataSources.add(dataSource));
        })
        await Promise.all(promiseList);
    }
}
