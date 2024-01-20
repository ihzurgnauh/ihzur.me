<script setup lang="ts">
defineProps<{
  time: string
}>()
</script>

<template>
<div class="mt-5">
    <div class="thinking-text">
      #
      <slot />
      <br />
      <span class="text-#999 text-xs">
        {{ time }}
      </span>
    </div>
</div>
</template>

<style scoped>
.thinking-text:hover {
  font-style: italic;
}
</style>
