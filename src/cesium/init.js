import * as Cesium from "cesium";
import CesiumUtils from "./utils";

export default class CesiumInit {
    viewer = null;
    dataSourceList = [];
    _debug = false;

    /**
     * 创建一个新的 CesiumKaze 实例并初始化地球视图。
     *
     * @param {string} domId - 地球视图容器的 DOM 元素的 ID。
     * @param {Object} option - 初始化选项。
     * @param {boolean} [isOffline=false] - 是否离线模式。如果为 true，则不使用在线地形数据，默认为 false。
     * @param {boolean} [isDebugger=false] - 是否为调试器模式。如果为 true，则启用调试模式，以便进行调试操作，默认为 false。
     *
     * @property {Cesium.Rectangle} [DEFAULT_VIEW_RECTANGLE] - 地球视图的默认视角矩形。格式为 Cesium.Rectangle.fromDegrees(west, south, east, north)。
     * @property {Array} [DATA_SOURCE_LIST] - 初始数据源列表，用于添加不同类型的地理数据。
     * @property {Array<Cesium.ImageryProvider>} [IMAGERY_PROVIDER] - 影像图层提供者列表，用于叠加不同图层作为底图。
     * @property {Array<Cesium.ImageryLayer>} [IMAGERY_PROVIDER_ONE_PICK] - 单独添加的影像图层列表，可以在初始化时添加单一影像图层。
     *
     * @throws {Error} 如果初始化过程中出现错误，将抛出错误。
     * @example
     * // 创建一个新的 CesiumKaze 实例并初始化地球视图。
     * const cesiumInstance = new CesiumKaze('cesiumContainer', {
     *     isOffline: true,
     *     isDebugger: false,
     *     DEFAULT_VIEW_RECTANGLE: Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2),
     *     DATA_SOURCE_LIST: [], // 数据源列表
     *     IMAGERY_PROVIDER: [], // 影像图层提供者列表
     *     IMAGERY_PROVIDER_ONEPICK: [], // 单独添加的图层列表
     * });
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
        if (option.IMAGERY_PROVIDER_ONE_PICK) {
            option.IMAGERY_PROVIDER_ONE_PICK.forEach(item => this.viewer.imageryLayers.add(item));
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

        if (this.viewer.animation) {
            this.viewer.animation.viewModel.dateFormatter = CesiumUtils.DateTimeFormatter;
            this.viewer.animation.viewModel.timeFormatter = CesiumUtils.TimeFormatter;
        }
        if (this.viewer.timeline) {
            this.viewer.timeline.makeLabel = CesiumUtils.DateTimeFormatter
        }

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
