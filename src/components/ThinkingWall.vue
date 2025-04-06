<script setup lang="ts">
import { render, h } from 'vue'
import LightCard from './LightCard.vue';
import thinkingData  from '../../data/thinking.json';


// 计算真实高度
function calcItemHeight(item: any, realWidth: number) {
    const dom = document.createElement('div')

    render(
        h(LightCard, {
            item: item,
            style: 'width:' + realWidth + 'px'
        }),
        dom
    )
 
    document.body.appendChild(dom)
    // 获取高度
    const height: any = dom.firstElementChild?.getBoundingClientRect().height
    // 移除新容器
    document.body.removeChild(dom)
    // 返回高度
    return height
}


</script>

<template>
  <VirtualWaterfall :virtual="false" :items="thinkingData" :min-column-count="1" :calc-item-height="calcItemHeight">
    <template #default="scope">
      <LightCard v-if="scope?.item" :item="scope.item" class="animate-flip-in-x"></LightCard>
    </template>
  </VirtualWaterfall>
</template>

<style scoped>

</style>
