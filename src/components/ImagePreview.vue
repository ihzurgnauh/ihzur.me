<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | any }>()
const emit = defineEmits(['update:modelValue'])

// --- State ---
const isRendered = ref(false) // DOM lifecycle
const isActived = ref(false)  // Transition state
const isClosing = ref(false)  // Exit lock
const internalSrc = ref('')
const sourceEl = ref<HTMLElement | null>(null) // Original thumbnail ref

// Smooth curve
const QUINTIC_CURVE = 'cubic-bezier(0.2, 0, 0, 1)'

// Flight Style (Thumbnail <-> Center)
const flyStyle = ref<Record<string, string>>({})

// Interaction State
const zoomState = reactive({ 
  scale: 1, 
  x: 0, 
  y: 0, 
  isDragging: false, 
  dragStart: { x: 0, y: 0 } 
})

// Touch State for pinch-to-zoom
const touchState = reactive({
  initialDist: 0,
  initialScale: 1,
  midpoint: { x: 0, y: 0 }
})

const resetZoom = () => {
  zoomState.scale = 1
  zoomState.x = 0
  zoomState.y = 0
}

/**
 * Predict size to ensure 1st click accuracy
 */
const getPredictedPreviewSize = (el: HTMLElement) => {
  const vW = document.documentElement.clientWidth
  const vH = document.documentElement.clientHeight
  const maxWidth = vW * 0.95
  const maxHeight = vH * 0.92
  const img = el instanceof HTMLImageElement ? el : el.querySelector('img')
  const nW = img?.naturalWidth || el.offsetWidth
  const nH = img?.naturalHeight || el.offsetHeight
  const ratio = Math.min(maxWidth / nW, maxHeight / nH, 1)
  return { width: nW * ratio, height: nH * ratio }
}

/**
 * Calculate rect relative to viewport center
 */
const calculateRect = (el: HTMLElement | null) => {
  if (!el) return { x: 0, y: 0, scale: 0.3 }
  const rect = el.getBoundingClientRect()
  const vW = document.documentElement.clientWidth
  const vH = document.documentElement.clientHeight
  const predicted = getPredictedPreviewSize(el)
  return {
    x: rect.left + rect.width / 2 - vW / 2,
    y: rect.top + rect.height / 2 - vH / 2,
    scale: rect.width / predicted.width
  }
}

// Watch modelValue for Enter/Exit
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    sourceEl.value = newVal instanceof HTMLElement ? newVal : newVal.el
    internalSrc.value = newVal.src
    resetZoom() 
    isClosing.value = false
    isRendered.value = true
    
    // Set initial thumbnail state
    const start = calculateRect(sourceEl.value)
    flyStyle.value = {
      transition: 'none',
      transform: `translate3d(${start.x}px, ${start.y}px, 0) scale(${start.scale})`,
      opacity: '0'
    }

    // Start flight to center
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isActived.value = true
        flyStyle.value = {
          transition: `transform 600ms ${QUINTIC_CURVE}, opacity 400ms linear`,
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: '1'
        }
      })
    })
  } else if (isActived.value) {
    handleClose()
  }
})

/**
 * Handle exit flight back to thumbnail
 */
const handleClose = (e?: Event) => {
  e?.stopPropagation()
  if (!isActived.value) return
  isClosing.value = true 
  isActived.value = false
  const end = calculateRect(sourceEl.value)
  flyStyle.value = {
    transition: `transform 500ms ${QUINTIC_CURVE}`,
    transform: `translate3d(${end.x}px, ${end.y}px, 0) scale(${end.scale})`,
    opacity: '1' 
  }
}

/**
 * Cleanup after transition finishes
 */
const onTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName === 'transform' && !isActived.value) {
    isRendered.value = false
    sourceEl.value = null
    isClosing.value = false
    emit('update:modelValue', undefined)
  }
}

/**
 * Core zoom compensation math
 */
const applyZoom = (newScale: number, centerX: number, centerY: number) => {
  const vW = document.documentElement.clientWidth
  const vH = document.documentElement.clientHeight
  const relX = centerX - vW / 2
  const relY = centerY - vH / 2
  const ratio = newScale / zoomState.scale
  zoomState.x = relX - (relX - zoomState.x) * ratio
  zoomState.y = relY - (relY - zoomState.y) * ratio
  zoomState.scale = newScale
  if (zoomState.scale <= 1.01) resetZoom()
}

