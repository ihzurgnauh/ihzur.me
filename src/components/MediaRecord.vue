<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'
import mediaData from '../../data/media.json'
import type { MediaType, MediaRecord } from '~/types'

const route = useRoute()
const router = useRouter()
const { width, height } = useWindowSize()
const type = computed<MediaType>(() => route.query.type as MediaType || 'book')
const media = mediaData as Record<MediaType, MediaRecord[]>

const typeLabel: Record<MediaType, string> = { book: '书', movie: '影' }
const stateBar: Record<string, string> = {
  done: 'bg-hex-333/15 dark:bg-white/15',
  doing: 'bg-amber-400/60 dark:bg-amber-400/50',
  todo: 'bg-blue-400/60 dark:bg-blue-400/50',
}

// 画布状态
const offset = reactive({ x: 0, y: 0 })
const isDragging = ref(false)
const isReady = ref(false)
const lastPos = { x: 0, y: 0 }
const scatteredItems = ref<any[]>([])

// 预览状态
const activeMedia = ref<any | null>(null)
const isFlipped = ref(false)
const previewPhase = ref<'hidden' | 'entering' | 'resting' | 'leaving'>('hidden')
const previewFrom = ref<{ x: number; y: number; w: number; h: number } | null>(null)

// ------ 布局生成 ------
const generateLayout = () => {
  if (width.value <= 0 || height.value <= 0) return
  const items = media[type.value] || []
  const total = items.length
  const isMobile = width.value < 768
  const coreW = isMobile ? width.value * 0.65 : width.value * 0.75
  const coreH = isMobile ? height.value * 0.6 : height.value * 0.7
  const spreadX = isMobile ? 300 + total * 50 : 600 + total * 120
  const spreadY = isMobile ? 200 + total * 40 : 400 + total * 90
  // 卡片尺寸随视口等比缩放
  const cardBaseW = isMobile ? Math.min(width.value * 0.78, 200) : Math.min(width.value * 0.22, 340)
  const cardBaseH = cardBaseW * 1.25

  const placed: { x: number; y: number; w: number; h: number }[] = []

  scatteredItems.value = items.map((item, i) => {
    const scale = (isMobile ? 0.55 : 0.85) + Math.random() * 0.25
    const cardW = cardBaseW * scale
    const cardH = cardBaseH * scale

    let x: number, y: number
    let attempts = 0
    do {
      if (i < total * 0.5) {
        x = (Math.random() - 0.5) * coreW
        y = (Math.random() - 0.5) * coreH
      } else {
        const rX = Math.pow(Math.random(), 1.5) * (Math.random() > 0.5 ? 1 : -1)
        const rY = Math.pow(Math.random(), 1.5) * (Math.random() > 0.5 ? 1 : -1)
        x = rX * spreadX
        y = rY * spreadY
      }
      attempts++
    } while (
      attempts < 30 &&
      placed.some(p => Math.abs(p.x - x) < (p.w + cardW) * 0.38 && Math.abs(p.y - y) < (p.h + cardH) * 0.38)
    )

    placed.push({ x, y, w: cardW, h: cardH })
    return {
      ...item,
      x, y,
      rotate: (Math.random() - 0.5) * 12,
      scale,
      id: Math.random().toString(36).slice(2)
    }
  })
  nextTick(() => { isReady.value = true })
}

// ------ 预览控制 ------
const openPreview = (m: any, e: MouseEvent) => {
  if (isDragging.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  previewFrom.value = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  activeMedia.value = m
  isFlipped.value = false
  previewPhase.value = 'entering'
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { previewPhase.value = 'resting' })
    })
  })
}

const closePreview = () => {
  previewPhase.value = 'leaving'
  setTimeout(() => {
    activeMedia.value = null
    isFlipped.value = false
    previewPhase.value = 'hidden'
    previewFrom.value = null
  }, 450)
}

const toggleFlip = (e: Event) => {
  e.stopPropagation()
  isFlipped.value = !isFlipped.value
}

