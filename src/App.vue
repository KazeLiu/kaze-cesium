<template>
  <div>
    <div id="cesium-dom"></div>
  </div>
</template>

<script setup>
import {onMounted} from "vue";
import CesiumKaze from "./cesium/index.js";

onMounted(async () => {
  let cesium = new CesiumKaze('cesium-dom')
  await cesium.init();
  cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    name: '原神！启动！',
    scale: 0.50,
    position: [112, 29]
  })
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
