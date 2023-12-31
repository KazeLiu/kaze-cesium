# kaze-cesium-helper

kaze-cesium-helper 是一个基于 Cesium 的封装库，提供了绘制点、线、面以及计算长度和面积等功能。

# 目录

- [kaze-cesium-helper](#kaze-cesium-helper)
    - [安装](#安装)
    - [引用](#引用)
    - [文档结构](#文档结构)
    - [使用](#使用)
    - [API 文档](#api-文档)
        - [初始化API](#初始化api)
        - [事件监听API](#事件监听API)
        - [图形操作API](#图形操作api)
        - [工具类API](#工具类api)
        - [部分示例](#部分示例)
        - [许可证](#许可证)
        - [贡献者](#贡献者)
        - [反馈和问题](#反馈和问题)
        - [注意](#注意)

## 安装

使用 npm 安装 kaze-cesium-helper，然后使用 npm 安装 vite-plugin-cesium。

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

## 使用

```js
// 初始化的时候要使用await，因为cesium新建集合的时候，它是异步的
onMounted(async () => {
    cesium = await new CesiumKaze().init('cesium-dom');
})
```

在CesiumKaze()中，会返回cesium的静态对象，使用``CesiumKaze.cesium``获取，供外部调用一些cesium的静态方法

## API 文档

### 初始化API

`必须要写`

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

| 参数                        | 解释                                                | 默认值  | 值举例                                                                      |
|---------------------------|---------------------------------------------------|------|--------------------------------------------------------------------------|
| DEFAULT_VIEW_RECTANGLE    | 它是初始化地球后摄像机的位置，说人话就是一开始地球展示的面的四个角的经纬度             | null | Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2)                    |
| IMAGERY_PROVIDER          | 图层，在初始化时，如果isOffline为true，则必填                     | null | [new Cesium.UrlTemplateImageryProvider({ url: '/map/{z}/{x}/{y}.jpg' })] |
| DATA_SOURCE_LIST          | 集合名称，用于批量显示隐藏(暂时只有这么多功能,后续添加删除等)，将添加的图形添加到集合内批量控制 | null | ['aa']                                                                   |
| IMAGERY_PROVIDER_ONE_PICK | 图片，可以放一张图片到地球上                                    | null | 见下                                                                       |

IMAGERY_PROVIDER_ONE_PICK 举例

不知道图片会有多大时的写法，参看[demo](https://sandcastle.cesium.com/?src=Imagery%20Layers%20Manipulation.html)中添加
Single Image 的方法

以下写法是确认知道图片大小的方式，必须填写`tileWidth`和`tileHeight`，不然会报错。不填写`rectangle`会将图片铺满全球

```js
let imageryProvider = new cesium.SingleTileImageryProvider({
    tileWidth: 1920,
    tileHeight: 1080,
    url: 'xxx',
    rectangle: cesium.Rectangle.fromDegrees(0, 0, 0, 0)
})
let layer = new cesium.ImageryLayer(imageryProvider);
IMAGERY_PROVIDER_ONE_PICK = [layer]
```

### 事件监听API

它们都event.js内

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
    - `info` 返回被选中的图形(`info.entity`)和经纬度海拔(`info.position`)和屏幕坐标(`info.windowCoordinates`)
- `contextMenu`：右键事件，返回一个参数
    - `info` 返回被选中的图形(`info.entity`)和经纬度海拔(`info.position`)和屏幕坐标(`info.windowCoordinates`)；
      在编辑模式下(`type == 6`) ，还会附带两个参数`info.parent`和`info.parentIndex`，他们的意思是如果你点击的是拐点，
      那么parent代表拥有这个拐点的图形和它是这个图形的第几个拐点。可以使用`entity.polygon.hierarchy = new Cesium.PolygonHierarchy([修改后的点])`
      方法修改图形的点。
- `cameraMove`：视角移动事件，当摄像机高度改变和转动地球的时候触发
    - `info` 返回摄像机中心点的经纬度海拔和摄像机高度
- `entityMove`：点图形移动事件，鼠标拖拽图形后触发
    - `entity` 返回被移动的图形本身
    - `location` 移动后的经纬度
- `changePoint`：修改线，面的图形时，拖拽拐点后触发。
    - `handlePoint` 当前拐点本身
    - `entity` 被修改的线面本身
- `cameraMove`：摄像机移动后触发，在拖动地球或者缩放视角时触发。可以配合`getBounds()`获取屏幕可视范围边界的经纬度
    - `location` 摄像机中心点
    - `cameraHeight` 摄像机高度
- `northAngle`：监听真北指向角度
    - `northAngle` 数字，与真北的偏向角

#### CesiumKaze.off(event)

取消监听指定的事件

### 图形操作API

它们都在geometry.js内

没有标记为`组件自定义属性`为官方属性

#### CesiumKaze.addMarker(options,collectionName)

添加一个标记点，返回添加的标记点的实体对象。

参数 `options` 是一个对象，包含以下属性：

| 参数              | 是否必填 | 默认值                           | 描述                                            |
|-----------------|------|-------------------------------|-----------------------------------------------|
| iconImage       | 必填   |                               | 图标的图片路径                                       |
| position        | 必填   |                               | 标记点的位置，经纬度数组，例如`[112.45,45.29]`               |
| id              |      | `utils.generateUUID()`返回的随机id | 标记的id，全局唯一                                    |
| name            |      | `id`的值                        | 标记点的名称，默认等于标记点的id                             |
| scale           |      | `0.1`                         | 图标的缩放比例                                       |
| point           |      | {show: false}                 | 对象，为一个点，没有大小，视觉上是一个白色的像素点                     |
| hasLabel        |      | true                          | 组件自定义属性，是否显示`name`，显示的位置在图标下方                 |
| labelOption     |      | 见下                            | 文字的设置，包含相对位置等                                 |
| hasMove         |      | false                         | 组件自定义属性，图标能否被拖动                               |
| attachImage     |      | []                            | 组件自定义属性，填入附加值                                 |
| parent          |      |                               | 指定父级的entity，在删除entity时如果parent和entity对应则会一起删除 |
| heightReference |      | true                          | 是否贴地，贴地情况下无法使用高度                              |

`attachImage`是附属值，比如一个entity添加一个图形的billboard后，还需要其他的图片，那么就用这个。
它的是一个对象数组,里面的全部参数如下

```js
// 一般这么写就行了
cesium.addMarker({
    attachImage: [{
        url: `/public/logo2.jpg`,
        pixelOffset: {x: 500, y: 250}
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

`labelOption`请参考官方文档的`LabelGraphics`，默认值如下

| 参数              | 是否必填 | 默认值                                    | 描述                                                        |
|-----------------|------|----------------------------------------|-----------------------------------------------------------|
| text            | 是    | Cesium.Color.WHITE                     | 填充颜色，通常使用Cesium.Color对象表示颜色。                              |
| fillColor       |      | Cesium.Color.WHITE                     | 填充颜色，通常使用Cesium.Color对象表示颜色。                              |
| showBackground  |      | true                                   | 是否显示背景。                                                   |
| backgroundColor |      | 指定值                                    | 背景颜色，通常使用Cesium.Color对象表示颜色。如果您提供的是一个函数，则需要提供一个函数来计算背景颜色。 |
| style           |      | Cesium.LabelStyle.FILL                 | 标签的样式，通常使用Cesium.LabelStyle枚举值。                           |
| pixelOffset     |      | new Cesium.Cartesian2(0, 40)           | 标签的像素偏移，通常使用Cesium.Cartesian2对象表示偏移。                      |
| verticalOrigin  |      | Cesium.VerticalOrigin.BOTTOM           | 标签的垂直方向的对齐方式，通常使用Cesium.VerticalOrigin枚举值。                |
| heightReference |      | Cesium.HeightReference.CLAMP_TO_GROUND | 标签的高度参考，通常使用Cesium.HeightReference枚举值。                    |
| font            |      | '14px microsoft YaHei'                 | 标签的字体样式，通常使用字符串表示。                                        |

```js
// 常用的比如
cesium.addMarker({
    labelOption: {
        showBackground: false, // 关闭我默认给的标签背景色
        eyeOffset: new CesiumKaze.cesium.Cartesian3(0, 0, -5000), // 设置eyeOffset以使标签悬浮在上方
        pixelOffset: new CesiumKaze.cesium.Cartesian2(100, 200), // 向下移动100px向右移动200px
        backgroundColor: CesiumKaze.colorToCesiumRGB('#000000', 0.5) // 设置自定义背景色，需要showBackground为true
    }
})
```

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

---

#### CesiumKaze.addLine(polyline = {}, collectionName)

添加一个线，返回添加的线的实体对象。

参数 `polyline` 是一个对象，组件添加的默认值包含以下属性：

| 参数            | 是否必填 | 默认值                                      | 描述                                              |
|---------------|------|------------------------------------------|-------------------------------------------------|
| name          |      | `id`的值                                   | 线的名称，默认等于标记点的id                                 |
| text          |      | `id`的值                                   | 线的名称，默认等于标记点的id                                 |
| id            |      | `utils.generateUUID()`返回的随机id            | 线的id，全局唯一                                       |
| positions     | 必填   |                                          | 线的位置，经纬度数组，例如`[[112.45,45.29], [112.50,45.32]]` |
| material      |      | `utils.colorToCesiumRGB('#23ADE5', 0.7)` | 线的材质，颜色和透明度                                     |
| parent        |      |                                          | 指定父级的entity，在删除entity时如果parent和entity对应则会一起删除   |
| clampToGround |      | true                                     | 是否贴地，贴地情况下无法使用高度                                |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/en/Documentation1.95/Polyline.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/Polyline.html)

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

---

#### CesiumKaze.addPolygon(polyline = {}, collectionName)

添加一个面，返回添加的面的实体对象。

参数 `polyline` 是一个对象，组件添加的默认值包含以下属性：

| 参数            | 是否必填 | 默认值                                      | 描述                                                              |
|---------------|------|------------------------------------------|-----------------------------------------------------------------|
| name          |      | `id`的值                                   | 面的名称，默认等于标记点的id                                                 |
| text          |      | `id`的值                                   | 面的名称，默认等于标记点的id                                                 |
| id            |      | `utils.generateUUID()`返回的随机id            | 面的id，全局唯一                                                       |
| positions     | 必填   |                                          | 面的位置，经纬度数组，例如`[[112.45,45.29], [112.50,45.32], [112.60,45.35]]` |
| material      |      | `utils.colorToCesiumRGB('#23ADE5', 0.7)` | 面的材质，颜色和透明度                                                     |
| parent        |      |                                          | 指定父级的entity，在删除entity时如果parent和entity对应则会一起删除                   |
| clampToGround |      | true                                     | 是否贴地，贴地情况下无法使用高度                                                |

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

#### CesiumKaze.changePolygonHierarchy(entity,positions)

修改点，没有返回值

参数 `entity` 是图形本身，可以通过`getEntityById`方法传入id后的返回值查看

参数 `positions` 是经纬度数组，格式为`[[x1,y1,z1],[x2,y2,z2],[x3,y3,z3]]`，传入三个以下数不会修改值

---

#### CesiumKaze.addEllipsoid(ellipsoid = {}, collectionName)

添加一个半球罩，返回添加的半球罩的实体对象。

参数 `ellipsoid` 是一个对象，组件添加的默认值包含以下属性：

| 参数           | 是否必填 | 默认值                                    | 描述                                                                                    |
|--------------|------|----------------------------------------|---------------------------------------------------------------------------------------|
| name         |      | `id`的值                                 | 半球的名称，默认等于标记点的id                                                                      |
| id           |      | `utils.generateUUID()`返回的随机id          | 半球的id，全局唯一                                                                            |
| position     | 必填   |                                        | 半球的位置，经纬度数组，例如`[[112.45,45.29], [112.50,45.32]]`                                      |
| radii        |      | [200000, 200000, 100000]               | 球面的数据，前两个为赤道半径x,y，后一个为极半径z。参考[维基百科](https://zh.wikipedia.org/wiki/%E6%A4%AD%E7%90%83) |
| material     |      | utils.colorToCesiumRGB('#23ADE5', 0.3) | 球的材质                                                                                  |
| outlineColor |      | utils.colorToCesiumRGB('#23ADE5', 0.3) | 球的骨架线的材质                                                                              |
| parent       |      |                                        | 指定父级的entity，在删除entity时如果parent和entity对应则会一起删除                                         |

其他官方属性请查看 [中文文档](http://cesium.xin/cesium/en/Documentation1.95/Polyline.html)
或 [英文文档](https://cesium.com/learn/cesiumjs/ref-doc/Polyline.html)

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面

---

#### CesiumKaze.addArrow(arrow = {}, collectionName)

添加一个箭头，返回添加的箭头的实体对象。

参数 `arrow` 是一个对象，组件添加的默认值包含以下属性：

| 参数            | 是否必填 | 默认值                           | 描述                                            |
|---------------|------|-------------------------------|-----------------------------------------------|
| name          |      | `id`的值                        | 箭头的名称，默认等于标记点的id                              |
| id            |      | `utils.generateUUID()`返回的随机id | 箭头的id，全局唯一                                    |
| material      |      |                               |                                               |
| dashed        |      |                               | 是否是虚线，未实现                                     |
| clampToGround |      | true                          | 是否贴地                                          |
| parent        |      |                               | 指定父级的entity，在删除entity时如果parent和entity对应则会一起删除 |
| positions     | 必填   |                               | 箭头的箭尾和箭头 [[x1,y1,z2],[x2,y2,z2]]              |
| width         |      | 30                            | 箭头宽度                                          |

参数 `collectionName` 是一个字符串，为添加到集合中，默认为`defaultCollection`，如何添加集合和查找集合在下面


---

#### CesiumKaze.historyLine(marker, timeAndPosition)

绘制历史轨迹。

参数 `marker` 是要绘制历史轨迹的标记点实体对象。

参数 `timeAndPosition`
是一个包含时间和位置信息的数组，它应该长这样：`[{time:'2023-01-01 12:00:00',position:[122.4882,23.9999]},{time:'2023-01-02 12:00:00',position:[126.1321,39.2452]}]`

注意，添加历史轨迹后，在时间之外，marker是不显示的

---

#### CesiumKaze.addHeatMap(option)

添加热力图，返回热力图对象

`注意！热力图是不会添加到集合中，所有的集合的操作是无法操作到热力图上，有单独的批量删除热力图的方法
`

参数 `option` 是一个对象包含以下属性：

| 参数                 | 是否必填 | 描述             | 默认值                              |
|--------------------|------|----------------|----------------------------------|
| zoomToLayer        |      | 是否自动聚焦到热力图区域范围 | false                            |
| renderType         |      | 生成的图形样式        | 'entity'                         |
| points             | 必填   | 点列表，详见下表       | []                               |
| heatmapDataOptions |      | 对象，表示热力图的极值大小  | {max: 100, min: 0}               |
| heatmapOptions     |      | 对象，表示热力图设置     | {maxOpacity: 0.8, minOpacity: 0} |

参数 `option.heatmapOptions` 是一个点列表，每个点是一个对象，包含以下属性：

| 参数         | 默认值                                                          | 描述            |
|------------|--------------------------------------------------------------|---------------|
| maxOpacity | 0.8                                                          | 最大值时透明度       |
| minOpacity | 0.8                                                          | 最小值时透明度       |
| gradient   | { ".3": "blue", ".5": "green", ".7": "yellow",".95": "red",} | 对象，表示不同权重下的颜色 |

参数 `option.points` 是一个点列表，每个点是一个对象，包含以下属性：

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

插件已经使用的名称如下，自定义分组名称时请避免。

- `defaultCollection` 没有指定集合名词时实体会添加到这里
- `defaultDraw` 画图时，那些画完的图形会添加到这里
- `defaultPrimitives` 添加图形时，附加的图形的数据，现阶段只有添加点才用上

---

#### CesiumKaze.changeCollectionShowAndHide(show, collectionName)

⚠，此方法尚未完善，如果实体带附属属性请勿使用：隐藏或显示带有附属性质的点是无法隐藏附属点

按组别批量显示或隐藏实体（按组名称）。

参数 `show` 是一个布尔值，表示是否显示实体。如果为 `true`，则显示实体；如果为 `false`，则隐藏实体。

参数 `collectionName` 是集合名称，默认值为 `'defaultCollection'`。

---

#### CesiumKaze.removeCollection(collectionName)

按组别批量删除里面全部实体(建议二次确认)。

参数 `collectionName` 是集合名称。

---

#### CesiumKaze.removeAllHeatMap()

删除全部的热力图

---

#### CesiumKaze.removeEntity(id,removeChild)

根据id删除实体

参数 `id` 是要查找的实体的id。

参数 `removeChild` 是布尔值，是否同时删除parent为该实体的其他实体，默认值为 `'true'`。

---

#### CesiumKaze.giveEntityToParent(entity, parentEntity)

给entity设置它的父级entity，如果entity原来有，则替换

### 工具类API

它们都在utils.js内

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
这个是把经纬度转换为世界坐标系，不是初始化一个Cartesian3值，初始化需要使用`new cesiumKaze.cesium.Cartesian3(x,y,z)`

- 参数：
    - `position`：Array 或 Cesium.Cartesian3，输入的坐标，可以是经纬度数组或世界坐标系。

- 返回值：Array 或 Cesium.Cartesian3，转换后的世界坐标系。

#### cartesian3ToDegree2(cartesian, type = [0]())

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

#### jsDateToJulianDate(date)

将标准时间转换为天文儒略日期。

- 参数：
    - `date`：Date，标准时间。

- 返回值：Cesium.JulianDate，天文儒略日期。

#### julianDateToJsDate(julianDate)

将天文儒略日期转换为标准时间。

- 参数：
    - `julianDate`：Cesium.JulianDate，天文儒略日期。

- 返回值：Date，标准时间。

---

#### changeCurrentTime(timestamp)

设置当前时间。

- 参数：
    - `timestamp`：Number，当前时间的时间戳。

---

#### setClockController(options)

设置时钟控制器的选项，并返回更新后的时钟对象

参数 `options` 是一个对象，包含以下属性：

| 参数            | 描述                                |
|---------------|-----------------------------------|
| shouldAnimate | 设置步长                              |
| clockRange    | 时间轴循环模式 ("CLAMPED" 或 "LOOP_STOP") |
| multiplier    | 时间流逝速度                            |
| startTime     | 时间轴开始时间                           |
| stopTime      | 时间轴结束时间                           |

- 返回值：
    - 返回更新后的 Cesium.Clock 对象。

#### clockController(option)

设置时钟控制器的选项

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

- KazeLiu

## 反馈和问题

如果您发现任何问题或有任何疑问，请在项目的 [GitHub Issues](https://github.com/kazeliu/kaze-cesium/issues) 页面提出。

## 注意

如有遗漏或者不正确的地方，请翻源码或者提 [Issues](https://github.com/kazeliu/kaze-cesium/issues) 。
本代码初衷是给自己用，所以有些封装没有传值，如果需要，建议下载源码修改。
我正在慢慢优化md文档
