<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const active = ref(false)
const activeImg = ref<HTMLImageElement | null>(null)

const vtName = 'astro-image'

const supportsVT = () => 'startViewTransition' in document

// 锁定 blurhash wrapper 尺寸，防止 img position:fixed 后塌陷
const lockWrapper = (el: HTMLImageElement) => {
  const wrapper = el.closest('.blur-image-wrapper') as HTMLElement | null
  if (!wrapper) return
  const { width, height } = wrapper.getBoundingClientRect()
  wrapper.style.width = width + 'px'
  wrapper.style.height = height + 'px'
}

const unlockWrapper = (el: HTMLImageElement) => {
  const wrapper = el.closest('.blur-image-wrapper') as HTMLElement | null
  if (!wrapper) return
  wrapper.style.width = ''
  wrapper.style.height = ''
}

const openPreview = (el: HTMLImageElement) => {
  if (!el) return

  activeImg.value = el
  el.style.viewTransitionName = vtName

  const run = () => {
    lockWrapper(el)
    active.value = true
    el.classList.add('vt-active')
  }

  if (!supportsVT()) return run()

  document.startViewTransition(run)
}

const closePreview = () => {
  const el = activeImg.value
  if (!el) return

  el.style.viewTransitionName = vtName

  const run = () => {
    active.value = false
    el.classList.remove('vt-active')
  }

  const vt = supportsVT()
    ? document.startViewTransition(run)
    : { finished: Promise.resolve() }

  vt.finished.then(() => {
    unlockWrapper(el)
    el.style.viewTransitionName = ''
    activeImg.value = null
  })
}

useEventListener('click', (e) => {
  if (active.value) return

  const path = e.composedPath()
  const first = path[0]

  if (!(first instanceof HTMLImageElement)) return

  if (path.some(el => el instanceof HTMLElement && ['A', 'BUTTON'].includes(el.tagName))) return

  if (!path.some(el => el instanceof HTMLElement && el.classList.contains('prose'))) return

  openPreview(first)
})

onKeyStroke('Escape', () => {
  if (active.value) closePreview()
})
</script>

<template>
  <NavBar />

  <main class="px-7 py-10 of-x-hidden">
    <RouterView />
    <Footer :key="route.path" />
  </main>

  <div
    v-if="active"
    class="fixed inset-0 z-[9997] bg-black/70"
    @click="closePreview"
  />
</template>
