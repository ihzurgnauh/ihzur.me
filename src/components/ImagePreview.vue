<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | any }>()
const emit = defineEmits(['update:modelValue'])

// --- State ---
const isRendered = ref(false)
const isActived = ref(false)
const isClosing = ref(false)
const internalSrc = ref('')
const sourceEl = ref<HTMLElement | null>(null)

const QUINTIC_CURVE = 'cubic-bezier(0.2, 0, 0, 1)'
const flyStyle = ref<Record<string, string>>({})

const zoomState = reactive({ 
  scale: 1, 
  x: 0, 
  y: 0, 
  isDragging: false, 
  dragStart: { x: 0, y: 0 } 
})

const touchState = reactive({
  initialDist: 0,
  initialScale: 1,
})

const resetZoom = () => {
  zoomState.scale = 1
  zoomState.x = 0
  zoomState.y = 0
}

// --- Animation Helpers ---
const getPredictedPreviewSize = (el: HTMLElement) => {
  const vW = document.documentElement.clientWidth
  const vH = document.documentElement.clientHeight
  const img = el instanceof HTMLImageElement ? el : el.querySelector('img')
  const nW = img?.naturalWidth || el.offsetWidth
  const nH = img?.naturalHeight || el.offsetHeight
  const ratio = Math.min(vW * 0.95 / nW, vH * 0.92 / nH, 1)
  return { width: nW * ratio, height: nH * ratio }
}

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

// --- Watchers ---
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    sourceEl.value = newVal instanceof HTMLElement ? newVal : newVal.el
    internalSrc.value = newVal.src
    resetZoom() 
    isClosing.value = false
    isRendered.value = true
    
    const start = calculateRect(sourceEl.value)
    flyStyle.value = {
      transition: 'none',
      transform: `translate3d(${start.x}px, ${start.y}px, 0) scale(${start.scale})`,
      opacity: '0'
    }

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

// --- Interaction Logic ---
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

const onTransitionEnd = (e: TransitionEvent) => {
  if (e.propertyName === 'transform' && !isActived.value) {
    isRendered.value = false
    sourceEl.value = null
    isClosing.value = false
    emit('update:modelValue', undefined)
  }
}

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

// --- Event Handlers ---
const handleTouchStart = (e: TouchEvent) => {
  if (isClosing.value) return
  zoomState.isDragging = true // Disable transition for direct manipulation

  if (e.touches.length === 2) {
    const t1 = e.touches[0], t2 = e.touches[1]
    touchState.initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    touchState.initialScale = zoomState.scale
  } else if (e.touches.length === 1 && zoomState.scale > 1) {
    const t = e.touches[0]
    zoomState.dragStart = { x: t.clientX - zoomState.x, y: t.clientY - zoomState.y }
  }
}

let rafId: number | null = null
const handleTouchMove = (e: TouchEvent) => {
  if (isClosing.value || !zoomState.isDragging) return
  
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const newScale = Math.min(Math.max(touchState.initialScale * (currentDist / touchState.initialDist), 0.8), 8)
      applyZoom(newScale, (t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2)
    } else if (e.touches.length === 1 && zoomState.scale > 1) {
      const t = e.touches[0]
      zoomState.x = t.clientX - zoomState.dragStart.x
      zoomState.y = t.clientY - zoomState.dragStart.y
    }
  })
}

const handleTouchEnd = () => {
  zoomState.isDragging = false
  if (zoomState.scale < 1) resetZoom()
}

// --- Styles ---
const imageStyle = computed(() => ({
  transform: isClosing.value 
    ? `translate3d(0, 0, 0) scale(1)` 
    : `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale(${zoomState.scale})`,
  // Crucial: No transition during drag/pinch to avoid lag
  transition: zoomState.isDragging ? 'none' : `transform 400ms ${QUINTIC_CURVE}`,
  cursor: zoomState.scale > 1 ? (zoomState.isDragging ? 'grabbing' : 'grab') : 'zoom-in'
}))
</script>

<template>
  <Teleport to="body">
    <div 
      v-show="isRendered"
      class="fixed inset-0 z-2000 flex items-center justify-center overflow-hidden touch-none select-none backface-hidden antialiased font-sans"
      @wheel.prevent="(e) => applyZoom(Math.min(Math.max(zoomState.scale * (-e.deltaY > 0 ? 1.25 : 0.8), 1), 8), e.clientX, e.clientY)"
      @mousemove="zoomState.isDragging && !isClosing && ((zoomState.x = $event.clientX - zoomState.dragStart.x), (zoomState.y = $event.clientY - zoomState.dragStart.y))"
      @mouseup="zoomState.isDragging = false"
      @mouseleave="zoomState.isDragging = false"
      @touchstart="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/70 transition-all duration-500 ease-out"
        :class="isActived ? 'opacity-100 backdrop-blur-12px' : 'opacity-0 backdrop-blur-0px'"
        @click="handleClose"
      />

      <!-- Layer 1: Flight (Thumbnail to Center) -->
      <div 
        class="relative pointer-events-none transform-gpu origin-center will-change-transform"
        :style="flyStyle"
        @transitionend="onTransitionEnd"
      >
        <!-- Layer 2: Interaction (Zoom & Pan) -->
        <div 
          class="pointer-events-auto transform-gpu origin-center"
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
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.transform-gpu {
  transform: translateZ(0);
}
</style>
