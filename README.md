# kaze-cesium-helper

kaze-cesium-helper 是一个基于 Cesium 的封装库，提供了绘制点、线、面以及计算长度和面积等功能。

## 安装

使用 npm 安装 kaze-cesium-helper，然后使用 npm 安装 vite-plugin-cesium

```bash
npm install kaze-cesium-helper
npm install vite-plugin-cesium
```

## 初始化
```vue
  // 在vite.config.js内添加引用  
  import cesium from 'vite-plugin-cesium'
  
  // plugins添加cesium()
   plugins: [vue(),cesium()],

  // 以下是我的config.js的内容

  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  export default defineConfig(({ mode, command })=>{
    return {
      plugins: [vue(),cesium()],
      css: {
      }
    }
  })
```


## 示例

在 Vue 组件中使用 kaze-cesium-helper：

```vue
<template>
  <div>
    <div id="cesium-dom"></div>
    <div id="cesium-info" v-show="showBtn">
      <button @click="func.changeMouseEventType(1)">画点</button>
      <button @click="func.changeMouseEventType(2)">画线</button>
      <button @click="func.changeMouseEventType(3)">画面</button>
      <button @click="func.changeMouseEventType(4)">面掏洞</button>
      <br/>
      <button @click="func.changeMouseEventType(0)">获取图标数据</button>
      <button @click="func.changeMouseEventType(5)">移动图标</button>
      <hr/>
      获取cesium的时间轴起止时间
      <br/>
      开始：<input type="datetime-local" id="startTimeInput">
      <br/>
      结束：<input type="datetime-local" id="endTimeInput">
      <br/>
      当前时间：<input type="range" id="timeRange" min="0" max="100" step="1">
      <br/>
      <input type="datetime-local" id="timeRangeInput">
      <br/>
      起止时间范围无法限制当前时间
      <hr/>
      <div>打开控制台看返回值</div>
    </div>
  </div>
</template>

<script setup>
// 引入必要的模块和函数
import { onMounted, reactive, ref } from "vue";
import CesiumKaze from "kaze-cesium-helper";

// 创建响应式变量
const showBtn = ref(false);
let cesium = null;

// 在组件挂载后执行初始化操作
onMounted(async () => {
  cesium = await new CesiumKaze().init('cesium-dom');
  showBtn.value = true;
  demo();
  range.init();
})

// 示例代码
const demo = () => {
  // 画图完成后事件 返回entity信息，世界坐标系列表，图的类型 1:画点，2:画线，3:画面，4:面掏洞
  cesium.on('draw', (entityList, cartesian3List, type) => {
    if (type == 1) {
      // 修改图标文字
      entityList[0].label.text.setValue("原神！启动！！")
      func.clg('添加点，并修改第一个值的文字', cesium.cartesian3ToDegree2(cartesian3List[0]))
    }
    if (type == 2) {
      func.clg('添加线,', cartesian3List.map(x => cesium.cartesian3ToDegree2(x)))
      func.clg('每段长度,', cartesian3List.map((x, index) => {
        if (index >= 1) {
          return cesium.computePointDistance(cartesian3List[index], cartesian3List[index - 1])
        }
      }))
    }
    if (type == 3) {
      func.clg('添加面', cartesian3List.map(x => cesium.cartesian3ToDegree2(x)))
      // 长度在上面已经演示
      func.clg('面积', cesium.computePolygonArea(cartesian3List.map(x => cesium.cartesian3ToDegree2(x, 1))))
    }
    // 掏洞的比较特殊 还有一个监听holeDraw，它的返回值是被掏洞的那个entity，这个返回的是当前的洞
    if (type == 4) {
      func.clg('添加洞', cartesian3List.map(x => cesium.cartesian3ToDegree2(x)))
      // 长度在上面已经演示
      func.clg('面积', cesium.computePolygonArea(cartesian3List.map(x => cesium.cartesian3ToDegree2(x, 1))))
    }
  })

  // 被掏洞的图形
  cesium.on('holeDraw', (parentEntity) => {
    // 方法返回holes和positions positions是图形的经纬度 holes是它包含的全部洞
    func.clg('被掏洞的图形', parentEntity.polygon.hierarchy.getValue())
  })

  // 获取entity的方法 返回entity的信息
  cesium.on('handleClick', (entity) => {
    func.clg('entity', entity)
  })

  // 添加一个点
  let marker = cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    name: '原神',
    scale: 0.20,
    position: [112, 29]
  })

  // 添加轨迹移动
  let line = [
    {time: '2023-07-10 12:00:00', position: [74.1237, 33.4324]},
    {time: '2023-07-12 12:00:00', position: [112.4882, 15.9999]},
    {time: '2023-07-14 12:00:00', position: [126.1321, 39.2452]},
    {time: '2023-07-16 12:00:00', position: [136.1237, 49.4324]},
  ];
  cesium.historyLine(marker, line);

  // 添加热力图
  let heatMapPoint = [];
  for (

      let i = 0; i < 500; i++) {
    let randomLng = Math.random() * (113.082 - 112.876) + 112.876;
    let randomLat = Math.random() * (28.300 - 28.112) + 28.112; ;
    let randomValue = Math.floor(Math.random() * 101);

    let entry = {
      "x": randomLng,
      "y": randomLat,
      "value": randomValue
    };

    heatMapPoint.push(entry);
  }
  cesium.addHeatMap(heatMapPoint)
}

// 控制时间轴
const range = reactive({
  startTimeInput: null,
  endTimeInput: null,
  timeRange: null,
  timeRangeInput: null,
  init() {
    let clock = cesium.getViewer().clock;
    range.startTimeInput = document.getElementById('startTimeInput');
    range.endTimeInput = document.getElementById('endTimeInput');
    range.timeRange = document.getElementById('timeRange');
    range.timeRangeInput = document.getElementById('timeRangeInput');
    // 获取时间轴的起始时间和结束时间
    let startJulianDate = clock.startTime;
    let endJulianDate = clock.stopTime;
    // 将起始时间和结束时间转换为 JavaScript Date 对象
    let startDate = cesium.julianDateToISODate(startJulianDate);
    let endDate = cesium.julianDateToISODate(endJulianDate);
    range.startTimeInput.value = startDate.toISOString().slice(0, 16);
    range.endTimeInput.value = endDate.toISOString().slice(0, 16)
    // 获取时间轴当前时间
    let currentTimeJulianDate = clock.currentTime;
    let currentDate = new Date(currentTimeJulianDate);
    this.updateTimeRange(currentDate.getTime());
    range.startTimeInput.addEventListener('input', range.updateTimeRange);
    range.endTimeInput.addEventListener('input', range.updateTimeRange);
    range.timeRange.addEventListener('input', range.updateTimeInputs);
  },
  updateTimeRange(currentDate) {
    let startTime = new Date(range.startTimeInput.value);
    let endTime = new Date(range.endTimeInput.value);
    range.timeRange.min = startTime.getTime();
    range.timeRange.max = endTime.getTime();
    range.timeRange.value = currentDate ? currentDate : startTime.getTime();
    range.timeRangeInput.value = new Date(parseFloat(range.timeRange.value)).toISOString().slice(0, 16)

  },
  updateTimeInputs() {
    cesium.changeTimeLine(parseFloat(range.timeRange.value))
    range.timeRangeInput.value = new Date(parseFloat(range.timeRange.value)).toISOString().slice(0, 16)
  }
})

const func = reactive({
  clg(text, obj) {
    console.log(text, obj)
  },
  changeMouseEventType(type) {
    cesium.changeMouseEventType(type);
  },
})
</script>

<style scoped lang="scss">
/* 样式省略 */
</style>
```

