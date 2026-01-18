import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { defaultWindow, watchThrottled, unrefElement } from '@vueuse/core'
import type { MaybeElementRef, MouseInElementOptions } from '@vueuse/core'
import { createSharedComposable, useMouse } from '@vueuse/core'
import type { LunarDate } from '~/types'
import { lunisolar } from 'tinylunar'

dayjs.locale('zh-cn')

export const isDark = useDark()

/**
 * Credit to [@hooray](https://github.com/hooray)
 * @see https://github.com/vuejs/vitepress/pull/2347
 */
export function toggleDark(event: MouseEvent) {
  // @ts-expect-error experimental API
  const isAppearanceTransition = document.startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    isDark.value = !isDark.value
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )
  
  const transition = document.startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  })
  transition.ready
    .then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]
      document.documentElement.animate(
        {
          clipPath: isDark.value
            ? [...clipPath].reverse()
            : clipPath,
        },
        {
          duration: 623,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: isDark.value
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        },
      )
    })
}


const useSharedMouse = createSharedComposable(useMouse)

export function useSharedMouseInElement(
  target?: MaybeElementRef,
  options: MouseInElementOptions = {}
) {
  const { x, y } = useSharedMouse(options)

  const targetRef = ref(target ?? window?.document.body)
  const elementX = ref(9999)
  const elementY = ref(9999)

  if (defaultWindow) {
    watchThrottled(
      [targetRef, x, y],
      () => {
        const el = unrefElement(targetRef)
        if (!el) {
          return
        }

        if(defaultWindow!.screen?.width <= 800) {
          return
        }

        const { left, top } = el.getBoundingClientRect()

        const eX = x.value - (left + defaultWindow!.scrollX)
        const eY = y.value - (top + defaultWindow!.scrollY)

        // We don't update the value when the mouse to too far away
        if (Math.abs(eX) > 1500 || Math.abs(eY) > 1500) {
          return
        }

        elementX.value = eX
        elementY.value = eY
      },
      { immediate: true, throttle: 50 }
    )
  }

  return {
    x,
    y,
    elementX,
    elementY
  }
}

export function formatDate(d: string | Date, onlyDate = true) {
  const date = dayjs(d)
  if (onlyDate || date.year() === dayjs().year())
    return date.format('M月DD日')
  return date.format('LL')
}

export function lunarCalendar(d: string | Date): LunarDate {

  // 获取农历信息
  const lunarInfo = lunisolar.query(new Date(d))
  const year = `${lunarInfo?.lunar.year}年`
  const rawMonth = lunarInfo?.lunar.month ?? '';
  const month = rawMonth.replace('十一', '冬').replace('十二', '腊');
  const day = lunarInfo?.lunar.date ?? ''
  // 季节
  const season = lunarMonthToSeason(month)
  // 节气
  const solarTerm =  lunarInfo?.solarTerm
  // 月日
  const monthDay = month + day
  return { 
    year, 
    month, 
    day, 
    season,
    solarTerm,
    monthDay 
  }
}

function lunarMonthToSeason(m: string): string {
  // 闰月视为前一个月的延续，使用原基础月获取季节
  const baseMonth = m.replace(/^闰/, '')

  const seasonMap = new Map([
    ['正月', '初春'],['二月', '仲春'],['三月', '暮春'],
    ['四月', '初夏'],['五月', '仲夏'],['六月', '季夏'],
    ['七月', '初秋'],['八月', '仲秋'],['九月', '深秋'],
    ['十月', '初冬'],['冬月', '仲冬'],['腊月', '季冬']
  ])
  return seasonMap.get(baseMonth) ?? m
}
