# kaze-cesium-helper

kaze-cesium-helper 是一个基于 Cesium 的封装库，提供了绘制点、线、面以及计算长度和面积等功能。

## 安装

使用 npm 安装 kaze-cesium-helper，然后使用 npm 安装 vite-plugin-cesium

```bash
npm install kaze-cesium-helper
npm install vite-plugin-cesium
```

## 引用

```js
  // 在vite.config.js内添加引用
import cesium from 'vite-plugin-cesium'

// plugins添加cesium()
plugins: [vue(), cesium()];

// 以下是我的config.js的内容

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({mode, command}) => {
    return {
        plugins: [vue(), cesium()],
    }
})
```

## 文档结构

一共五个文件，分别为：index,init,event,geometry,utils。

| 文件名         | 大致作用          |
|-------------|---------------|
| index.js    | 使用Proxy将多个类合并 |
| init.js     | 初始化cesium     |
| event.js    | 事件绑定          |
| geometry.js | 几何体操作         |
| utils.js    | 底层计算方法        |

他们分别作用为：事件操作，cesium组件操作，

## 使用

#### 我希望初始化的时候能使用await，因为cesium新建集合的时候，它是异步的

```js
onMounted(async () => {
    cesium = await new CesiumKaze().init('cesium-dom');
})
```

## API 文档

### 初始化API 不用你就删掉这个组件

#### CesiumKaze.init(domId,option,isOffline)

初始化 CesiumKaze 实例，并将地图渲染到指定的容器中。

参数 `domId` 是一个字符串，表示容器的 DOM 元素的 id，dom元素的大小需要自己在dom中写样式。

参数 `option` 是一个对象，里面是初始化中的各种配置,包括初始化的包配置和本主键的配置。

参数 `isOffline` 是一个布尔值，表示是否为离线运行，如果是离线/内网环境，需要在option对象中添加图层。

以下是cesium初始化时我给的默认的值，如果需要，请自己覆盖`option`：

| 参数                   | 解释       | 默认值   |
|----------------------|----------|-------|
| infoBox              | 信息盒子     | false |
| baseLayerPicker      | 图层小部件    | false |
| geocoder             | 搜索按钮     | false |
| timeline             | 时间轴      | false |
| animation            | 时钟按钮     | false |
| navigationHelpButton | 帮助按钮     | false |
| homeButton           | 主页按钮     | false |
| sceneModePicker      | 视图模式切换按钮 | false |
| fullscreenButton     | 全屏按钮     | false |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/cn/Documentation1.95/Viewer.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html)

以下是本组件的配置，也写在option里面自行覆盖

| 参数                     | 解释                                                | 默认值  | 值举例                                                                      |
|------------------------|---------------------------------------------------|------|--------------------------------------------------------------------------|
| DEFAULT_VIEW_RECTANGLE | 它是初始化地球后摄像机的位置，说人话就是一开始地球展示的面的四个角的经纬度             | null | Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2)                    |
| IMAGERY_PROVIDER       | 图层，在初始化时，如果isOffline为true，则必填                     | null | [new Cesium.UrlTemplateImageryProvider({ url: '/map/{z}/{x}/{y}.jpg' })] |
| DATA_SOURCE_LIST       | 集合名称，用于批量显示隐藏(暂时只有这么多功能,后续添加删除等)，将添加的图形添加到集合内批量控制 | null | [new Cesium.UrlTemplateImageryProvider({ url: '/map/{z}/{x}/{y}.jpg' })] |

### 事件监听API  它们都event.js内

并不清楚在外面单独写类似于`handler.setInputAction(evt => {}, Cesium.ScreenSpaceEventType.LEFT_DOWN)` 会不会让监听失效

#### CesiumKaze.on(event, callback)

监听指定的事件，并在事件触发时执行回调函数。参数 `event` 是一个字符串，表示要监听的事件类型。参数 `callback`
是一个回调函数，在事件触发时被调用。

支持的事件类型：

- `draw`：画图完成后的事件，返回三个参数
    - `entityList` 当type为点返回这个图形数组，当type为线面返回图形本身
    - `activeShapePoint` 数组，返回当前图形的全部世界坐标系的坐标点
    - `type` 你画的图形的类型，用于确认你画的是个什么东西。1点 2线 3面 4掏洞
