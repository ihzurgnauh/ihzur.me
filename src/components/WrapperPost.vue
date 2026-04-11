<script setup lang='ts'>
import { lunarCalendar, formatDate } from '~/logics'
import { computed, defineAsyncComponent } from 'vue'
import { isDark } from '~/logics'

const { frontmatter } = defineProps({
  frontmatter: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const route = useRoute()
const content = ref<HTMLDivElement>()

onMounted(() => {
  const navigate = () => {
    if (location.hash) {
      const el = document.querySelector(decodeURIComponent(location.hash))
      if (el) {
        const rect = el.getBoundingClientRect()
        const y = window.scrollY + rect.top - 40
        window.scrollTo({
          top: y,
          behavior: 'smooth',
        })
        return true
      }
    }
  }

  const handleAnchors = (
    event: MouseEvent & { target: HTMLElement },
  ) => {
    const link = event.target.closest('a')

    if (
      !event.defaultPrevented
      && link
      && event.button === 0
      && link.target !== '_blank'
      && link.rel !== 'external'
      && !link.download
      && !event.metaKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.altKey
    ) {
      const url = new URL(link.href)
      if (url.origin !== window.location.origin)
        return

      event.preventDefault()
      const { pathname, hash } = url
      if (hash && (!pathname || pathname === location.pathname)) {
        window.history.replaceState({}, '', hash)
        navigate()
      }
      else {
        router.push({ path: pathname, hash })
      }
    }
  }

  useEventListener(window, 'hashchange', navigate)
  useEventListener(content.value!, 'click', handleAnchors, { passive: false })

  setTimeout(() => {
    if (!navigate())
      setTimeout(navigate, 1000)
  }, 1)
})

const BgComponent = computed(() => {
  let bg = frontmatter.background
  if (bg === 'random') {
    const bgList = isDark.value ? ['plum', 'stars'] : ['plum', 'dapple']
    bg = bgList[Math.floor(Math.random() * bgList.length)]
  }

  if (isDark.value && bg === 'dapple') {
    bg = 'stars'
  } 
  else if (!isDark.value && bg === 'stars') {
    bg = 'dapple'
  }

  if (typeof window !== 'undefined') {
    if (bg === 'plum') {
      return defineAsyncComponent(() => import('./Plum.vue'))
    }
    else if (bg === 'stars') {
      return defineAsyncComponent(() => import('./Stars.vue'))
    }
    else if (bg === 'dapple') {
      return defineAsyncComponent(() => import('./DappleLight.vue'))
    }
  }
  
  return undefined
})
</script>

<template>
   <ClientOnly v-if="BgComponent">
    <component :is="BgComponent" />
  </ClientOnly>
  <div
    v-if="frontmatter.display ?? frontmatter.title"
    class="prose m-auto mb-8"
    :class="[frontmatter.wrapperClass]"
  >
    <h1 class="mb-0 slide-enter-50">
      {{ frontmatter.display ?? frontmatter.title }}
    </h1>
    <p
      v-if="frontmatter.date"
      class="opacity-50 !-mt-6 slide-enter-50"
    >
      {{ formatDate(frontmatter.date, false) }} {{ lunarCalendar(frontmatter.date).season }} {{lunarCalendar(frontmatter.date).solarTerm}}
    </p>
    <p
      v-if="frontmatter.subtitle"
      class="opacity-50 !-mt-6 italic slide-enter"
    >
      {{ frontmatter.subtitle }}
    </p>
    <p
      v-if="frontmatter.draft"
      class="slide-enter" bg-orange-3:10 text-orange-4 border="l-3 orange-4" px4 py2
    >
      这是一篇草稿，内容可能不完整或者会随时变动，请稍后再回来查看。
    </p>
  </div>
  <article ref="content" :class="[frontmatter.tocAlwaysOn ? 'toc-always-on' : '', frontmatter.class]">
    <slot />
  </article>

  <div v-if="route.path !== '/'" class="prose m-auto mt-8 mb-8 slide-enter animate-delay-500 print:hidden">
    <span font-mono op50>> </span>
    <RouterLink
      :to="route.path.split('/').slice(0, -1).join('/') || '/'"
      class="op50 hover:op75"
    >
      {{ 'cd ..' }}
    </RouterLink>
  </div>
</template>
