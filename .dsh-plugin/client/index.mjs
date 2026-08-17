import { CSS } from './styles.mjs'
import { SkirkGal } from './SkirkGal.jsx'
import { SkirkQuickSettings } from './SkirkQuickSettings.jsx'
import backgroundUrl from '../../assets/abyss-background.png'
import skirkUrl from '../../assets/skirk-hd.png'
import newChatBackgroundUrl from '../../assets/new-chat-background.webp'
import sidebarArtUrl from '../../assets/sidebar-abyss.png'

export const name = 'skk-gal'
export const inject = ['slots', 'connection', 'sessions']

const AUTO_OPEN_KEY = 'skk-gal:auto-open-theater-until'
const SETTINGS_KEY = 'skk-gal:settings'
const SIDEBAR_WIDTH_KEY = 'skk-gal:sidebar-width'
const THEME_EVENT = 'skk-gal:settings-changed'
const MIN_SIDEBAR_WIDTH = 64
const DEFAULT_SIDEBAR_WIDTH = 248

function textOf(node) {
  return (node?.textContent || '').replace(/\s+/g, '').trim()
}

function localSettings() {
  try {
    return { themeEnabled: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return { themeEnabled: true }
  }
}

function themeEnabled(settings = localSettings()) {
  return settings.themeEnabled !== false
}

function activeTabLabel() {
  return textOf([...document.querySelectorAll('[role="tab"]')].find(tab => tab.getAttribute('aria-selected') === 'true'))
}

function findSkirkTab() {
  return [...document.querySelectorAll('[role="tab"]')].find(tab => textOf(tab) === '丝柯克剧场')
}

function tryOpenSkirkTheater() {
  const until = Number(sessionStorage.getItem(AUTO_OPEN_KEY) || 0)
  if (!until || Date.now() > until) {
    sessionStorage.removeItem(AUTO_OPEN_KEY)
    return
  }
  const tab = findSkirkTab()
  if (!tab || tab.getAttribute('aria-selected') === 'true') {
    if (tab) sessionStorage.removeItem(AUTO_OPEN_KEY)
    return
  }
  const selected = activeTabLabel()
  if (selected && selected !== '对话') return
  tab.click()
  sessionStorage.removeItem(AUTO_OPEN_KEY)
}

function installAutoTheaterSwitch(ctx) {
  const arm = event => {
    if (!themeEnabled()) return
    const target = event.target
    const composer = target?.closest?.('[data-slot="conversation.composer"]')
    if (!composer) return
    if (event.type === 'keydown') {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
      if (!target?.matches?.('textarea,input,[contenteditable="true"]')) return
    } else if (event.type === 'click') {
      const button = target?.closest?.('button,[role="button"]')
      const label = `${button?.textContent || ''} ${button?.getAttribute?.('aria-label') || ''} ${button?.getAttribute?.('title') || ''}`.trim()
      if (!/发送|send/i.test(label)) return
    } else {
      return
    }
    sessionStorage.setItem(AUTO_OPEN_KEY, String(Date.now() + 45_000))
    setTimeout(tryOpenSkirkTheater, 300)
    setTimeout(tryOpenSkirkTheater, 1_500)
    setTimeout(tryOpenSkirkTheater, 5_000)
  }
  const observer = new MutationObserver(tryOpenSkirkTheater)
  document.addEventListener('click', arm, true)
  document.addEventListener('keydown', arm, true)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] })
  ctx.effect(() => () => {
    document.removeEventListener('click', arm, true)
    document.removeEventListener('keydown', arm, true)
    observer.disconnect()
  }, 'skk-gal:auto-open-theater')
}

function setThemeVars(enabled) {
  document.body.classList.toggle('skk-global-enabled', enabled)
  if (enabled) {
    document.body.style.setProperty('--skk-global-background', `url("${backgroundUrl}")`)
    document.body.style.setProperty('--skk-newchat-background', `url("${newChatBackgroundUrl}")`)
    document.body.style.setProperty('--skk-global-character', `url("${skirkUrl}")`)
    document.body.style.setProperty('--skk-global-sidebar', `url("${sidebarArtUrl}")`)
  } else {
    document.body.classList.remove('skk-host-active', 'skk-sidebar-collapsed', 'skk-sidebar-dragging')
    document.body.style.removeProperty('--skk-global-background')
    document.body.style.removeProperty('--skk-newchat-background')
    document.body.style.removeProperty('--skk-global-character')
    document.body.style.removeProperty('--skk-global-sidebar')
  }
}

