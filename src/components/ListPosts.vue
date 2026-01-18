<script setup lang="ts">
import { useRouter } from 'vue-router/auto'
import { lunarCalendar } from '~/logics'
import type { Post } from '~/types'

const props = defineProps<{
  type?: string
  posts?: Post[]
  extra?: Post[]
}>()

const router = useRouter()
const routes: Post[] = router.getRoutes()
  .filter((i: any) => i.path.startsWith(`/${props.type}`) && i.meta.frontmatter.date && !i.meta.frontmatter.draft)
  .filter((i: any) => !i.path.endsWith('.html'))
  .map((i: any) => ({
    path: i.meta.frontmatter.redirect || i.path,
    title: i.meta.frontmatter.title,
    date: i.meta.frontmatter.date,
    lang: i.meta.frontmatter.lang,
    redirect: i.meta.frontmatter.redirect,
  }))
  
const posts = computed(() =>
  [...(props.posts || routes), ...props.extra || []]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
)

// const getYear = (a: Date | string | number) => new Date(a).getFullYear()
const getLunarYear = (a: Date | string | number) => lunarCalendar(new Date(a)).year
const isFuture = (a?: Date | string | number) => a && new Date(a) > new Date()
const isSameYear = (a?: Date | string | number, b?: Date | string | number) => a && b && getLunarYear(a) === getLunarYear(b)
function isSameGroup(a: Post, b?: Post) {
  return (isFuture(a.date) === isFuture(b?.date)) && isSameYear(a.date, b?.date)
}

function getGroupName(p: Post) {
  if (isFuture(p.date))
    return '将至'
  return getLunarYear(p.date)
}
</script>

<template>
  <ul>
    <template v-if="!posts.length">
      <div py2 op50>
        { 这里还没有任何东西👻 }
      </div>
    </template>

    <template v-for="route, idx in posts" :key="route.path">
      <div
        v-if="!isSameGroup(route, posts[idx - 1])"
        select-none relative h20 pointer-events-none slide-enter
        :style="{
          '--enter-stage': idx - 2,
          '--enter-step': '60ms',
        }"
      >
        <span text-7em color-transparent absolute left--3rem top--1.7rem font-bold text-stroke-2 text-stroke-hex-777 op10>{{ getGroupName(route) }}</span>
      </div>
      <div
        class="slide-enter"
        :style="{
          '--enter-stage': idx,
          '--enter-step': '60ms',
        }"
      >
        <component
          :is="route.path.includes('://') ? 'a' : 'RouterLink'"
          v-bind="
            route.path.includes('://') ? {
              href: route.path,
              target: '_blank',
              rel: 'noopener noreferrer',
            } : {
              to: route.path,
            }
          "
          class="item block font-normal mb-6 mt-2 no-underline"
        >
          <li class="no-underline" flex="~ col md:row gap-2 md:items-center">
            <div class="title text-lg leading-1.2em" flex="~ gap-2 wrap">
              <span
                v-if="route.lang === 'en'"
                align-middle flex-none
                class="text-xs bg-zinc:15 text-zinc5 rounded px-1 py-0.5 ml--12 mr2 my-auto hidden md:block"
              >English</span>
              <span align-middle>{{ route.title }}</span>
            </div>

            <div flex="~ gap-2 items-center">
              <span
                v-if="route.redirect"
                align-middle op50 flex-none text-xs ml--1 mt--1
                i-carbon-arrow-up-right
                title="External"
              />

              <span text-sm op50 ws-nowrap>
                {{ lunarCalendar(route.date).monthDay }}
              </span>
              <!-- <span v-if="route.duration" text-sm op40 ws-nowrap>· {{ route.duration }}</span> -->
              <span
                v-if="route.lang === 'en'"
                align-middle flex-none
                class="text-xs bg-zinc:15 text-zinc5 rounded px-1 py-0.5 my-auto md:hidden"
              >English</span>
            </div>
          </li>
        </component>
      </div>
    </template>
  </ul>
</template>
