<script setup lang="ts">
  import mediaData from '../../data/media.json'
  import type { MediaType, MediaRecord } from '~/types'

  const route = useRoute()
  const type = computed<MediaType>(() => route.query.type as MediaType || 'book')
  const media = mediaData as Record<MediaType, MediaRecord[]>
</script>
 
<template>
  <div font-mono>
    <div flex="~ gap-2">
      <RouterLink
        v-for="t of Object.keys(media)"
        :key="t"
        :to="{ query: { type: t } }"
        px-2
        class="border-none!"
        :class="type === t ? 'bg-#1c1c1d dark:bg-white text-white! dark:text-black!' : ''"
      >
        {{ t }}
      </RouterLink>
    </div>
 
    <template v-for="t of Object.keys(media)" :key="t">
      <table v-show="type === t" lang="zh" font-400>
        <tbody>
          <template v-for="m of media[type]" :key="m.name">
            <tr v-bind="m.lang ? { lang: m.lang } : {}">
              <td>{{ m.name }}</td>
              <td text-right>{{ m.author }}</td>
              <td v-if="m.date" lt-sm:hidden>
                {{ m.date }}
              </td>
              <td v-if="m.note" lt-sm:hidden>
                {{ m.note }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </template>
  </div>
</template>
