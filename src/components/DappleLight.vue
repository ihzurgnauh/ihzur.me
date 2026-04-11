<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useWindowSize, useRafFn, useDebounceFn } from '@vueuse/core'

/**
 * 单个叶片的物理属性与渲染状态
 */
interface Leaf {
  /** 叶片在所处枝干上的相对位置 (0.0 ~ 1.0) */
  t: number
  /** 基于所处枝干切线的初始偏转角度 */
  angle: number
  /** 叶片的缩放系数 */
  scale: number
  /** 关联的离屏叶片纹理索引 (指向 leafPool) */
  leafType: number
  /** X 轴随机位置抖动量 */
  xJitter: number
  /** Y 轴随机位置抖动量 */
  yJitter: number
  /** 叶片绘制透明度 */
  opacity: number
  /** 随风摆动的初始相位 */
  flutterPhase: number
  /** 随风摆动的角速度 */
  flutterSpeed: number
  /** 随风摆动的振幅 */
  flutterAmp: number
}

/**
 * 树枝节点，包含自身的几何信息及子枝干、叶片
 */
interface Branch {
  /** 当前枝干的长度 */
  length: number
  /** 相对父级枝干的初始夹角 */
  baseAngle: number
  /** 当前枝干的线条粗细 */
  thick: number
  /** 枝干自身的物理弯曲度 */
  bow: number
  /** 柔韧度系数，决定受风场影响的形变程度 */
  flexibility: number
  /** 摇曳动画的初始相位 */
  swayPhase: number
  /** 摇曳动画的角速度 */
  swaySpeed: number
  /** 子枝干节点集合 */
  children: Branch[]
  /** 挂载在当前枝干上的叶片集合 */
  leaves: Leaf[]
}

/**
 * 树冠群组实例，管理一组由边缘向内生长的分形树
 */
interface CrownGroup {
  /** 发源点 X 坐标 */
  x: number
  /** 发源点 Y 坐标 */
  y: number
  /** 整体生长的基础基准角 */
  baseAngle: number
  /** 树状数据结构的根节点 */
  tree: Branch | null
  /** 是否标记为远景层（用于视差与景深模糊计算） */
  isFar: boolean
}

// --- Constants & Config (常量与配置) ---

/** 渲染参数配置 */
const CONFIG = {
  nearBlur: 2.3,                // 近景图层的阴影高斯模糊半径 (px)
  farBlur: 9.2,                 // 远景图层的阴影高斯模糊半径 (px)
  nearLeafDensity: 0.88,        // 近景树冠的叶片生成密度乘数
  lightSpotCount: 3,            // 模拟透过树冠产生的丁达尔光斑数量
  fpsCap: 45,                   // 渲染帧率上限，平衡视觉与性能开销
  farScale: 0.42,               // 远景离屏画布的降采样缩放比
  nearScale: 0.82,              // 近景离屏画布的降采样缩放比
  shadowTopBias: 0.24,          // 投影变换时的 Y 轴基准偏移率
  maxShadowCoverageY: 0.72,     // 阴影遮罩向下渐隐的最大覆盖比例
  nearShadowStretchMax: 1.42,   // 太阳高度角极低时，近景阴影的最大拉伸系数
  farShadowStretchMax: 1.62     // 太阳高度角极低时，远景阴影的最大拉伸系数
}

const FRAME_INTERVAL = 1000 / CONFIG.fpsCap
const farColor = '#b8bfb6'
const nearColor = '#7f897d'

// --- State & Contexts (状态与上下文) ---

const el = ref<HTMLCanvasElement | null>(null)
const size = reactive(useWindowSize())

let ctx: CanvasRenderingContext2D
let lastRender = 0
let crownGroups: CrownGroup[] = []

// Off-screen Canvases (离屏画布缓存，用于提升重绘性能)
const crownNear = document.createElement('canvas')
const crownNearCtx = crownNear.getContext('2d')!
const crownFar = document.createElement('canvas')
const crownFarCtx = crownFar.getContext('2d')!
const shadowNear = document.createElement('canvas')
const shadowNearCtx = shadowNear.getContext('2d')!
const shadowFar = document.createElement('canvas')
const shadowFarCtx = shadowFar.getContext('2d')!
const blurNearCanvas = document.createElement('canvas')
const blurNearCtx = blurNearCanvas.getContext('2d')!
const blurFarCanvas = document.createElement('canvas')
const blurFarCtx = blurFarCanvas.getContext('2d')!
const spotCanvas = document.createElement('canvas')
const sctx = spotCanvas.getContext('2d')!

