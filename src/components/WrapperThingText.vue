<script setup lang="ts">
import Masonry from '@yeger/vue-masonry-wall'
import thinkingData  from '../static/thinking-data.json';

defineProps<{
  time: string
}>()

</script>

<template>
<div class="mt-5">
  <Masonry :items="thinkingData" :ssr-columns="1" :column-width="300" :gap="16">
    <template #default="{ item, index }">
      <div class="border-solid border-1 border-#9999 rounded-md hover:shadow-lg hover:border-dashed transition-all">
        <div class="thinking-text">
          <span>{{ item.content }}</span>
          <br />
          <span class="text-#999 text-xs">{{ item.date }}</span>
       </div>
      </div>
    </template>
  </Masonry>
</div>
</template>

<style scoped>
.thinking-text {
  margin: 1rem;
}
</style>
