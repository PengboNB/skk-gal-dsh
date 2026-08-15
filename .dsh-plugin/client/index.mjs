import { CSS } from './styles.mjs'
import { SkirkGal } from './SkirkGal.jsx'
import { SkirkQuickSettings } from './SkirkQuickSettings.jsx'
import backgroundUrl from '../../assets/abyss-background.png'
import skirkUrl from '../../assets/skirk-hd.png'
import newChatBackgroundUrl from '../../assets/new-chat-background.webp'
import sidebarArtUrl from '../../assets/sidebar-abyss.png'

export const name = 'skk-gal'
export const inject = ['slots', 'connection']

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