/** 叶片变体纹理池，避免在渲染循环中重复执行复杂的路径绘制 */
const leafPool: HTMLCanvasElement[] = []

// --- Utilities (工具方法) ---

const random = (min: number, max: number) => Math.random() * (max - min) + min
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// --- Texture Initialization (纹理初始化) ---

/**
 * 初始化散落光斑的离屏纹理，基于径向渐变模拟光学漫反射
 */
function initSpotCanvas() {
  spotCanvas.width = 512
  spotCanvas.height = 512
  const g = sctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  sctx.fillStyle = g
  sctx.fillRect(0, 0, 512, 512)
}

/**
 * 构造单片树叶的离屏变体实例
 * @param width 画布宽度
 * @param height 画布高度
 * @param profile 树叶的形态属性种子
 * @returns 预渲染完成的 Canvas 元素
 */
function createLeafVariant(width = 64, height = 64, profile: any = {}) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const cctx = c.getContext('2d')!

  const leafLen = profile.leafLen ?? random(22, 50)
  const leafWidth = profile.leafWidth ?? random(6, 17)
  const bend = profile.bend ?? random(-5, 7)
  const tipSharp = profile.tipSharp ?? random(0.78, 1.32)
  const asym = profile.asym ?? random(0.82, 1.2)

  cctx.translate(10, height / 2)
  cctx.fillStyle = nearColor
  cctx.beginPath()
  cctx.moveTo(0, 0)
  cctx.bezierCurveTo(leafLen * 0.22, -leafWidth * tipSharp, leafLen * 0.58, -leafWidth * 0.58 + bend, leafLen, 0)
  cctx.bezierCurveTo(leafLen * 0.58, leafWidth * 0.72 * asym + bend, leafLen * 0.22, leafWidth * asym, 0, 0)
  cctx.closePath()
  cctx.fill()
  return c
}

/**
 * 构建对象池以存储多样化的树叶变体
 */
function buildLeafPool() {
  leafPool.length = 0
  for (let i = 0; i < 10; i++) leafPool.push(createLeafVariant())
}

// --- Fractal Generation (分形生成算法) ---

/**
 * 递归算法生成具有层次感的分形树干网络
 * @param length 枝干预期长度
 * @param thick 枝干起点粗细
 * @param angle 相对父节点的偏向角
 * @param depth 当前递归深度
 * @param isFar 是否标记为远景分支
 * @returns 构建完毕的 Branch 树结构，或达到阈值返回 null
 */
function growBranch(length: number, thick: number, angle: number, depth: number, isFar: boolean): Branch | null {
  if (depth === 0 || thick < 0.45) return null

  const branch: Branch = {
    length: length * random(0.82, 1.12),
    baseAngle: angle + random(-0.08, 0.08),
    thick: thick * random(0.9, 1.05),
    bow: random(-0.28, 0.28),
    flexibility: (6 - depth) * (isFar ? 0.012 : 0.028),
    swayPhase: random(0, Math.PI * 2),
    swaySpeed: random(0.001, 0.0028),
    children: [],
    leaves: []
  }

  // 延展主枝干
  const mainChild = growBranch(length * random(0.66, 0.9), thick * random(0.68, 0.78), random(-0.28, 0.28), depth - 1, isFar)
  if (mainChild) branch.children.push(mainChild)

  // 概率性生成主要分叉副枝
  if (depth > 1 && Math.random() > 0.25) {
    const sideAngle = Math.random() > 0.5 ? random(0.45, 1.18) : random(-1.18, -0.45)
    const sideChild = growBranch(length * random(0.34, 0.64), thick * random(0.45, 0.6), sideAngle, depth - 1, isFar)
    if (sideChild) branch.children.push(sideChild)
  }

  // 概率性生成次要微细副枝
  if (depth > 2 && Math.random() > 0.72) {
    const sideAngle2 = Math.random() > 0.5 ? random(0.2, 0.8) : random(-0.8, -0.2)
    const extraChild = growBranch(length * random(0.24, 0.48), thick * random(0.34, 0.5), sideAngle2, depth - 1, isFar)
    if (extraChild) branch.children.push(extraChild)
  }

  // 处于枝干末端时，执行叶片的实例化挂载
  if (!isFar && depth <= 4 && thick < 4.2) {
    let numLeaves = Math.floor(branch.length / random(15, 26))
    numLeaves = Math.floor(numLeaves * CONFIG.nearLeafDensity * random(0.85, 1.45))

    for (let i = 0; i < numLeaves; i++) {
      if (Math.random() < 0.18) continue
      const leafType = Math.floor(random(0, leafPool.length))
      const sizeSeed = Math.random()
      let scale = sizeSeed < 0.42 ? random(0.28, 0.62) : sizeSeed < 0.82 ? random(0.68, 1.02) : random(1.08, 1.68)

      branch.leaves.push({
        t: random(0.06, 0.94),
        angle: (Math.random() > 0.5 ? 1 : -1) * random(0.35, 1.55),
        scale,
        leafType,
        xJitter: random(-7, 7),
        yJitter: random(-7, 7),
        opacity: random(0.68, 1),
        flutterPhase: random(0, Math.PI * 2),
        flutterSpeed: random(0.0015, 0.0038),
        flutterAmp: random(0.16, 0.4)
      })
    }
  }

  return branch
}