## API 文档 （常用，其他的api请在源码内寻找 ㄟ(▔皿▔ㄟ) ）

### CesiumKaze 类

#### CesiumKaze.init(containerId)

初始化 CesiumKaze 实例，并将地图渲染到指定的容器中。参数 `containerId` 是一个字符串，表示容器的 DOM 元素的 id。

#### CesiumKaze.on(event, callback)

监听指定的事件，并在事件触发时执行回调函数。参数 `event` 是一个字符串，表示要监听的事件类型。参数 `callback` 是一个回调函数，在事件触发时被调用。

支持的事件类型：

- `draw`：画图完成后的事件。
- `holeDraw`：掏洞完成后的事件。
- `handleClick`：点击图形的事件。

#### CesiumKaze.addMarker(options)

添加一个标记点。参数 `options` 是一个对象，包含以下属性：

- `iconImage`：图标的图片路径。
- `name`：标记点的名称。
- `scale`：图标的缩放比例。
- `position`：标记点的位置，经纬度数组。

返回添加的标记点的实体对象。

#### CesiumKaze.historyLine(marker, line)

添加一个轨迹线。参数 `marker` 是标记点的实体对象，参数 `line` 是轨迹线的坐标数组，每个坐标对象包含 `time` 和 `position` 属性。

#### CesiumKaze.addHeatMap(heatMapPoints)

添加热力图。参数 `heatMapPoints` 是一个包含热力点信息的数组，每个点对象包含 `x`、`y` 和 `value` 属性。

#### CesiumKaze.changeMouseEventType(type)

改变鼠标事件类型。参数 `type` 是一个数字，表示鼠标事件的类型，具体含义请参考文档。

#### CesiumKaze.cartesian3ToDegree2(cartesian3, isArr)

将 Cartesian3 坐标转换为经纬度坐标。参数 `cartesian3` 是一个 Cartesian3 对象，参数 `isArr` 是一个布尔值，表示是否返回数组格式的经纬度坐标。

#### CesiumKaze.computePointDistance(cartesian1, cartesian2)

计算两个点之间的距离。参数 `cartesian1` 和 `cartesian2` 是 Cartesian3 对象，表示两个点的坐标。

#### CesiumKaze.computePolygonArea(positions)

计算多边形的面积。参数 `positions` 是一个包含多边形各个顶点坐标的数组。

### range 对象

#### range.init()

初始化时间轴控制。

#### range.updateTimeRange(currentDate)

更新时间轴的起止时间范围。参数 `currentDate` 是一个表示当前时间的日期对象。

#### range.updateTimeInputs()

更新时间轴输入框的值。



## 许可证

MIT License

## 贡献者

- kazeliu

## 反馈和问题

如果您发现任何问题或有任何疑问，请在项目的 [GitHub Issues](https://github.com/kazeliu/kaze-cesium-helper/issues) 页面提出。

## 注意

此readme由ChatGPT生成，如有遗漏或者不正确的地方，请翻源码或者提 [Issues](https://github.com/kazeliu/kaze-cesium-helper/issues) 。本代码初衷是给自己用，所以有些封装没有传值，如果需要，建议下载源码修改
