<script setup lang="ts">
import { ref, watch, reactive, nextTick } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | null }>()
const emit = defineEmits(['update:modelValue'])

// Lifecycle and visibility states
const isRendered = ref(false)
const isActive = ref(false)
const internalSrc = ref('')
const sourceEl = ref<HTMLImageElement | null>(null)

// Interaction state (s: scale, x/y: translate)
const z = reactive({ s: 1, x: 0, y: 0, d: false, st: { x: 0, y: 0 } })
const resetZoom = () => { z.s = 1; z.x = 0; z.y = 0; }

/**
 * Focal-point zooming logic
 */
const applyZoom = (newScale: number, centerX: number, centerY: number) => {
  const vW = window.innerWidth, vH = window.innerHeight
  const relX = centerX - vW / 2, relY = centerY - vH / 2
  const ratio = newScale / z.s
  z.x = relX - (relX - z.x) * ratio
  z.y = relY - (relY - z.y) * ratio
  z.s = newScale
  if (z.s <= 1.01) resetZoom()
}

/**
 * Transition: Entry
 */
const handleOpen = (el: HTMLImageElement) => {
  sourceEl.value = el
  internalSrc.value = el.src
  resetZoom()
  isRendered.value = true

  if (!document.startViewTransition) {
    isActive.value = true
    return
  }

  // Tag source for snapshot
  el.style.viewTransitionName = 'vp-image'

  document.startViewTransition(async () => {
    isActive.value = true
    // Handover name to the entity
    el.style.viewTransitionName = ''
    await nextTick()
  })
}

/**
 * Transition: Exit
 */
const handleClose = async () => {
  if (!isActive.value) return

  if (!document.startViewTransition) {
    isActive.value = false
    isRendered.value = false
    emit('update:modelValue', null)
    return
  }

  const transition = document.startViewTransition(async () => {
    isActive.value = false
    resetZoom()
    // Re-assign name back to source
    if (sourceEl.value) sourceEl.value.style.viewTransitionName = 'vp-image'
    await nextTick()
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
      <!-- Backdrop layer: Isolated from root for zero-latency blur -->
      <div 
        class="absolute inset-0 bg-transparent vp-backdrop"
        :class="isActive ? 'vp-backdrop-active' : ''"
        @click="handleClose"
      />

      <!-- Content wrapper -->
      <div 
        v-if="isActive"
        class="relative transform-gpu will-change-transform"
        :style="{
          transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})`,
          transition: z.d ? 'none' : 'transform 500ms cubic-bezier(0.2, 0, 0, 1)',
          cursor: z.s > 1 ? (z.d ? 'grabbing' : 'grab') : 'zoom-in'
        }"
        @mousedown="z.s > 1 && (z.d = true) && (z.st = { x: $event.clientX - z.x, y: $event.clientY - z.y })"
        @dblclick="applyZoom(z.s > 1.1 ? 1 : 3, $event.clientX, $event.clientY)"
      >
        <img 
          :src="internalSrc" 
          draggable="false"
          decoding="async"
          class="max-w-[95vw] max-h-[92vh] object-contain shadow-2xl rounded-sm vp-image-entity"
        >
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Global View Transition styles */

.vp-image-entity {
  view-transition-name: vp-image;
  contain: layout paint;
}

.vp-backdrop {
  view-transition-name: vp-backdrop;
}

.vp-backdrop-active {
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  background-color: rgba(0, 0, 0, 0.05);
}

::view-transition-group(vp-image),
::view-transition-group(vp-backdrop) {
  animation-duration: 500ms;
  animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}

/* Layering: ensures image is above the blurred backdrop */
::view-transition-group(vp-backdrop) { z-index: 2001; }
::view-transition-group(vp-image) { z-index: 2002; }

::view-transition-image-pair(vp-image),
::view-transition-image-pair(vp-backdrop) {
  isolation: isolate;
}

/* Geometric locking for stability */
::view-transition-old(vp-image),
::view-transition-new(vp-image),
::view-transition-old(vp-backdrop),
::view-transition-new(vp-backdrop) {
  height: 100% !important;
  width: 100% !important;
  position: absolute !important;
  inset: 0 !important;
  animation: none; 
  mix-blend-mode: normal;
}

::view-transition-new(vp-image),
::view-transition-new(vp-backdrop) {
  object-fit: contain !important;
}

::view-transition-old(vp-image),
::view-transition-old(vp-backdrop) {
  opacity: 0 !important;
}

/* Disable root interpolation to avoid dark mode transition conflicts */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
</style>