/**
 * 在屏幕边缘随机生成并初始化树冠群组
 * @param isFar 该群组是否为远景层
 */
function createCrownGroup(isFar = false): CrownGroup {
  const side = Math.floor(random(0, 4))
  let x = 0, y = 0, baseAngle = 0
  const { width: w, height: h } = size

  if (side === 0) {
    x = w * random(0.1, 0.9); y = h * random(-0.24, -0.06); baseAngle = random(1.08, 2.02)
  } else if (side === 1) {
    x = w * random(-0.22, 0.02); y = h * random(-0.18, 0.08); baseAngle = random(0.42, 1.18)
  } else if (side === 2) {
    x = w * random(0.98, 1.22); y = h * random(-0.18, 0.08); baseAngle = random(1.96, 2.72)
  } else {
    x = w * random(0.24, 0.76); y = h * random(-0.28, -0.08); baseAngle = random(1.16, 1.94)
  }

  return {
    x, y, baseAngle,
    tree: growBranch(h * random(isFar ? 0.15 : 0.12, isFar ? 0.24 : 0.22), random(isFar ? 6.8 : 2.4, isFar ? 11.5 : 5.4), 0, isFar ? 4 : 5, isFar),
    isFar
  }
}

// --- Render Engine (渲染管线) ---

/**
 * 递归计算并渲染树枝及其子级组件，附加环境风扰动运算
 * @param context 目标渲染上下文
 * @param node 正在处理的枝干节点
 * @param startX 节点绝对坐标 X
 * @param startY 节点绝对坐标 Y
 * @param parentAbsAngle 继承自父级的空间绝对角度
 * @param time 全局时间戳
 * @param globalWind 宏观风场强度
 */
function drawBranch(context: CanvasRenderingContext2D, node: Branch | null, startX: number, startY: number, parentAbsAngle: number, time: number, globalWind: number) {
  if (!node) return

  const localSway = Math.sin(time * node.swaySpeed + node.swayPhase) * node.flexibility +
                    Math.sin(time * node.swaySpeed * 1.7 + node.swayPhase * 1.3) * node.flexibility * 0.42
  const absAngle = parentAbsAngle + node.baseAngle + localSway + globalWind * node.flexibility * 1.35

  const endX = startX + Math.cos(absAngle) * node.length
  const endY = startY + Math.sin(absAngle) * node.length
  const ctrlX = startX + Math.cos(absAngle + node.bow) * node.length * 0.52
  const ctrlY = startY + Math.sin(absAngle + node.bow) * node.length * 0.52

  // 渲染枝干贝塞尔曲线
  context.beginPath()
  context.moveTo(startX, startY)
  context.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
  context.lineWidth = node.thick
  context.stroke()

  // 迭代并挂载关联叶片实体
  for (let i = 0; i < node.leaves.length; i++) {
    const leaf = node.leaves[i]
    const mt = 1 - leaf.t
    const lx = mt * mt * startX + 2 * mt * leaf.t * ctrlX + leaf.t * leaf.t * endX + leaf.xJitter
    const ly = mt * mt * startY + 2 * mt * leaf.t * ctrlY + leaf.t * leaf.t * endY + leaf.yJitter
    const dx = 2 * mt * (ctrlX - startX) + 2 * leaf.t * (endX - ctrlX)
    const dy = 2 * mt * (ctrlY - startY) + 2 * leaf.t * (endY - ctrlY)
    const curveAngle = Math.atan2(dy, dx)

    const flutter = Math.sin(time * leaf.flutterSpeed + leaf.flutterPhase) * leaf.flutterAmp +
                    Math.sin(time * leaf.flutterSpeed * 1.9 + leaf.flutterPhase * 1.1) * leaf.flutterAmp * 0.3

    context.save()
    context.globalAlpha = leaf.opacity
    context.translate(lx, ly)
    context.rotate(curveAngle + leaf.angle + flutter)
    context.scale(leaf.scale, leaf.scale)
    context.drawImage(leafPool[leaf.leafType], -6, -26)
    context.restore()
  }

  // 向下推进分形树图的遍历
  for (let i = 0; i < node.children.length; i++) {
    drawBranch(context, node.children[i], endX, endY, absAngle, time, globalWind)
  }
}

