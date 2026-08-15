import React, { useEffect, useState } from 'react'
import { loadSettings, saveLocalSettings, syncReplyStyle } from './SkirkGal.jsx'

export function SkirkQuickSettings() {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    saveLocalSettings(settings, true)
    syncReplyStyle(settings.replyStyle)
  }, [settings])

  const openTheater = () => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find(node => node.textContent?.trim() === '丝柯克剧场')
    tab?.click()
    const close = [...document.querySelectorAll('[role="dialog"] button')].find(node => node.textContent?.trim() === '关闭')
    close?.click()
  }

  return <section className="skk-quick-settings">
    <div className="skk-quick-intro"><div><strong>丝柯克剧场</strong><p>快速调整 GAL 视窗与角色回复风格。</p></div><button type="button" onClick={openTheater}>打开剧场</button></div>
    <label>玩家名称<input value={settings.playerName} maxLength={20} onChange={e => setSettings(s => ({ ...s, playerName: e.target.value }))} /></label>
    <label>打字速度<select value={settings.speed} onChange={e => setSettings(s => ({ ...s, speed: e.target.value }))}><option value="slow">慢</option><option value="normal">正常</option><option value="fast">快</option></select></label>
    <label>角色动态<select value={settings.motion ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, motion: e.target.value === 'on' }))}><option value="on">启用</option><option value="off">关闭</option></select></label>
    <label>回复风格<select value={settings.replyStyle ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, replyStyle: e.target.value === 'on' }))}><option value="on">启用丝柯克风格</option><option value="off">使用原始风格</option></select></label>
    <p className="skk-quick-note">配置保存在本机用户目录；回复风格仅在剧场视图打开时生效。</p>
  </section>
}