const isMobile = computed(() => width.value < 768)
const previewW = computed(() => {
  const vw = width.value
  const maxW = isMobile.value ? Math.min(vw - 32, 320) : Math.min(vw - 64, 448)
  return maxW
})
const previewH = computed(() => previewW.value * (4.2 / 3))

const previewCardStyle = computed<Record<string, string>>(() => {
  const from = previewFrom.value
  const vw = width.value
  const vh = height.value
  const pw = previewW.value
  const ph = previewH.value
  const flip = isFlipped.value ? ' rotateY(180deg)' : ''

  const base: Record<string, string> = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    width: `${pw}px`,
    aspectRatio: `${3}/${4.2}`,
  }

  if (!from) {
    return { ...base, transform: `translate(-50%, -50%)${flip}` }
  }

  const toCenterX = from.x + from.w / 2 - vw / 2
  const toCenterY = from.y + from.h / 2 - vh / 2
  const scaleX = from.w / pw
  const scaleY = from.h / ph
  const fromTransform = `translate(${toCenterX}px, ${toCenterY}px) scale(${scaleX}, ${scaleY})`

  if (previewPhase.value === 'entering') {
    return { ...base, transform: fromTransform, transition: 'none' }
  }
  if (previewPhase.value === 'leaving') {
    return { ...base, transform: fromTransform, opacity: '0', transition: 'all 0.45s cubic-bezier(0.19, 1, 0.22, 1)' }
  }
  return { ...base, transform: `translate(-50%, -50%)${flip}`, transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)' }
})

const overlayOpacity = computed(() => previewPhase.value === 'resting' ? 1 : 0)

watch(type, () => {
  isReady.value = false
  activeMedia.value = null
  previewPhase.value = 'hidden'
  previewFrom.value = null
  offset.x = 0
  offset.y = 0
  generateLayout()
})

onMounted(() => {
  setTimeout(() => { generateLayout() }, 150)
})

const handleStart = (x: number, y: number) => {
  isDragging.value = true
  lastPos.x = x
  lastPos.y = y
}
const handleMove = (x: number, y: number) => {
  if (!isDragging.value) return
  offset.x += x - lastPos.x
  offset.y += y - lastPos.y
  lastPos.x = x
  lastPos.y = y
}
const handleEnd = () => isDragging.value = false

const setType = (t: string) => {
  if (type.value === t) return
  router.push({ query: { type: t } })
}
const goBack = () => router.push('/')
const resetOffset = () => { offset.x = 0; offset.y = 0 }
</script>

