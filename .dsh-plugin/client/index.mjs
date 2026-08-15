import { CSS } from './styles.mjs'
import { SkirkGal } from './SkirkGal.jsx'
import { SkirkQuickSettings } from './SkirkQuickSettings.jsx'

export const name = 'skk-gal'
export const inject = ['slots']

export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.skkGal = '1'
  style.textContent = CSS
  document.head.appendChild(style)
  ctx.effect(() => () => style.remove(), 'skk-gal:styles')

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
  }, SkirkQuickSettings))
}
