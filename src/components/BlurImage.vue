<script setup lang="ts">
import { ref, computed } from 'vue'
import { blurhashToGradientCssObject } from '@unpic/placeholder'

const props = defineProps<{
  src: string
  alt?: string
  hash?: string
  width?: number
  height?: number
}>()

const isLoaded = ref(false)

const wrapperStyle = computed(() => {
  const styles: Record<string, string | number> = {}

  // Set container aspect ratio
  if (props.width && props.height) {
    styles.aspectRatio = `${props.width} / ${props.height}`
  }

  // Use BlurHash gradient as background
  if (props.hash) {
    const gradient = blurhashToGradientCssObject(props.hash)
    Object.assign(styles, gradient)
  }

  return styles
})

const onLoad = () => {
  isLoaded.value = true
}
</script>

<template>
  <div class="blur-image-wrapper" :style="wrapperStyle">
    <img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      loading="lazy"
      class="real-image"
      :class="{ visible: isLoaded }"
      @load="onLoad"
    />
  </div>
</template>

<style scoped>
.blur-image-wrapper {
  position: relative;
  width: 100%;
  display: block;
  overflow: hidden;
  
  line-height: 0;
  font-size: 0;

  background-size: cover; 
  background-position: center;
  background-repeat: no-repeat;
}

.real-image {
  
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  will-change: opacity;
}

.real-image.visible {
  opacity: 1;
}
</style>
