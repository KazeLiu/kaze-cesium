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
      <hr style="margin: 10px auto"/>
      <div>打开控制台看返回值</div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref} from "vue";
import CesiumKaze from "./cesium/index.js";

const showBtn = ref(false);
let cesium = null;

onMounted(async () => {
  cesium = await new CesiumKaze().init('cesium-dom');
  showBtn.value = true;
  demo();
})

const demo = () => {
  cesium.changeCollectionShowAndHide(false, 'haha')

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
}

const func = reactive({
  clg(text, obj) {
    console.log(text, obj)
  },
  changeMouseEventType(type) {
    cesium.changeMouseEventType(type);
    cesium.stopDrawing(false)
  }
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
</style>
