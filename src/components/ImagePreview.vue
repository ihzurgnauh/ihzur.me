<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'

const props = defineProps<{ modelValue?: HTMLImageElement | any }>()
const emit = defineEmits(['update:modelValue'])

// --- Component State ---
const isRendered = ref(false) // DOM lifecycle control
const isActived = ref(false)  // Transition state control
const internalSrc = ref('')
const sourceEl = ref<HTMLElement | null>(null) // Backup reference for exit animation

// Quintic curve for natural feel
const QUINTIC_CURVE = 'cubic-bezier(0.2, 0, 0, 1)'

// Flight transition styles (Thumbnail <-> Screen Center)
const flyStyle = ref<Record<string, string>>({})

// Interaction state (Zoom & Pan)
const zoomState = reactive({
  scale: 1,
  x: 0,
  y: 0,
  isDragging: false,
  dragStart: { x: 0, y: 0 }
})

const resetZoom = () => {
  zoomState.scale = 1
  zoomState.x = 0
  zoomState.y = 0
}

/**
 * Calculate element position relative to viewport center
 */
const calculateRect = (el: HTMLElement | null) => {
  if (!el) return { x: 0, y: 0, scale: 0.3 }
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2 - window.innerWidth / 2,
    y: rect.top + rect.height / 2 - window.innerHeight / 2,
    scale: rect.width / window.innerWidth
  }
}

// Sync internal state with prop changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // Open Logic
    sourceEl.value = newVal instanceof HTMLElement ? newVal : newVal.el
    internalSrc.value = newVal.src
    resetZoom() 
    isRendered.value = true
    
    const start = calculateRect(sourceEl.value)
    flyStyle.value = {
      transition: 'none',
      transform: `translate3d(${start.x}px, ${start.y}px, 0) scale(${start.scale})`,
      opacity: '0'
    }

    // Double rAF to ensure the initial state is painted before animating
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
    // Close Logic (triggered by parent setting modelValue to undefined)
    handleClose()
  }
})

/**
 * Perform closing transition
 */
const handleClose = (e?: Event) => {
  e?.stopPropagation()
  if (!isActived.value) return
  
  // Use sourceEl backup to ensure correct target coordinates even if prop is null
  const end = calculateRect(sourceEl.value)

  isActived.value = false
  resetZoom() 
  
  flyStyle.value = {
    transition: `transform 500ms ${QUINTIC_CURVE}, opacity 350ms ease-in`,
    transform: `translate3d(${end.x}px, ${end.y}px, 0) scale(${end.scale})`,
    opacity: '0'
  }
}

/**
 * Final cleanup after transition finishes
 */
const onTransitionEnd = (e: TransitionEvent) => {
  // Use opacity as the final sentinel for visibility
  if (e.propertyName === 'opacity' && !isActived.value) {
    isRendered.value = false
    sourceEl.value = null 
    emit('update:modelValue', undefined)
  }
}

/**
 * Precise "Zoom at Mouse" logic
 */
const handleZoom = (e: WheelEvent | MouseEvent, zoomType: 'wheel' | 'dblclick') => {
  const isWheel = zoomType === 'wheel'
  let newScale = zoomState.scale
  if (isWheel) {
    const delta = -(e as WheelEvent).deltaY
    const factor = delta > 0 ? 1.25 : 0.8
    newScale = Math.min(Math.max(zoomState.scale * factor, 1), 8)
  } else {
    newScale = zoomState.scale > 1.1 ? 1 : 3 
  }

  if (newScale === zoomState.scale) return

  const mouseX = e.clientX - window.innerWidth / 2
  const mouseY = e.clientY - window.innerHeight / 2

  // Compares ratios to maintain pixel position under cursor
  const ratio = newScale / zoomState.scale
  zoomState.x = mouseX - (mouseX - zoomState.x) * ratio
  zoomState.y = mouseY - (mouseY - zoomState.y) * ratio
  zoomState.scale = newScale

  if (zoomState.scale <= 1.01) resetZoom()
}

// --- Drag Handlers ---
const startDrag = (e: MouseEvent) => {
  if (zoomState.scale <= 1) return
  zoomState.isDragging = true
  zoomState.dragStart = { x: e.clientX - zoomState.x, y: e.clientY - zoomState.y }
}
const onDragging = (e: MouseEvent) => {
  if (!zoomState.isDragging) return
  zoomState.x = e.clientX - zoomState.dragStart.x
  zoomState.y = e.clientY - zoomState.dragStart.y
}
const stopDrag = () => (zoomState.isDragging = false)

// Combined style for the interaction layer
const imageStyle = computed(() => ({
  transform: `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale(${zoomState.scale})`,
  transition: zoomState.isDragging ? 'none' : `transform 450ms ${QUINTIC_CURVE}`,
  cursor: zoomState.scale > 1 ? (zoomState.isDragging ? 'grabbing' : 'grab') : 'zoom-in'
}))
</script>

<template>
  <Teleport to="body">
    <div 
      v-show="isRendered"
      class="fixed inset-0 z-2000 flex items-center justify-center overflow-hidden touch-none select-none backface-hidden antialiased"
      @wheel.prevent="handleZoom($event, 'wheel')"
      @mousemove="onDragging"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <!-- Backdrop with blur -->
      <div 
        class="absolute inset-0 bg-black/70 transition-all duration-500 ease-out"
        :class="isActived ? 'opacity-100 backdrop-blur-12px' : 'opacity-0 backdrop-blur-0px'"
        @click="handleClose"
        @transitionend="onTransitionEnd"
      />

      <!-- Flight Layer -->
      <div 
        class="relative pointer-events-none will-change-transform"
        :style="flyStyle"
      >
        <!-- Interaction Layer -->
        <div 
          class="pointer-events-auto will-change-transform"
          :style="imageStyle"
          @dblclick="handleZoom($event, 'dblclick')"
          @mousedown="startDrag"
          @click.stop
        >
          <img 
            :src="internalSrc" 
            draggable="false"
            class="max-w-95vw max-h-95vh object-contain shadow-2xl rounded-sm"
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* GPU rendering optimization */
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>