function installThemeState(ctx) {
  const apply = event => setThemeVars(themeEnabled(event?.detail || localSettings()))
  apply()
  window.addEventListener(THEME_EVENT, apply)
  window.addEventListener('storage', apply)
  ctx.effect(() => () => {
    window.removeEventListener(THEME_EVENT, apply)
    window.removeEventListener('storage', apply)
    setThemeVars(false)
  }, 'skk-gal:theme-state')
}

function sidebarWidthLimit() {
  return Math.max(MIN_SIDEBAR_WIDTH, Math.floor(window.innerWidth / 3))
}

function clampSidebarWidth(width) {
  const value = Number(width)
  if (!Number.isFinite(value)) return DEFAULT_SIDEBAR_WIDTH
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(sidebarWidthLimit(), Math.round(value)))
}

function sidebarElements() {
  const panel = document.querySelector('[data-slot="sidebar"] > div')
  const center = document.querySelector('.pI_x6G_centerCol')
  const frame = center?.parentElement || null
  const collapsed = !!document.querySelector('[data-slot="sidebar"] [aria-label="打开侧边栏"]')
  return { panel, center, frame, collapsed }
}

function clearSidebarWidth(panel, frame) {
  if (!panel) return
  for (const property of ['width', 'min-width', 'max-width', 'flex-basis', 'flex-shrink']) panel.style.removeProperty(property)
  frame?.style?.removeProperty('grid-template-columns')
}

function applySidebarWidth(width, elements = sidebarElements(), rightColumn = null) {
  const { panel, frame, collapsed } = elements
  if (!panel) return
  const enabled = themeEnabled()
  if (!enabled) {
    clearSidebarWidth(panel, frame)
    return
  }
  const target = collapsed ? MIN_SIDEBAR_WIDTH : clampSidebarWidth(width)
  panel.style.setProperty('width', `${target}px`, 'important')
  panel.style.setProperty('min-width', `${target}px`, 'important')
  panel.style.setProperty('max-width', `${target}px`, 'important')
  panel.style.setProperty('flex-basis', `${target}px`, 'important')
  panel.style.setProperty('flex-shrink', '0', 'important')
  if (frame) {
    const right = rightColumn ?? getComputedStyle(frame).gridTemplateColumns.split(/\s+/)[2] ?? '0px'
    frame.style.setProperty('grid-template-columns', `${target}px minmax(0, 1fr) ${right}`, 'important')
  }
  document.body.classList.toggle('skk-sidebar-collapsed', collapsed)
  document.body.style.setProperty('--skk-sidebar-current-width', `${target}px`)
  return target
}

function storedSidebarWidth() {
  return clampSidebarWidth(localStorage.getItem(SIDEBAR_WIDTH_KEY) || DEFAULT_SIDEBAR_WIDTH)
}

