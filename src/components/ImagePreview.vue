<script setup lang="ts">
import { ref, watch, reactive } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | null }>()
const emit = defineEmits(['update:modelValue'])

// Lifecycle and transition states
const isRendered = ref(false)     // Mount state
const isActive = ref(false)       // Visible state
const internalSrc = ref('')
const sourceEl = ref<HTMLImageElement | null>(null)

// Zoom and pan state
const z = reactive({ s: 1, x: 0, y: 0, d: false, st: { x: 0, y: 0 } })
const resetZoom = () => { z.s = 1; z.x = 0; z.y = 0; }

/**
 * Update scale and translation based on focal point
 */
const applyZoom = (newScale: number, centerX: number, centerY: number) => {
  const vW = window.innerWidth, vH = window.innerHeight
  const relX = centerX - vW / 2, relY = centerY - vH / 2
  const ratio = newScale / z.s
  // Fixed variable name from 'zoom' to 'z'
  z.x = relX - (relX - z.x) * ratio
  z.y = relY - (relY - z.y) * ratio
  z.s = newScale
  if (z.s <= 1.01) resetZoom()
}

/**
 * Entry transition: thumbnail -> preview
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

  // Tag source element for snapshot
  el.style.viewTransitionName = 'vp-image'

  document.startViewTransition(() => {
    isActive.value = true
    // Handover name to the preview image entity
    el.style.viewTransitionName = ''
  })
}

/**
 * Exit transition: preview -> thumbnail
 */
const handleClose = async () => {
  if (!isActive.value) return

  if (!document.startViewTransition) {
    isActive.value = false
    isRendered.value = false
    emit('update:modelValue', null)
    return
  }

  const transition = document.startViewTransition(() => {
    isActive.value = false
    // Claim name back for return flight path
    if (sourceEl.value) sourceEl.value.style.viewTransitionName = 'vp-image'
  })

  try {
    await transition.finished
  } finally {
    // Cleanup names to prevent collisions
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
      <!-- Background backdrop -->
      <div 
        class="absolute inset-0 bg-black/90 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        :class="isActive ? 'opacity-100 backdrop-blur-md' : 'opacity-0 backdrop-blur-none'"
        @click="handleClose"
      />

      <!-- Content layer -->
      <div 
        v-if="isActive"
        class="relative transform-gpu will-change-transform"
        :style="{
          transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})`,
          transition: z.d ? 'none' : 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
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
/* View Transition Pseudo-elements (Global) */

.vp-image-entity {
  view-transition-name: vp-image;
  contain: layout paint;
}

::view-transition-group(vp-image) {
  animation-duration: 500ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition-image-pair(vp-image) {
  isolation: isolate;
}

/* Fix sub-pixel jitter during movement */
::view-transition-old(vp-image),
::view-transition-new(vp-image) {
  height: 100% !important;
  width: 100% !important;
  object-fit: contain !important;
  position: absolute !important;
  inset: 0 !important;
  margin: auto !important;
  animation: none; 
  mix-blend-mode: normal;
}

/* Hide old snapshot to ensure clean flight path */
::view-transition-old(vp-image) {
  opacity: 0 !important;
}

/* Optimize performance by disabling root layer transitions */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

/* Backdrop blur effects */
.backdrop-blur-md {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
.backdrop-blur-none {
  -webkit-backdrop-filter: blur(0px);
  backdrop-filter: blur(0px);
}
</style>