/**
 * 遍历集合并向离屏缓冲渲染所有树冠层级
 * @param now 当前时间戳，用于驱动缓动动画
 */
function renderCrownLayers(now: number) {
  const { width: w, height: h } = size
  crownNearCtx.clearRect(0, 0, w, h)
  crownFarCtx.clearRect(0, 0, w, h)

  crownNearCtx.lineCap = 'round'
  crownFarCtx.lineCap = 'round'
  crownNearCtx.strokeStyle = nearColor
  crownFarCtx.strokeStyle = farColor

  const globalWind = Math.sin(now * 0.00008) * 0.52 + Math.sin(now * 0.000021) * 0.24

  for (let i = 0; i < crownGroups.length; i++) {
    const root = crownGroups[i]
    if (root.isFar) {
      drawBranch(crownFarCtx, root.tree, root.x, root.y, root.baseAngle, now, globalWind)
    } else {
      drawBranch(crownNearCtx, root.tree, root.x, root.y, root.baseAngle, now, globalWind)
    }
  }
}

/**
 * 计算虚拟的太阳天文参数
 * @returns 包含时间戳百分比、太阳倾角及高度角的集合对象
 */
function getSunState() {
  const nowDate = new Date()
  const hour = nowDate.getHours() + nowDate.getMinutes() / 60 + nowDate.getSeconds() / 3600
  const t = clamp((hour - 6) / 12, 0, 1)
  const sunAngle = lerp(-1.05, 1.05, t)
  const sunElevation = Math.sin(t * Math.PI)
  return { t, hour, sunAngle, sunElevation }
}

/**
 * 应用投影与透视变换，将原生的垂直树冠投射为平面的阴影
 * @param srcCanvas 源树冠离屏缓冲区
 * @param dstCtx 目标投影渲染上下文
 * @param now 时间戳，提供轻微坐标扰动
 * @param isFar 指示是否应用远景渲染参数
 */
function projectShadowLayer(srcCanvas: HTMLCanvasElement, dstCtx: CanvasRenderingContext2D, now: number, isFar = false) {
  const { width: w, height: h } = size
  dstCtx.clearRect(0, 0, w, h)

  const sun = getSunState()
  const stretchMin = isFar ? 1.12 : 1.04
  const stretchMax = isFar ? CONFIG.farShadowStretchMax : CONFIG.nearShadowStretchMax
  const shadowStretch = lerp(stretchMin, stretchMax, 1 - sun.sunElevation)

  const lateralPower = 28 + (1 - sun.sunElevation) * 42
  const shadowOffsetX = Math.sin(sun.sunAngle) * lateralPower

  const baseY = h * CONFIG.shadowTopBias
  const verticalDrift = (1 - sun.sunElevation) * 20
  const driftX = Math.sin(now * 0.00011 + (isFar ? 1.2 : 0)) * (isFar ? 7 : 5)
  const driftY = Math.cos(now * 0.00009 + (isFar ? 0.7 : 0)) * (isFar ? 4 : 3)

  dstCtx.save()
  // 斜切变形（模拟三维投射的二维扭曲）
  dstCtx.translate(w * 0.5 + shadowOffsetX + driftX, baseY + verticalDrift + driftY)
  dstCtx.rotate(Math.sin(sun.sunAngle) * 0.05)
  dstCtx.transform(1, Math.tan(sun.sunAngle) * 0.07, 0, shadowStretch, 0, 0)
  dstCtx.translate(-w * 0.5, -h * 0.34)
  dstCtx.globalAlpha = isFar ? 0.68 : 1
  dstCtx.drawImage(srcCanvas, 0, 0)
  dstCtx.restore()

  // 施加底向渐隐蒙版，平滑过渡屏幕下方边缘
  dstCtx.save()
  dstCtx.globalCompositeOperation = 'destination-in'
  const fadeStart = h * 0.58
  const fadeEnd = h * CONFIG.maxShadowCoverageY
  const maskGrad = dstCtx.createLinearGradient(0, 0, 0, h)
  maskGrad.addColorStop(0, 'rgba(255,255,255,1)')
  maskGrad.addColorStop(fadeStart / h, 'rgba(255,255,255,1)')
  maskGrad.addColorStop(fadeEnd / h, 'rgba(255,255,255,0.82)')
  maskGrad.addColorStop(1, 'rgba(255,255,255,0)')
  dstCtx.fillStyle = maskGrad
  dstCtx.fillRect(0, 0, w, h)
  dstCtx.restore()
}

