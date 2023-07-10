<template>
  <div>
    <div id="cesium-dom"></div>
  </div>
</template>

<script setup>
import {onMounted} from "vue";
import CesiumKaze from "./cesium/index.js";
import * as Cesium from "cesium";

onMounted(async () => {
  let cesium = new CesiumKaze('cesium-dom')
  await cesium.init();
  // 监听图层加载完成事件

  cesium.changeCollectionShowAndHide(false, 'haha')
  cesium.on('contextMenu', res => {
    console.log(res)
  })
  // cesium.on('draw', res => {
  //   console.log(res)
  //   res[0].label.text.setValue("原神！启动！！")
  // })
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
</style>
