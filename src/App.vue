<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const active = ref(false)
const activeImg = ref<HTMLImageElement | null>(null)

const vtName = 'image-preview'

const supportsVT = () =>
  typeof window !== 'undefined'
  && 'startViewTransition' in document

// Open preview
const openPreview = (el: HTMLImageElement) => {
  if (!el || activeImg.value)
    return

  // Assign transition name
  el.style.viewTransitionName = vtName

  const run = async () => {
    active.value = true
    activeImg.value = el

    // Hide original image but keep space to prevent layout shift
    el.style.visibility = 'hidden'
    // Pass transition name to modal image
    el.style.viewTransitionName = ''

    // Wait for DOM update
    await nextTick()
  }

  if (!supportsVT()) {
    run()
    return
  }

  document.startViewTransition(run)
}

// Close preview
const closePreview = () => {
  const el = activeImg.value

  if (!el)
    return

  const run = async () => {
    active.value = false

    // Restore visibility
    el.style.visibility = ''
    // Restore transition name for reverse animation
    el.style.viewTransitionName = vtName

    // Wait for DOM update
    await nextTick()
  }

  const vt = supportsVT()
    ? document.startViewTransition(run)
    : { finished: Promise.resolve() }

  vt.finished.then(() => {
    // Clean up
    el.style.viewTransitionName = ''
    activeImg.value = null
  })
}

// Global image click
useEventListener('click', (e) => {
  if (active.value)
    return

  const path = e.composedPath()

  const img = path.find(
    (el): el is HTMLImageElement =>
      el instanceof HTMLImageElement,
  )

  if (!img)
    return

  // Exclude links/buttons
  if (
    path.some(
      el =>
        el instanceof HTMLElement
        && ['A', 'BUTTON'].includes(el.tagName),
    )
  ) {
    return
  }

  // Only prose area
  if (
    !path.some(
      el =>
        el instanceof HTMLElement
        && el.classList.contains('prose'),
    )
  ) {
    return
  }

  openPreview(img)
})

// ESC
onKeyStroke('Escape', () => {
  if (active.value)
    closePreview()
})
</script>

<template>
  <NavBar />

  <main class="px-7 py-10 of-x-hidden">
    <RouterView />
    <Footer :key="route.path" />
  </main>

  <!-- Preview backdrop -->
  <div
    v-if="active"
    class="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center cursor-zoom-out"
    @click="closePreview"
  >
    <!-- Modal image -->
    <img
      v-if="activeImg"
      :src="activeImg.src"
      class="max-w-[90vw] max-h-[90vh] object-contain z-[9999]"
      style="view-transition-name: image-preview;"
    />
  </div>
</template>