/**
 * 绘制动态光斑（丁达尔效应/林间漏光），基于加色混合(Screen)叠加到主画布
 * @param now 时间戳
 */
function drawLightSpots(now: number) {
  const { width: w, height: h } = size
  const sun = getSunState()

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.15 + sun.sunElevation * 0.14

  const lightBiasX = Math.sin(sun.sunAngle) * w * 0.14
  const lightBiasY = -(sun.sunElevation * h * 0.06) + (1 - sun.sunElevation) * 18

  for (let i = 0; i < CONFIG.lightSpotCount; i++) {
    const sx = w * 0.5 + lightBiasX + Math.sin(now * 0.00009 + i * 2.2) * w * 0.22
    const sy = h * 0.28 + lightBiasY + Math.cos(now * 0.00013 + i * 1.4) * h * 0.12
    const sr = Math.min(w, h) * (0.16 + sun.sunElevation * 0.06) + Math.sin(now * 0.00018 + i) * 24
    ctx.drawImage(spotCanvas, sx - sr, sy - sr, sr * 2, sr * 2)
  }
  ctx.restore()
}

/**
 * 初始化应用实例，设置主画布及相关缓冲区像素密度与容器缩放尺寸
 */
function init() {
  if (!el.value) return
  const w = size.width
  const h = size.height
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

  el.value.width = Math.floor(w * dpr)
  el.value.height = Math.floor(h * dpr)
  ctx = el.value.getContext('2d', { alpha: false })!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  ;[crownNear, crownFar, shadowNear, shadowFar].forEach(c => {
    c.width = w
    c.height = h
  })

  blurNearCanvas.width = Math.floor(w * CONFIG.nearScale)
  blurNearCanvas.height = Math.floor(h * CONFIG.nearScale)
  blurFarCanvas.width = Math.floor(w * CONFIG.farScale)
  blurFarCanvas.height = Math.floor(h * CONFIG.farScale)

  crownGroups = []
  for (let i = 0; i < 5; i++) crownGroups.push(createCrownGroup(false))
  for (let i = 0; i < 2; i++) crownGroups.push(createCrownGroup(true))
}

// 绑定防抖事件监听：当浏览器窗口调整时重新构建分形及画布池
const handleResize = useDebounceFn(() => init(), 250)
watch([() => size.width, () => size.height], handleResize)

// 挂载主渲染循环 (Request Animation Frame Hook)
const { resume } = useRafFn(({ timestamp }) => {
  if (timestamp - lastRender < FRAME_INTERVAL) return
  lastRender = timestamp

  const { width: w, height: h } = size
  const now = timestamp

  renderCrownLayers(now)
  projectShadowLayer(crownFar, shadowFarCtx, now, true)
  projectShadowLayer(crownNear, shadowNearCtx, now, false)

  // 刷新主帧底色
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  // 应用远景模糊并绘制至屏幕
  blurFarCtx.clearRect(0, 0, blurFarCanvas.width, blurFarCanvas.height)
  blurFarCtx.save()
  blurFarCtx.filter = `blur(${CONFIG.farBlur}px)`
  blurFarCtx.globalAlpha = 0.42
  blurFarCtx.drawImage(shadowFar, 0, 0, blurFarCanvas.width, blurFarCanvas.height)
  blurFarCtx.restore()
  ctx.drawImage(blurFarCanvas, 0, 0, w, h)

  // 应用近景模糊并绘制至屏幕
  blurNearCtx.clearRect(0, 0, blurNearCanvas.width, blurNearCanvas.height)
  blurNearCtx.save()
  blurNearCtx.filter = `blur(${CONFIG.nearBlur}px)`
  blurNearCtx.globalAlpha = 1
  blurNearCtx.drawImage(shadowNear, 0, 0, blurNearCanvas.width, blurNearCanvas.height)
  blurNearCtx.restore()
  ctx.drawImage(blurNearCanvas, 0, 0, w, h)

  // 保留轻微锐利度的投影图层，强化明暗交界层理质感
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.drawImage(shadowNear, 0, 0)
  ctx.restore()

  drawLightSpots(now)
}, { immediate: false })

onMounted(() => {
  initSpotCanvas()
  buildLeafPool()
  init()
  resume()
})
</script>

<template>
  <div
    class="fixed inset-0 pointer-events-none print:hidden"
    style="z-index: 100; mix-blend-mode: multiply; opacity: 0.9;"
  >
    <canvas ref="el" class="w-full h-full" />
  </div>
</template>
