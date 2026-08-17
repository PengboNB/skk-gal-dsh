import React, { useEffect, useState } from 'react'
import { loadSettings, saveLocalSettings, syncReplyStyle } from './SkirkGal.jsx'

function rpcValue(response) {
  if (response?.result?.ok) return response.result.value
  throw new Error(response?.result?.error?.message || 'DSH 接口调用失败')
}

function sessionTitle(item) {
  const title = item.projections?.values?.title
  return typeof title === 'string' && title.trim() ? title : item.blank ? '空白会话' : '未命名会话'
}

function SessionManager({ api }) {
  const [rows, setRows] = useState([])
  const [trash, setTrash] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const [sessions, workspaces, trashResponse] = await Promise.all([api.sessions.list({}), api.workspace.list({}), fetch('/skk-gal/session-trash', { cache: 'no-store' })])
      if (!trashResponse.ok) throw new Error('无法读取会话回收站')
      const trashState = await trashResponse.json()
      const sessionItems = rpcValue(sessions).items
      const archive = new Set(rpcValue(workspaces).archivedSessionIds)
      setRows(sessionItems.map(item => ({ ...item, archived: archive.has(item.sessionId) })))
      setTrash(Array.isArray(trashState.trash) ? trashState.trash : [])
      setPending(Array.isArray(trashState.pending) ? trashState.pending : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法读取会话')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const archive = async sessionId => {
    try {
      rpcValue(await api.workspace.archiveSession({ sessionId }))
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '归档失败')
    }
  }

  const trashAction = async (action, item) => {
    const title = action === 'queue' ? sessionTitle(item) : item.title
    const verb = action === 'queue' ? '移入回收站' : action === 'restore' ? '恢复' : '永久删除'
    const confirm = window.prompt(`请输入会话标题“${title}”确认${verb}：`)
    if (confirm === null) return
    setError('')
    try {
      const response = await fetch('/skk-gal/session-trash', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, sessionId: item.sessionId, trashId: item.trashId, title, cwd: item.cwd, confirm }) })
      const value = await response.json()
      if (!response.ok) throw new Error(value.error || '操作失败')
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败') }
  }

  const cancel = async sessionId => {
    try {
      const response = await fetch('/skk-gal/session-trash', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'cancel', sessionId }) })
      if (!response.ok) throw new Error('取消失败')
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : '取消失败') }
  }

  return <div className="skk-session-manager">
    <div className="skk-manager-head"><div><strong>对话内容管理</strong><p>归档只隐藏会话，原始日志仍保留在本机。</p></div><button type="button" onClick={refresh} disabled={loading}>刷新</button></div>
    <div className="skk-storage-note"><code>%USERPROFILE%\.dsh\sessions</code><span>归档索引：<code>%USERPROFILE%\.dsh\storages\workspace.json</code></span></div>
    {error ? <p className="skk-manager-error" role="alert">{error}</p> : null}
    {loading ? <p className="skk-manager-empty">正在读取会话……</p> : rows.length ? <div className="skk-session-list">
      {rows.map(item => <article className="skk-session-row" key={item.sessionId}>
        <div><strong>{sessionTitle(item)}</strong><span>{item.cwd || '未知工作目录'}</span><code>{item.sessionId}</code></div>
        <div className="skk-session-side"><time>{new Date(item.updatedAt).toLocaleString('zh-CN')}</time>{item.archived ? pending.some(value => value.sessionId === item.sessionId) ? <><span className="skk-pending">退出后处理</span><button type="button" onClick={() => cancel(item.sessionId)}>取消</button></> : <><span className="skk-archived">已归档</span><button className="skk-danger" type="button" onClick={() => trashAction('queue', item)}>删除</button></> : <button type="button" onClick={() => archive(item.sessionId)}>归档</button>}</div>
      </article>)}
    </div> : <p className="skk-manager-empty">没有已保存的会话。</p>}
    {trash.length ? <div className="skk-trash"><strong>会话回收站</strong>{trash.map(item => <article className="skk-trash-row" key={item.trashId}><div><span>{item.title}</span><code>{item.sessionId}</code><time>{new Date(item.deletedAt).toLocaleString('zh-CN')}</time></div><div><button type="button" onClick={() => trashAction('restore', item)}>恢复</button><button className="skk-danger" type="button" onClick={() => trashAction('purge', item)}>永久删除</button></div></article>)}</div> : null}
    <p className="skk-manager-warning">“删除”和“恢复”会先进入队列，并在完全退出 DSH 后执行；再次启动后刷新即可看到结果。回收站中的“永久删除”不可撤销。</p>
  </div>
}

export function SkirkQuickSettings({ api }) {
  const [settings, setSettings] = useState(loadSettings)
  const isThemeEnabled = settings.themeEnabled !== false

  useEffect(() => {
    saveLocalSettings(settings, true)
    syncReplyStyle(settings.replyStyle && isThemeEnabled)
  }, [settings])

  const openTheater = () => {
    if (!isThemeEnabled) return
    const tab = [...document.querySelectorAll('[role="tab"]')].find(node => node.textContent?.trim() === '丝柯克剧场')
    tab?.click()
    const close = [...document.querySelectorAll('[role="dialog"] button')].find(node => node.textContent?.trim() === '关闭')
    close?.click()
  }

  return <section className="skk-quick-settings">
    <div className="skk-quick-intro"><div><strong>丝柯克剧场</strong><p>快速调整 GAL 视窗与角色回复风格。</p></div><button type="button" onClick={openTheater} disabled={!isThemeEnabled}>{isThemeEnabled ? '打开剧场' : '已关闭'}</button></div>
    <label className="skk-quick-toggle">GAL 视窗总开关<select value={settings.themeEnabled === false ? 'off' : 'on'} onChange={e => setSettings(s => ({ ...s, themeEnabled: e.target.value === 'on' }))}><option value="on">启用插件主题</option><option value="off">关闭并恢复 DSH 原始外观</option></select></label>
    <label>玩家名称<input value={settings.playerName} maxLength={20} onChange={e => setSettings(s => ({ ...s, playerName: e.target.value }))} /></label>
    <label>打字速度<select value={settings.speed} onChange={e => setSettings(s => ({ ...s, speed: e.target.value }))}><option value="instant">直接显示</option><option value="slow">慢</option><option value="normal">正常</option><option value="fast">快</option></select></label>
    <label>角色动态<select value={settings.motion ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, motion: e.target.value === 'on' }))}><option value="on">启用</option><option value="off">关闭</option></select></label>
    <label>回复风格<select value={settings.replyStyle ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, replyStyle: e.target.value === 'on' }))}><option value="on">启用丝柯克风格</option><option value="off">使用原始风格</option></select></label>
    <p className="skk-quick-note">配置保存在本机用户目录；回复风格仅在剧场视图打开时生效。</p>
    <SessionManager api={api} />
  </section>
}
