<script setup lang="ts">
import { ref, watch, reactive, nextTick } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | null }>()
const emit = defineEmits(['update:modelValue'])

const isRendered = ref(false)
const isActive = ref(false)
const internalSrc = ref('')
const sourceEl = ref<HTMLImageElement | null>(null)

const z = reactive({ s: 1, x: 0, y: 0, d: false, st: { x: 0, y: 0 } })
const resetZoom = () => { z.s = 1; z.x = 0; z.y = 0 }

const applyZoom = (newScale: number, centerX: number, centerY: number) => {
  const vW = window.innerWidth, vH = window.innerHeight
  const relX = centerX - vW / 2, relY = centerY - vH / 2
  const ratio = newScale / z.s
  z.x = relX - (relX - z.x) * ratio
  z.y = relY - (relY - z.y) * ratio
  z.s = newScale
  if (z.s <= 1.01) resetZoom()
}

const hasVT = () => 'startViewTransition' in document
const canTransition = (el: HTMLElement) => hasVT() && el.isConnected

const handleOpen = (el: HTMLImageElement) => {
  sourceEl.value = el
  internalSrc.value = el.src
  resetZoom()
  isRendered.value = true

  if (!canTransition(el)) {
    isActive.value = true
    return
  }

  el.style.viewTransitionName = 'vp-image'
  void el.offsetWidth // commit the name so the browser snapshots it

  document.startViewTransition(async () => {
    isActive.value = true
    el.style.viewTransitionName = ''
    await nextTick()
  })
}

const handleClose = async () => {
  if (!isActive.value) return

  if (!sourceEl.value || !canTransition(sourceEl.value)) {
    isActive.value = false
    isRendered.value = false
    emit('update:modelValue', null)
    return
  }

  // Old state: only the preview overlay has vp-image.
  // We tag the source inside the callback so it only appears in the new state.
  const transition = document.startViewTransition(async () => {
    isActive.value = false
    resetZoom()
    await nextTick()
    sourceEl.value!.style.viewTransitionName = 'vp-image'
  })

  try {
    await transition.finished
  } finally {
    if (sourceEl.value) sourceEl.value.style.viewTransitionName = ''
    isRendered.value = false
    emit('update:modelValue', null)
  }
}

watch(() => props.modelValue, (v) => {
  if (v) handleOpen(v)
  else if (isRendered.value) handleClose()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isRendered"
      class="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden touch-none select-none pointer-events-auto"
      @wheel.prevent="applyZoom(Math.min(Math.max(z.s * ($event.deltaY < 0 ? 1.25 : 0.8), 1), 10), $event.clientX, $event.clientY)"
      @mousemove="z.d && (z.x = $event.clientX - z.st.x, z.y = $event.clientY - z.st.y)"
      @mouseup="z.d = false"
      @mouseleave="z.d = false"
    >
      <!-- Opacity-only transition: backdrop-blur is static to avoid GPU thrashing -->
      <div
        class="absolute inset-0 transition-opacity duration-300 bg-black/50 dark:bg-black/70"
        :class="isActive ? 'opacity-100 backdrop-blur-md' : 'opacity-0'"
        @click="handleClose"
      />

      <div
        v-if="isActive"
        class="relative transform-gpu will-change-transform"
        :style="{
          transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})`,
          transition: z.d ? 'none' : 'transform 400ms cubic-bezier(0.2, 0, 0, 1)',
          cursor: z.s > 1 ? (z.d ? 'grabbing' : 'grab') : 'zoom-in'
        }"
        @mousedown="z.s > 1 && (z.d = true) && (z.st = { x: $event.clientX - z.x, y: $event.clientY - z.y })"
        @dblclick="applyZoom(z.s > 1.1 ? 1 : 3, $event.clientX, $event.clientY)"
      >
        <img
          :src="internalSrc"
          draggable="false"
          class="max-w-[95vw] max-h-[92vh] object-contain shadow-2xl rounded-sm vp-image-entity"
        >
      </div>
    </div>
  </Teleport>
</template>

<style>
.vp-image-entity {
  view-transition-name: vp-image;
  contain: layout paint;
}

::view-transition-group(vp-image) {
  animation-duration: 300ms;
  animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
</style>
