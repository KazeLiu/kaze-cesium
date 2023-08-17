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
      <br/>
      <button @click="func.changeMouseEventType(6)">修改图形</button>
      <button @click="cesium.saveChangePolylineOrPolygon()">保存修改图形</button>
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
import {onMounted, reactive, ref} from "vue";
import CesiumKaze from "./cesium/index.js";
import * as Cesium from "cesium";

const showBtn = ref(false);
let cesium = null;

onMounted(async () => {
  cesium = await new CesiumKaze().init('cesium-dom', {
    DEFAULT_VIEW_RECTANGLE: Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2),
    IMAGERY_PROVIDER: [
      new Cesium.UrlTemplateImageryProvider({
        url: '/map/{z}/{x}/{y}.jpg',
      }),
    ],
    timeline: true,
    animation: true
  }, true);
  showBtn.value = true;
  demo();
  // range.init();
})

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
      func.clg('每段长度带地形,', cartesian3List.map((x, index) => {
        if (index >= 1) {
          return cesium.computePointDistanceWithTerrain(cartesian3List[index], cartesian3List[index - 1])
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

  cesium.on('contextMenu', (entity) => {
    func.clg('entity', entity)
  })

  cesium.on('changePoint', (data) => {
    func.clg('data', data)
  })

  let marker = cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    id: '111111',
    name: '原神',
    scale: 0.20,
    hasMove: true,
    hasLabel: true,
    position: [110, 29, 65430],
    rotation: 0,
    clampToGround: false
  })


  // for (let i = 0; i < 100; i++) {
  //   // 添加一个点
  //   let marker = cesium.addMarker({
  //     iconImage: `/public/logo.jpg`,
  //     id: i,
  //     attachImage: [{
  //       url: `/public/logo2.jpg`,
  //       pixelOffset: {x: 500, y: 250}
  //     },
  //       {
  //         url: `/public/vite.svg`,
  //         pixelOffset: {x: 50, y: 25}
  //       }],
  //     name: '原神',
  //     scale: 0.20,
  //     hasMove: true,
  //     hasLabel: true,
  //     labelOption: {},
  //     position: [i, 29]
  //   })
  // }

  // setTimeout(() => {
  //   cesium.removeEntity('111111', true)
  // }, 5000)

  // cesium.removeEntity(999)

  // setTimeout(() => {
  //   cesium.removeEntity(marker.id)
  // }, 5000)

  // 添加轨迹移动
  let line = [
    {time: '2023-08-10 12:00:00', position: [74.1237, 33.4324]},
    {time: '2023-08-12 12:00:00', position: [112.4882, 15.9999]},
    {time: '2023-08-14 12:00:00', position: [126.1321, 39.2452]},
    {time: '2023-08-16 12:00:00', position: [136.1237, 49.4324]},
  ];
  cesium.historyLine(marker, line);
  cesium.setClockController({
    startTime: '2023-08-10 12:00:00',
    stopTime: '2023-08-16 12:00:00',
    clockRange: 'LOOP_STOP',
    multiplier: 1000,
  })

  let clock = cesium.getViewer().clock;
  clock.onTick.addEventListener(clock => {
    // console.log(cesium.julianDateToJsDate(clock.currentTime))
  })

  cesium.changeCurrentTime('2023-08-15 13:24:08')

  // 添加热力图
  let heatMapPoint = [];
  for (let i = 0; i < 500; i++) {
    let randomLng = Math.random() * (113.082 - 112.876) + 112.876;
    let randomLat = Math.random() * (28.300 - 28.112) + 28.112;
    let randomValue = Math.floor(Math.random() * 101);

    let entry = {
      "x": randomLng,
      "y": randomLat,
      "value": randomValue
    };

    heatMapPoint.push(entry);
  }
  cesium.addHeatMap({id: 999, points: heatMapPoint})

  cesium.addEllipsoid({
    position: [56, 30],
    id: '0000a',
    parent: marker
  })
  //
  setTimeout(() => {
    cesium.removeEntity('111111')
  }, 3000)

  cesium.addLine({
    positions: [
      [114.0,
        20.0, 12110],
      [116.0,
        20.0, 65430],
      [129.0,
        30.0, 12340],
    ],
    material: cesium.colorToCesiumRGB('#e8118a', 0.7),
    clampToGround: false,
  })

  cesium.addPolygon({
    positions: [
      [120.0,
        30.0],
      [116.0,
        30.0],
      [127.0,
        40.0],
    ]
  })


  // 添加掏洞的图
  cesium.addPolygon({
    positions: [
      [-99.0,
        30.0],
      [-85.0,
        30.0],
      [-85.0,
        40.0],
      [-99.0,
        40.0],
    ],
    holes: [{
      positions: cesium.convertToCartesian3([[-97.0,
        31.0],
        [-97.0,
          39.0],
        [-87.0,
          39.0],
        [-87.0,
          31.0],]), holes: [{
        positions: cesium.convertToCartesian3([
          [-95.0,
            33.0],
          [-89.0,
            33.0],
          [-89.0,
            37.0],
          [-95.0,
            37.0],
        ])
      }]
    }]
  })
}

// 控制时间轴
const range = reactive({
  startTimeInput: null,
  endTimeInput: null,
  timeRange: null,
  timeRangeInput: null,
  init() {
    return
    let clock = cesium.getViewer().clock;
    range.startTimeInput = document.getElementById('startTimeInput');
    range.endTimeInput = document.getElementById('endTimeInput');
    range.timeRange = document.getElementById('timeRange');
    range.timeRangeInput = document.getElementById('timeRangeInput');
    // 获取时间轴的起始时间和结束时间
    let startJulianDate = clock.startTime;
    let endJulianDate = clock.stopTime;
    // 将起始时间和结束时间转换为 JavaScript Date 对象
    let startDate = cesium.julianDateToJsDate(startJulianDate);
    let endDate = cesium.julianDateToJsDate(endJulianDate);
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
    cesium.setClockController({
      startTime: range.startTimeInput.value,
      stopTime: range.endTimeInput.value,
    })
    let startTime = new Date(range.startTimeInput.value);
    let endTime = new Date(range.endTimeInput.value);
    range.timeRange.min = startTime.getTime();
    range.timeRange.max = endTime.getTime();
    range.timeRange.value = currentDate ? currentDate : startTime.getTime();
    range.timeRangeInput.value = new Date(parseFloat(range.timeRange.value)).toISOString().slice(0, 16)

  },
  updateTimeInputs() {
    cesium.changeCurrentTime(parseFloat(range.timeRange.value))
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
* {
  padding: 0;
  margin: 0;
}

#cesium-dom {
  width: 100vw;
  height: 100vh
}

#cesium-info {
  position: fixed;
  top: 0;
  right: 0;
  padding: 20px;
  background: #ffffff;
  text-align: right;
}

button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 10px 12px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: auto 4px 4px auto;
}

hr {
  margin: 10px auto
}
</style>
