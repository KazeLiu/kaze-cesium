<template>
  <div>
    <div id="cesium-dom"></div>
    <div id="cesium-info" v-show="showBtn">
      <button @click="func.changeMouseEventType(1)">画点</button>
      <button @click="func.changeMouseEventType(2)">画线</button>
      <button @click="func.changeMouseEventType(3)">画面</button>
      <button @click="func.changeMouseEventType(4)">面掏洞</button>
      <br/>
      <button @click="func.changeMouseEventType(0)">获取点数据</button>
      <button @click="func.changeMouseEventType(5)">移动点</button>
      <hr style="margin: 10px auto"/>
      <div v-html="data.join('<br/>')"></div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, reactive, ref} from "vue";
import CesiumKaze from "./cesium/index.js";
import * as Cesium from "cesium";

const data = ref([]);
const showBtn = ref(false);
let cesium = null;
onMounted(async () => {
  cesium = new CesiumKaze('cesium-dom')
  await cesium.init();
  showBtn.value = true;

  cesium.changeCollectionShowAndHide(false, 'haha')
  cesium.on('contextMenu', res => {
    console.log(res)
  })
  cesium.on('draw', res => {
    console.log(res)
    res[0].label.text.setValue("原神！启动！！")
  })
})

const func = reactive({
  changeMouseEventType(type) {
    cesium.changeMouseEventType(type)
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