<template>
  <div
    class="fixed inset-0 z-[999] overflow-hidden bg-white dark:bg-hex-050505 select-none touch-none transition-colors duration-1000"
    :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
    @mousedown="handleStart($event.clientX, $event.clientY)"
    @mousemove="handleMove($event.clientX, $event.clientY)"
    @mouseup="handleEnd"
    @mouseleave="handleEnd"
    @touchstart.passive="handleStart($event.touches[0].clientX, $event.touches[0].clientY)"
    @touchmove.passive="handleMove($event.touches[0].clientX, $event.touches[0].clientY)"
    @touchend="handleEnd"
  >
    <!-- 背景点阵 -->
    <div
      class="absolute inset-[-200%] op-10 dark:op-20 pointer-events-none will-change-transform"
      :style="{
        backgroundImage: `radial-gradient(circle, currentColor 1.2px, transparent 1.2px)`,
        backgroundSize: '100px 100px',
        transform: `translate3d(${offset.x % 100}px, ${offset.y % 100}px, 0)`
      }"
    />

    <!-- 无限画布 -->
    <div
      v-if="isReady"
      class="absolute left-1/2 top-1/2 will-change-transform"
      :class="{ 'transition-transform duration-500 ease-out': !isDragging }"
      :style="{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }"
    >
      <div
        v-for="m in scatteredItems"
        :key="m.id"
        class="absolute group hover:z-50 cursor-pointer"
        @click="openPreview(m, $event)"
        :style="{ left: `${m.x}px`, top: `${m.y}px`, transform: `rotate(${m.rotate}deg) scale(${m.scale})` }"
      >
        <div
          class="bg-white/95 dark:bg-hex-111/95 backdrop-blur-xl border border-black/5 dark:border-white/5 shadow-xl hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.2)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-0"
          :style="{ width: isMobile ? `${Math.min(width * 0.78, 200)}px` : `${Math.min(width * 0.22, 340)}px`, padding: isMobile ? `${Math.round(width * 0.043)}px` : `${Math.round(width * 0.017)}px` }"
        >
          <div class="flex flex-col text-left" :style="{ gap: isMobile ? `${Math.round(width * 0.032)}px` : `${Math.round(width * 0.008)}px` }">
            <div class="flex justify-between items-center text-[8px] md:text-[9px] tracking-widest uppercase italic border-b border-black/5 dark:border-white/5 pb-2 text-black dark:text-white">
              <div class="w-3 h-0.5 rounded-full shrink-0" :class="stateBar[m.state || 'todo']" />
              <span class="op-30 dark:op-50">{{ m.date || m.lang?.toUpperCase() || '—' }}</span>
            </div>
            <h2 class="text-lg md:text-2xl font-900 tracking-tighter leading-tight italic text-black dark:text-white antialiased">{{ m.name }}</h2>
            <div v-if="m.author" class="flex items-center gap-2 text-black dark:text-white">
              <div class="w-3 h-px bg-current op-20" />
              <span class="text-[10px] md:text-xs italic op-50">{{ m.author }}</span>
            </div>
            <p v-if="m.note" class="text-[10px] md:text-xs leading-relaxed op-0 group-hover:op-60 transition-opacity duration-700 line-clamp-4 italic pt-1 antialiased text-black dark:text-white">“{{ m.note }}”</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览遮罩 -->
    <div
      v-if="activeMedia"
      class="fixed inset-0 z-[1000] flex items-center justify-center px-4 md:px-6 pointer-events-auto"
      :style="{ background: `rgba(0,0,0,${overlayOpacity * 0.4})`, backdropFilter: `blur(${overlayOpacity * 4}px)`, transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)' }"
      @click.self="closePreview"
    >
      <div class="preserve-3d pointer-events-auto relative" :style="previewCardStyle">
        <!-- 正面 -->
        <div class="absolute inset-0 backface-hidden bg-white dark:bg-hex-111 shadow-2xl flex flex-col" :style="{ padding: isMobile ? `${Math.round(width * 0.05)}px` : `${Math.round(width * 0.025)}px` }">
          <div class="flex justify-between items-center text-[10px] tracking-widest uppercase italic border-b border-black/10 dark:border-white/10 pb-4 text-black dark:text-white">
            <div class="w-5 h-0.5 rounded-full shrink-0" :class="stateBar[activeMedia.state || 'todo']" />
            <span class="op-40">{{ activeMedia.date || activeMedia.lang?.toUpperCase() || '—' }}</span>
          </div>
          <h2 class="text-3xl md:text-5xl font-900 tracking-tighter leading-none italic text-black dark:text-white mt-4">{{ activeMedia.name }}</h2>
          <div v-if="activeMedia.author" class="flex items-center gap-4 mt-4 text-black dark:text-white">
            <div class="w-8 h-px bg-current op-20" />
            <span class="text-sm md:text-base italic op-60">{{ activeMedia.author }}</span>
          </div>
          <p class="text-sm md:text-base leading-relaxed op-50 italic antialiased text-black dark:text-white mt-4">“{{ activeMedia.note || '暂无笔记' }}”</p>
          <button @click="toggleFlip" class="mt-auto self-end op-30 hover:op-70 transition-opacity text-black dark:text-white">
            <div class="i-material-symbols-light-flip-camera-android-rounded text-base md:text-lg" />
          </button>
        </div>

        <!-- 背面 -->
        <div class="absolute inset-0 backface-hidden bg-hex-fafafa dark:bg-hex-0c0c0c shadow-2xl flex flex-col" style="transform: rotateY(180deg)" :style="{ padding: isMobile ? `${Math.round(width * 0.05)}px` : `${Math.round(width * 0.025)}px` }">
          <button @click="closePreview" class="absolute top-2 right-2 md:top-3 md:right-3 op-25 hover:op-60 transition-opacity text-black dark:text-white z-10">
            <div class="i-carbon-close text-base md:text-lg" />
          </button>
          <div class="flex justify-between items-center text-[10px] tracking-widest uppercase italic border-b border-black/10 pb-4 text-black dark:text-white">
            <span class="op-40">感受</span>
            <div class="i-carbon-pen text-sm op-40" />
          </div>
          <div class="flex-1 overflow-y-auto py-8 text-left text-black dark:text-white">
            <p class="text-base md:text-lg leading-loose italic op-80 antialiased">
              {{ activeMedia.thoughts || '时过境迁，感受与记忆在此处沉淀。' }}
            </p>
          </div>
          <button @click="toggleFlip" class="mt-auto self-start op-30 hover:op-70 transition-opacity text-black dark:text-white">
            <div class="i-material-symbols-light-flip-camera-android-rounded text-base md:text-lg" />
          </button>
        </div>
      </div>
    </div>

    <!-- 导航层 -->
    <nav class="fixed top-8 left-8 md:top-12 md:left-10 z-[100] mix-blend-difference flex flex-col gap-8 md:gap-12 pointer-events-none text-white">
      <button @click="goBack" class="group pointer-events-auto flex items-center gap-2 op-40 hover:op-100 transition-all duration-300">
        <div class="i-material-symbols-light-arrow-back-ios-rounded text-base md:text-lg transition-transform group-hover:-translate-x-1" />
      </button>

      <div class="flex flex-col gap-4 md:gap-8 pointer-events-auto">
        <div class="text-[1rem] op-50 select-none">忘记和不曾察觉的事，等同于从未发生</div>
        <div class="flex flex-col gap-1 md:gap-2">
          <button
            v-for="t in Object.keys(media)" :key="t"
            @click.stop="setType(t)"
            class="flex items-center gap-3 text-3xl md:text-7xl font-900 uppercase tracking-tighter transition-all text-left outline-none"
            :class="type === t ? 'op-100' : 'op-20 hover:op-60'"
          >
            <span>{{ typeLabel[t as MediaType] || t }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- 底部信息 -->
    <footer class="fixed bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10 z-[100] flex justify-between items-end pointer-events-none mix-blend-difference text-white/30 uppercase tracking-[0.2em] md:tracking-[0.3em]">
      <span class="text-xl md:text-4xl text-white op-100 font-900 tracking-tighter italic leading-none">{{ media[type]?.length }}</span>
      <div class="flex flex-col items-end gap-1 md:gap-2 leading-tight pointer-events-auto text-white">
        <button @click="resetOffset" class="group flex items-center op-60 hover:op-100 transition-all duration-300 active:scale-95 text-white">
          <div class="i-carbon-center-to-fit text-[10px] md:text-xs group-hover:rotate-180 transition-transform duration-500" />
        </button>
        <div class="flex flex-col items-end text-[7px] md:text-[9px] op-40 leading-relaxed">
          <span>x {{ offset.x.toFixed(0) }}</span>
          <span>y {{ offset.y.toFixed(0) }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.preserve-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }

.group {
  animation: fragment-reveal 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}
@keyframes fragment-reveal {
  from { opacity: 0; filter: blur(20px); transform: translateY(40px) scale(0.8); }
  to   { opacity: 1; filter: blur(0);   transform: translateY(0) scale(1); }
}

.will-change-transform { will-change: transform; }
</style>
