import { CSS } from './styles.mjs'
import { SkirkGal } from './SkirkGal.jsx'
import { SkirkQuickSettings } from './SkirkQuickSettings.jsx'
import backgroundUrl from '../../assets/abyss-background.png'
import skirkUrl from '../../assets/skirk-hd.png'
import newChatBackgroundUrl from '../../assets/new-chat-background.webp'
import sidebarArtUrl from '../../assets/sidebar-abyss.png'

export const name = 'skk-gal'
export const inject = ['slots', 'connection']

const AUTO_OPEN_KEY = 'skk-gal:auto-open-theater-until'

function textOf(node) {
  return (node?.textContent || '').replace(/\s+/g, '').trim()
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
    const target = event.target
    if (!target?.closest?.('[data-slot="conversation.composer"]')) return
    if (event.type === 'keydown' && (event.key !== 'Enter' || event.shiftKey || event.isComposing)) return
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

export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.skkGal = '1'
  style.textContent = CSS
  document.head.appendChild(style)
  document.body.classList.add('skk-global-enabled')
  document.body.style.setProperty('--skk-global-background', `url("${backgroundUrl}")`)
  document.body.style.setProperty('--skk-newchat-background', `url("${newChatBackgroundUrl}")`)
  document.body.style.setProperty('--skk-global-character', `url("${skirkUrl}")`)
  document.body.style.setProperty('--skk-global-sidebar', `url("${sidebarArtUrl}")`)
  ctx.effect(() => () => {
    style.remove()
    document.body.classList.remove('skk-global-enabled')
    document.body.style.removeProperty('--skk-global-background')
    document.body.style.removeProperty('--skk-newchat-background')
    document.body.style.removeProperty('--skk-global-character')
    document.body.style.removeProperty('--skk-global-sidebar')
  }, 'skk-gal:styles')
  installAutoTheaterSwitch(ctx)

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'skk-gal',
    order: 6,
    label: () => '丝柯克剧场',
  }, SkirkGal))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skk-gal-settings',
    order: 18,
    label: () => 'GAL 视窗',
    inject: () => ({ api: ctx.connection.api }),
  }, SkirkQuickSettings))
}
