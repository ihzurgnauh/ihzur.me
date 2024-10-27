import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

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

export function formatDate(d: string | Date, onlyDate = true) {
  const date = dayjs(d)
  if (onlyDate || date.year() === dayjs().year())
    return date.format('M月DD日')
  return date.format('LL')
}

function getLunarCalendar(d: string | Date) {
  const lunarCalendar : {
    year: number,
    month: string
  } = { year: 0, month: '' }

  // 获取农历日期
  const lunarCalendarString = new Date(d).toLocaleString('zh-CN-u-ca-chinese')
  lunarCalendar.year = Number.parseInt(lunarCalendarString.slice(0, 4))
  lunarCalendar.month = lunarCalendarString.slice(5, lunarCalendarString.indexOf('月') + 1)
  return lunarCalendar
}

/**
 * 农历年份转干支纪年
 * @param year 农历年份
 * @returns 干支纪年
 */
function sexagenaryCycleYear(year: number) {
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

export function dateToSeason(d: string | Date) {
  const monthToSeasonMap = new Map([
    ['正月', '初春'],
    ['二月', '仲春'],
    ['三月', '暮春'],
    ['四月', '初夏'],
    ['五月', '仲夏'],
    ['六月', '季夏'],
    ['七月', '初秋'],
    ['八月', '仲秋'],
    ['九月', '深秋'],
    ['十月', '初冬'],
    ['十一月', '仲冬'],
    ['腊月', '季冬'],
  ])
  return monthToSeasonMap.get(getLunarCalendar(d).month)
}

export function getSexagenaryCycleYear(d: string | Date) { 
  return sexagenaryCycleYear(getLunarCalendar(d).year)
}