- `holeDraw`：掏洞完成后的事件，返回一个参数
    - `entity` 被掏洞的那个图标信息，掏洞的图标信息在`draw`返回的参数内
- `handleClick`：点击图形的事件，返回一个参数，但是type必须等于0 （怎么调整type值在下面有写）
    - `info` 返回被选中的图形(info.entity)和经纬度海拔(info.position)和屏幕坐标(info.windowCoordinates)
- `contextMenu`：右键事件，返回一个参数
    - `info` 返回被选中的图形(info.entity)和经纬度海拔(info.position)和屏幕坐标(info.windowCoordinates)
- `cameraMove`：视角移动事件，当摄像机高度改变和转动地球的时候触发
    - `info` 返回摄像机中心点的经纬度海拔和摄像机高度


#### CesiumKaze.off(event)

取消监听指定的事件

### 图形操作API  它们都在geometry.js内

没有标记为‘组件自定义属性’为官方属性

#### CesiumKaze.addMarker(options,collectionName)

添加一个标记点，返回添加的标记点的实体对象。

参数 `options` 是一个对象，包含以下属性：

| 参数          | 是否必填 | 默认值                           | 描述                              |
|-------------|------|-------------------------------|---------------------------------|
| iconImage   | 必填   |                               | 图标的图片路径                         |
| position    | 必填   |                               | 标记点的位置，经纬度数组，例如`[112.45,45.29]` |
| id          |      | `utils.generateUUID()`返回的随机id | 标记的id，全局唯一                      |
| name        |      | `id`的值                        | 标记点的名称，默认等于                     |
| scale       |      | `0.1`                         | 图标的缩放比例                         |
| point       |      | {show: false}                 | 对象，为一个点，没有大小，视觉上是一个白色的像素点       |
| hasLabel    |      | true                          | 组件自定义属性，是否显示`name`，显示的位置在图标下方   |
| hasMove     |      | false                         | 组件自定义属性，图标能否被拖动                 |
| attachImage |      | []                            | 组件自定义属性，填入附加值                   |

attachImage是附属值，比如一个entity添加一个图形的billboard后，还需要其他的图片，那么就用这个。
它的是一个对象数组,里面的全部参数如下
```js
// 一般这么写就行了
cesium.addMarker({
    attachImage: [{
      url: `/public/logo2.jpg`,
      pixelOffset:{x: 500, y: 250}
    }]
  })
```

| 参数          | 是否必填 | 默认值 | 描述                             |
|-------------|------|-----|--------------------------------|
| url         | 必填   |     | 图标的图片路径                        |
| pixelOffset |      |     | 偏移量（屏幕像素），填写方式是{x:0,y:0}，反向写负数 |
| scale       |      | 0.3 | 图形大小                           |
| rotation    |      | 0   | 图形旋转角度                         |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/cn/Documentation1.95/Entity.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/Entity.html)

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

---

#### CesiumKaze.addLine(polyline = {}, collectionName)

添加一个线，返回添加的线的实体对象。

参数 `polyline` 是一个对象，组件添加的默认值包含以下属性：

| 参数        | 是否必填 | 默认值                                      | 描述                                              |
|-----------|------|------------------------------------------|-------------------------------------------------|
| name      |      | `id`的值                                   | 线的名称，默认等于标记点的id                                 |
| text      |      | `id`的值                                   | 线的名称，默认等于标记点的id                                 |
| id        |      | `utils.generateUUID()`返回的随机id            | 线的id，全局唯一                                       |
| positions | 必填   |                                          | 线的位置，经纬度数组，例如`[[112.45,45.29], [112.50,45.32]]` |
| material  |      | `utils.colorToCesiumRGB('#23ADE5', 0.7)` | 线的材质，颜色和透明度                                     |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/en/Documentation1.95/Polyline.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/Polyline.html)

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

---

#### CesiumKaze.addPolygon(polyline = {}, collectionName)

添加一个面，返回添加的面的实体对象。

参数 `polyline` 是一个对象，组件添加的默认值包含以下属性：

