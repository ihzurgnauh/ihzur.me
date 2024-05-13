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
  // @ts-expect-error: Transition API
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

export function dateToSeason(d: string | Date) {
  const date = dayjs(d)
  const monthToSeasonMap = new Map([
    [3, '初春'],
    [4, '仲春'],
    [5, '暮春'],
    [6, '初夏'],
    [7, '仲夏'],
    [8, '季夏'],
    [9, '初秋'],
    [10, '仲秋'],
    [11, '深秋'],
    [12, '初冬'],
    [1, '仲冬'],
    [2, '季冬'],
  ])
  return monthToSeasonMap.get(date.month() + 1)
}

export function sexagenaryCycleYear(d: string | Date) {
  const currentYear = dayjs(d).year()
  const heavenlyStemMap = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const earthlyBranchMap = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

  // 基数
  const radix = currentYear - 3
  const heavenlyStemRadix = radix % 10
  const earthlyBranchRadix = radix % 12

  // 公元年数先减三，除10余数是天干，基数改用12除，余数便是地支年, 若得0为1之前，即最后一个
  const heavenlyStem = heavenlyStemMap[heavenlyStemRadix === 0 ? 9 : heavenlyStemRadix - 1]
  const earthlyBranch = earthlyBranchMap[earthlyBranchRadix === 0 ? 11 : earthlyBranchRadix - 1]

  return `${heavenlyStem + earthlyBranch}年`
}
