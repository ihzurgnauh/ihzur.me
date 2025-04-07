import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { defaultWindow, watchThrottled, unrefElement } from '@vueuse/core'
import type { MaybeElementRef, MouseInElementOptions } from '@vueuse/core'
import { createSharedComposable, useMouse } from '@vueuse/core'
import type { LunarDate } from '~/types'

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
  const lunarDayDic = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ]

  // 获取农历日期
  const lunarCalendarString = new Date(d).toLocaleString('zh-CN-u-ca-chinese')
  const monthIndex = lunarCalendarString?.indexOf('月')
  // 干支年
  const year = sexagenaryCycleYear(Number.parseInt(lunarCalendarString?.slice(0, 4)))
  // 农历月
  const month = lunarCalendarString?.slice(5, monthIndex + 1)?.replace('十一月', '冬月')
  // 农历日
  const day = lunarDayDic[Number.parseInt(lunarCalendarString?.slice(monthIndex + 1, lunarCalendarString?.indexOf(' '))) - 1]
  // 季节
  const season = lunarMonthToSeason(month)
  // 月日
  const date = month + day
  return { 
    year, 
    month, 
    day, 
    season, 
    date 
  }
}

/**
 * 农历年份转干支纪年
 * @param year 农历年份
 * @returns 干支纪年
 */
function sexagenaryCycleYear(year: number): string {
  // 天干
  const heavenlyStemMap = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  // 地支
  const earthlyBranchMap = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  // 基数
  const radix = year - 3
  // 公元年数先减三，除10余数是天干，基数改用12除，余数便是地支年, 若得0为1之前，即最后一个
  const heavenlyStemRadix = radix % 10
  const earthlyBranchRadix = radix % 12

  const heavenlyStem = heavenlyStemMap[heavenlyStemRadix === 0 ? 9 : heavenlyStemRadix - 1]
  const earthlyBranch = earthlyBranchMap[earthlyBranchRadix === 0 ? 11 : earthlyBranchRadix - 1]

  return `${heavenlyStem + earthlyBranch}年`
}

function lunarMonthToSeason(m: string): string {
  const seasonMap = new Map([
    ['正月', '初春'],['二月', '仲春'],['三月', '暮春'],
    ['四月', '初夏'],['五月', '仲夏'],['六月', '季夏'],
    ['七月', '初秋'],['八月', '仲秋'],['九月', '深秋'],
    ['十月', '初冬'],['冬月', '仲冬'],['腊月', '季冬']
  ])
  return seasonMap.get(m) ?? m
}