| 参数        | 是否必填 | 默认值                                      | 描述                                                              |
|-----------|------|------------------------------------------|-----------------------------------------------------------------|
| name      |      | `id`的值                                   | 面的名称，默认等于标记点的id                                                 |
| text      |      | `id`的值                                   | 面的名称，默认等于标记点的id                                                 |
| id        |      | `utils.generateUUID()`返回的随机id            | 面的id，全局唯一                                                       |
| positions | 必填   |                                          | 面的位置，经纬度数组，例如`[[112.45,45.29], [112.50,45.32], [112.60,45.35]]` |
| material  |      | `utils.colorToCesiumRGB('#23ADE5', 0.7)` | 面的材质，颜色和透明度                                                     |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/en/Documentation1.95/PolygonGraphics.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/PolygonGraphics.html)

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

追加：如果需要掏洞，在polyline添加 `polygonHierarchy`。例如

```js
// holes 表示这个holes还能添加洞中洞 无限套娃 holes:[{positions:[],holes:[]}]
polyline = {
    positions: [[112.45, 45.29], [112.50, 45.32], [112.60, 45.35]],
    holes: [{positions: [], holes: []}]
}

// 举例 经纬度位于美国区域
cesium.addPolygon(
    {
        positions: [[-99.0, 30.0], [-85.0, 30.0], [-85.0, 40.0], [-99.0, 40.0],],
        holes: [{
            positions: cesium.convertToCartesian3([[-97.0, 31.0], [-97.0, 39.0], [-87.0, 39.0], [-87.0, 31.0]]),
            holes: [{positions: cesium.convertToCartesian3([[-95.0, 33.0], [-89.0, 33.0], [-89.0, 37.0], [-95.0, 37.0]])}]
        }]
    })
```

---

#### CesiumKaze.historyLine(marker, timeAndPosition)

绘制历史轨迹。

参数 `marker` 是要绘制历史轨迹的标记点实体对象。

参数 `timeAndPosition`
是一个包含时间和位置信息的数组，它应该长这样：`[{time:'2023-01-01 12:00:00',position:[122.4882,23.9999]},{time:'2023-01-02 12:00:00',position:[126.1321,39.2452]}]`

注意，添加历史轨迹后，在时间之外，marker是不显示的

---

#### CesiumKaze.addHeatMap(entryList)

添加热力图，返回热力图对象

参数 `entryList` 是一个点列表，每个点是一个对象，包含以下属性：

| 参数    | 是否必填 | 描述            |
|-------|------|---------------|
| x     | 必填   | 经度            |
| y     | 必填   | 纬度            |
| value | 必填   | 值，代表热力图的强度或权重 |

---

#### CesiumKaze.getEntityById(id)

根据给定的id查找实体，并返回该实体对象。

参数 `id` 是要查找的实体的id。

---

#### CesiumKaze.addEntityToCollection(entity, collectionName)

将实体添加到集合中。

参数 `entity` 是要添加的实体对象。

参数 `collectionName` 是集合名称，默认值为 `defaultCollection`。

每个图形在添加的时候都会默认添加到`defaultCollection`，除非指定名称，名称在初始化的时候需要添加到`option`
的`DATA_SOURCE_LIST`内。

```js

// 初始化的时候添加
onMounted(async () => {
    cesium = await new CesiumKaze().init('cesium-dom', {
        DATA_SOURCE_LIST: ['aa']
    });
})

// 添加点
CesiumKaze.addMarker({}, 'aa')

```

插件已经使用了两个集合名称，分别为`defaultCollection`和`defaultDraw`，请避免。

- `defaultCollection` 没有指定集合名词时实体会添加到这里
- `defaultDraw` 画图时，那些画完的图形会添加到这里
- `defaultPrimitives` 添加图形时，附加的图形的数据，现阶段只有添加点才用上

---

#### CesiumKaze.changeCollectionShowAndHide(show, collectionName)

按组别批量显示或隐藏实体（按组名称）。

参数 `show` 是一个布尔值，表示是否显示实体。如果为 `true`，则显示实体；如果为 `false`，则隐藏实体。

参数 `collectionName` 是集合名称，默认值为 `'defaultCollection'`。

---

#### CesiumKaze.removeCollection(collectionName)

按组别批量删除里面全部实体(建议二次确认)。

参数 `collectionName` 是集合名称。

### 工具类API  它们都在utils.js内（部分） (•̀ᴗ• ) ̑̑
这里面一部分是给组件用于代码自洽，没必要用，这里值列出我建议你们使用的方法

#### generateUUID()

生成 UUID。

- 返回值：String，生成的 UUID。

---

#### unlockCamera()

取消视角锁定。

#### lockCamera()