// Event: Mouse Wheel
const handleWheel = (e: WheelEvent) => {
  if (isClosing.value) return
  const factor = -e.deltaY > 0 ? 1.25 : 0.8
  const newScale = Math.min(Math.max(zoomState.scale * factor, 1), 8)
  applyZoom(newScale, e.clientX, e.clientY)
}

// Event: Mouse Drag
const onMouseMove = (e: MouseEvent) => {
  if (zoomState.isDragging && !isClosing.value) {
    zoomState.x = e.clientX - zoomState.dragStart.x
    zoomState.y = e.clientY - zoomState.dragStart.y
  }
}

// Event: Touch Start
const handleTouchStart = (e: TouchEvent) => {
  if (isClosing.value) return
  if (e.touches.length === 2) {
    const t1 = e.touches[0], t2 = e.touches[1]
    touchState.initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    touchState.initialScale = zoomState.scale
    touchState.midpoint = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }
    zoomState.isDragging = false
  } else if (e.touches.length === 1 && zoomState.scale > 1) {
    const t = e.touches[0]
    zoomState.isDragging = true
    zoomState.dragStart = { x: t.clientX - zoomState.x, y: t.clientY - zoomState.y }
  }
}

// Event: Touch Move (Pinch/Pan)
const handleTouchMove = (e: TouchEvent) => {
  if (isClosing.value) return
  if (e.touches.length === 2) {
    const t1 = e.touches[0], t2 = e.touches[1]
    const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    const newScale = Math.min(Math.max(touchState.initialScale * (currentDist / touchState.initialDist), 1), 8)
    applyZoom(newScale, (t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2)
  } else if (e.touches.length === 1 && zoomState.isDragging) {
    const t = e.touches[0]
    zoomState.x = t.clientX - zoomState.dragStart.x
    zoomState.y = t.clientY - zoomState.dragStart.y
  }
}

// Style: Interaction Layer
const imageStyle = computed(() => ({
  // Disable jitter during exit
  transform: isClosing.value 
    ? `translate3d(0, 0, 0) scale(1)` 
    : `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale(${zoomState.scale})`,
  transition: (zoomState.isDragging || isClosing.value) ? 'none' : `transform 450ms ${QUINTIC_CURVE}`,
  cursor: zoomState.scale > 1 ? (zoomState.isDragging ? 'grabbing' : 'grab') : 'zoom-in'
}))
</script>

<template>
  <Teleport to="body">
    <div 
      v-show="isRendered"
      class="fixed inset-0 z-2000 flex items-center justify-center overflow-hidden touch-none select-none backface-hidden antialiased font-sans"
      @wheel.prevent="handleWheel"
      @mousemove="onMouseMove"
      @mouseup="zoomState.isDragging = false"
      @mouseleave="zoomState.isDragging = false"
      @touchstart="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend="zoomState.isDragging = false"
    >
      <!-- Backdrop: Opacity & Blur -->
      <div 
        class="absolute inset-0 bg-black/70 transition-all duration-500 ease-out"
        :class="isActived ? 'opacity-100 backdrop-blur-12px' : 'opacity-0 backdrop-blur-0px'"
        @click="handleClose"
      />

      <!-- Layer 1: Flight (Outer) -->
      <div 
        class="relative pointer-events-none transform-gpu origin-center will-change-transform"
        :style="flyStyle"
        @transitionend="onTransitionEnd"
      >
        <!-- Layer 2: Interaction (Inner) -->
        <div 
          class="pointer-events-auto transform-gpu origin-center will-change-transform"
          :style="imageStyle"
          @dblclick="applyZoom(zoomState.scale > 1.1 ? 1 : 3, $event.clientX, $event.clientY)"
          @mousedown="zoomState.scale > 1 && (zoomState.isDragging = true) && (zoomState.dragStart = { x: $event.clientX - zoomState.x, y: $event.clientY - zoomState.y })"
          @click.stop
        >
          <img 
            :src="internalSrc" 
            draggable="false"
            class="max-w-95vw max-h-92vh object-contain shadow-2xl rounded-sm translate-z-0"
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Force Hardware Acceleration */
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.transform-gpu {
  transform: translateZ(0);
}
</style>
