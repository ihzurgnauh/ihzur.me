<script setup lang="ts">
import ImagePreview from './components/ImagePreview.vue'

const route = useRoute()

const imageModel = ref<HTMLImageElement>()

useEventListener('click', async (e) => {
  
  // Ignore clicks if preview is already open
  if (imageModel.value) return

  const path = Array.from(e.composedPath())
  const first = path[0]
  if (!(first instanceof HTMLElement))
    return
  if (first.tagName !== 'IMG')
    return
  if (path.some(el => el instanceof HTMLElement && ['A', 'BUTTON'].includes(el.tagName)))
    return
  if (!path.some(el => el instanceof HTMLElement && el.classList.contains('prose')))
    return

  // Do not open image when they are moving. Mainly for mobile to avoid conflict with hovering behavior.
  const pos = first.getBoundingClientRect()
  await new Promise(resolve => setTimeout(resolve, 50))
  const newPos = first.getBoundingClientRect()
  if (pos.left !== newPos.left || pos.top !== newPos.top)
    return

  imageModel.value = first as HTMLImageElement
})

onKeyStroke('Escape', (e) => {
  if (imageModel.value) {
    imageModel.value = undefined
    e.preventDefault()
  }
})
</script>

<template>
  <NavBar />
  <main class="px-7 py-10 of-x-hidden">
    <RouterView />
    <Footer :key="route.path" />
  </main>
<ImagePreview v-model="imageModel" />
</template>
