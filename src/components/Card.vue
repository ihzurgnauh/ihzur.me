<script setup lang="ts">
defineProps<{
  item: any
}>()

</script>

<template>
  <div style="line-height: 1.75;">
    <div class="border-solid border-1 border-#9999 rounded-md hover:border-dashed transition-all">
      <div class="m-4">
        <span>{{ item.content }}</span>
        <br/>
        <span class="text-#999 text-xs">{{ item.date }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