视角锁定。

---

#### convertToCartesian3(position)

将坐标转换为世界坐标系（Cartesian3）。

- 参数：
    - `position`：Array 或 Cesium.Cartesian3，输入的坐标，可以是经纬度数组或世界坐标系。

- 返回值：Array 或 Cesium.Cartesian3，转换后的世界坐标系。

#### cartesian3ToDegree2(cartesian, type = 0)

将世界坐标系（Cartesian3）转换为经纬度。

- 参数：
    - `cartesian`：Cesium.Cartesian3，世界坐标系（Cartesian3）。
    - `type`：Number，返回类型，0 表示带有高度的对象，1 表示没有高度的数组。

- 返回值：Object 或 Array，转换后的经纬度。

---

#### computePointDistanceWithTerrain(point1, point2)

计算两点之间的距离（考虑地形）。

- 参数：
    - `point1`：Array 或 Cesium.Cartesian3，第一个点的坐标。
    - `point2`：Array 或 Cesium.Cartesian3，第二个点的坐标。

- 返回值：Number，距离值（单位：米）。

#### computePointDistance(point1, point2)

计算两点之间的距离（不考虑地形）。

- 参数：
    - `point1`：Array，第一个点的经纬度。
    - `point2`：Array，第二个点的经纬度。

- 返回值：Number，距离值（单位：米）。

#### computePolygonArea(polygonPointList)

计算多边形的面积。

- 参数：
    - `polygonPointList`：Array，多边形的经纬度点列表。

- 返回值：Number，面积值（单位：平方米）。

---

#### iSODateToJulianDate(date)

将标准时间转换为天文儒略日期。

- 参数：
    - `date`：Date，标准时间。

- 返回值：Cesium.JulianDate，天文儒略日期。

#### julianDateToISODate(julianDate)

将天文儒略日期转换为标准时间。

- 参数：
    - `julianDate`：Cesium.JulianDate，天文儒略日期。

- 返回值：Date，标准时间。

---

#### changeTimeLine(timestamp)

设置当前时间。

- 参数：
    - `timestamp`：Number，当前时间的时间戳。

---

#### toN()

将视角调整为正北方向。

---

#### getBounds()

获取屏幕可视范围的经纬度边界。

- 返回值：Object，边界对象，包含 `southwest` 和 `northeast` 两个属性，分别表示西南角和东北角的经纬度。

---

#### getCenterPoint()

获取屏幕中心点的经纬度。

- 返回值：Array，中心点的经纬度数组。

---

#### colorToCesiumRGB(color, alpha)

将颜色和透明度转换为 Cesium 使用的颜色。

- 参数：
    - `color`：String，颜色值，支持 16 进制颜色。
    - `alpha`：Number，透明度。

- 返回值：Cesium.Color，Cesium 使用的颜色对象。

- ---

#### cameraFly(lng, lng, height = 50000)

摄像机飞到指定的经纬度

- 参数：
  - `lng`：Number，经度。
  - `lat`：String，纬度。
  - `height`：Number，高度，默认50000米。

- 返回值：无。

---

#### wgs84ToWindowCoordinates(scene, cartesian3)

世界坐标系转成屏幕坐标

- 参数：
  - `scene`：Object，屏幕对象。
  - `cartesian3`：Object，世界坐标系。

- 示例：鼠标点击地球获取屏幕坐标
```js
const position = viewer.scene.globe.pick(viewer.camera.getPickRay(evt.position), viewer.scene)
const windowCoordinates = that.utils.wgs84ToWindowCoordinates(viewer.scene, position);
// 返回值 {x:604 , y:182}
```

- 返回值：屏幕坐标。

## 部分示例

在 Vue 组件中使用 ，请下载项目查看或查看 [App.vue](https://github.com/KazeLiu/kaze-cesium/blob/main/src/App.vue)


## 许可证

MIT License

## 贡献者

- kazeliu

## 反馈和问题

如果您发现任何问题或有任何疑问，请在项目的 [GitHub Issues](https://github.com/kazeliu/kaze-cesium/issues) 页面提出。

## 注意

如有遗漏或者不正确的地方，请翻源码或者提 [Issues](https://github.com/kazeliu/kaze-cesium/issues) 。
本代码初衷是给自己用，所以有些封装没有传值，如果需要，建议下载源码修改。
我正在慢慢优化md文档
