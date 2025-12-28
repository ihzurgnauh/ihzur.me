<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useWindowSize, useRafFn } from '@vueuse/core'

const { PI, cos, sin, random } = Math
const R180 = PI
const R90 = PI / 2
const R15 = PI / 12
const COLOR = '#88888825'
const MIN_BRANCH = 27
const FPS_INTERVAL = 1000 / 40

interface BranchTask {
  x: number
  y: number
  rad: number
  counter: { value: number }
}

const el = ref<HTMLCanvasElement | null>(null)
const size = reactive(useWindowSize())
const stopped = ref(false)
const len = ref(6)

let steps: BranchTask[] = []
let prevSteps: BranchTask[] = []
let ctx: CanvasRenderingContext2D
let lastTime = performance.now()

function initCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const _ctx = canvas.getContext('2d', { alpha: true })!
  const dpr = window.devicePixelRatio || 1
  
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = width * dpr
  canvas.height = height * dpr
  _ctx.scale(dpr, dpr)
  return _ctx
}

const executeStep = (task: BranchTask, width: number, height: number) => {
  const { x, y, rad, counter } = task
  const length = random() * len.value
  counter.value += 1

  const nx = x + length * cos(rad)
  const ny = y + length * sin(rad)

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(nx, ny)
  ctx.stroke()

  // Bounds check
  if (nx < -100 || nx > width + 100 || ny < -100 || ny > height + 100) {
    return
  }

  const rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5

  if (random() < rate) {
    steps.push({ x: nx, y: ny, rad: rad + random() * R15, counter })
  }
    
  if (random() < rate) {
    steps.push({ x: nx, y: ny, rad: rad - random() * R15, counter })
  }
  
}

const { pause, resume } = useRafFn(() => {
  const now = performance.now()
  const elapsed = now - lastTime

  if (elapsed < FPS_INTERVAL) return

  if (steps.length === 0 && prevSteps.length === 0) {
    stopped.value = true
    pause()
    return
  }

  lastTime = now - (elapsed % FPS_INTERVAL)

  prevSteps = steps
  steps = []

  // Cache window size to avoid repeated Proxy access
  const currentW = size.width
  const currentH = size.height

  for (let i = 0; i < prevSteps.length; i++) {
    const task = prevSteps[i]
    if (random() < 0.5) {
      steps.push(task)
    } else {
      executeStep(task, currentW, currentH)
    }
  }
}, { immediate: false })

const start = () => {
  if (!el.value) return
  pause()
  
  ctx = initCanvas(el.value, size.width, size.height)
  ctx.lineWidth = 1
  ctx.strokeStyle = COLOR
  
  lastTime = performance.now()
  prevSteps = []
  
  const randomMiddle = () => random() * 0.6 + 0.2
  
  steps = [
    { x: randomMiddle() * size.width, y: -5, rad: R90, counter: { value: 0 } },
    { x: randomMiddle() * size.width, y: size.height + 5, rad: -R90, counter: { value: 0 } },
    { x: -5, y: randomMiddle() * size.height, rad: 0, counter: { value: 0 } },
    { x: size.width + 5, y: randomMiddle() * size.height, rad: R180, counter: { value: 0 } },
  ]

  if (size.width < 500) steps = steps.slice(0, 2)
  
  stopped.value = false
  resume()
}

onMounted(start)

const maskStyle = computed(() => {
  const mask = 'radial-gradient(circle, transparent, black)'
  return {
    maskImage: mask,
    WebkitMaskImage: mask
  }
})
</script>

<template>
  <div
    class="fixed inset-0 pointer-events-none print:hidden"
    style="z-index: -1"
    :style="maskStyle"
  >
    <canvas ref="el" />
  </div>
</template>
