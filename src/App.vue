<template>
  <div>
    <div id="cesium-dom"></div>
  </div>
</template>

<script setup>
import {onMounted, reactive} from "vue";
import CesiumKaze from "./cesium/index.js";

onMounted(async () => {
  cesium.cesium = new CesiumKaze('cesium-dom');
  await cesium.cesium.init();
  cesium.cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    name: '原批',
    scale: 0.50,
    position: [112, 29]
  })
  cesium.cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    name: '原批2',
    scale: 0.50,
    position: [110, 35]
  })
  cesium.cesium.addMarker({
    iconImage: `/public/logo.jpg`,
    name: '原批3',
    scale: 0.50,
    position: [112, 38]
  })
  cesium.cesium.changeCollectionShowAndHide(false, 'haha')
  cesium.cesium.on('contextMenu',res=>{
    console.log(res)
  })
})
const cesium = reactive({
  cesium: null,
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