function installSidebarResize(ctx) {
  const handle = document.createElement('div')
  handle.className = 'skk-sidebar-resizer'
  handle.setAttribute('role', 'separator')
  handle.setAttribute('aria-label', '调整侧边栏宽度')
  handle.setAttribute('aria-orientation', 'vertical')
  document.body.appendChild(handle)
  let dragging = false
  let raf = 0
  let dragRaf = 0
  let pendingWidth = 0
  let dragElements = null
  let dragRightColumn = '0px'
  const place = () => {
    if (dragging) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const elements = sidebarElements()
      const { panel, collapsed } = elements
      const enabled = themeEnabled()
      if (panel && enabled) applySidebarWidth(storedSidebarWidth(), elements)
      if (!panel || !enabled || collapsed) {
        handle.style.display = 'none'
        if (panel && !enabled) clearSidebarWidth(panel, elements.frame)
        return
      }
      const rect = panel.getBoundingClientRect()
      handle.style.display = 'block'
      handle.style.left = `${Math.max(0, rect.right - 3)}px`
      handle.style.height = `${Math.max(window.innerHeight, rect.height)}px`
    })
  }
  const pointerMove = event => {
    if (!dragging) return
    pendingWidth = clampSidebarWidth(event.clientX)
    if (dragRaf) return
    dragRaf = requestAnimationFrame(() => {
      dragRaf = 0
      const applied = applySidebarWidth(pendingWidth, dragElements, dragRightColumn)
      if (applied) handle.style.left = `${Math.max(0, applied - 3)}px`
    })
  }
  const pointerUp = () => {
    if (!dragging) return
    if (dragRaf) {
      cancelAnimationFrame(dragRaf)
      dragRaf = 0
      const applied = applySidebarWidth(pendingWidth, dragElements, dragRightColumn)
      if (applied) handle.style.left = `${Math.max(0, applied - 3)}px`
    }
    if (pendingWidth) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(pendingWidth)))
    dragging = false
    dragElements = null
    document.body.classList.remove('skk-sidebar-dragging')
    place()
  }
  handle.addEventListener('pointerdown', event => {
    if (!themeEnabled()) return
    dragElements = sidebarElements()
    if (!dragElements.panel || dragElements.collapsed) return
    const columns = dragElements.frame ? getComputedStyle(dragElements.frame).gridTemplateColumns.split(/\s+/) : []
    dragRightColumn = columns[2] ?? '0px'
    pendingWidth = dragElements.panel.getBoundingClientRect().width || storedSidebarWidth()
    dragging = true
    document.body.classList.add('skk-sidebar-dragging')
    handle.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  })
  document.addEventListener('pointermove', pointerMove)
  document.addEventListener('pointerup', pointerUp)
  window.addEventListener(THEME_EVENT, place)
  window.addEventListener('resize', place)
  const observer = new MutationObserver(place)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'class'] })
  place()
  ctx.effect(() => () => {
    cancelAnimationFrame(raf)
    cancelAnimationFrame(dragRaf)
    handle.remove()
    document.removeEventListener('pointermove', pointerMove)
    document.removeEventListener('pointerup', pointerUp)
    window.removeEventListener(THEME_EVENT, place)
    window.removeEventListener('resize', place)
    observer.disconnect()
    const { panel, frame } = sidebarElements()
    clearSidebarWidth(panel, frame)
    document.body.classList.remove('skk-sidebar-collapsed', 'skk-sidebar-dragging')
  }, 'skk-gal:sidebar-resize')
}

function installTheaterViewRegistration(ctx, switchPermission) {
  let disposeTheater = null
  const chatTab = () => [...document.querySelectorAll('[role="tab"]')].find(tab => textOf(tab) === '对话')
  const closeTheater = () => {
    if (activeTabLabel() === '丝柯克剧场') chatTab()?.click()
    disposeTheater?.()
    disposeTheater = null
  }
  const openTheater = () => {
    if (disposeTheater || !themeEnabled()) return
    disposeTheater = ctx.slots.inject('conversation.view', () => ctx.slots.register({
      name: 'conversation.view',
      id: 'skk-gal',
      order: 6,
      label: () => '丝柯克剧场',
      inject: () => ({ switchPermission }),
    }, SkirkGal))
  }
  const reconcile = event => themeEnabled(event?.detail || localSettings()) ? openTheater() : closeTheater()
  reconcile()
  window.addEventListener(THEME_EVENT, reconcile)
  window.addEventListener('storage', reconcile)
  ctx.effect(() => () => {
    window.removeEventListener(THEME_EVENT, reconcile)
    window.removeEventListener('storage', reconcile)
    closeTheater()
  }, 'skk-gal:theater-view-registration')
}

export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.skkGal = '1'
  style.textContent = CSS
  document.head.appendChild(style)
  ctx.effect(() => () => {
    style.remove()
  }, 'skk-gal:styles')
  installThemeState(ctx)
  installSidebarResize(ctx)
  installAutoTheaterSwitch(ctx)
  const switchPermission = async (sessionId, preset) => {
    const live = ctx.sessions.binding(sessionId)?.session
    if (!live) throw new Error('当前会话尚未就绪，无法切换权限')
    const result = await live.command(`/permission ${preset}`)
    if (!result?.ok) throw new Error(result?.error?.message || '权限切换失败')
    if (!result.value?.matched) throw new Error('当前 DSH 没有提供 /permission 命令')
    return true
  }
  installTheaterViewRegistration(ctx, switchPermission)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skk-gal-settings',
    order: 18,
    label: () => 'GAL 视窗',
    inject: () => ({ api: ctx.connection.api }),
  }, SkirkQuickSettings))
}
