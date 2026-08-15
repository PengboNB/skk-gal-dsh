import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import backgroundUrl from '../../assets/abyss-background.png'
import skirkUrl from '../../assets/skirk-hd.png'
import sidebarArtUrl from '../../assets/sidebar-abyss.png'
import { nodesToLines, partialText, workflowFromConversation } from './transcript.mjs'

const SPEED = { slow: 48, normal: 25, fast: 10, instant: 0 }

function useFillConversation(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    const scroll = root?.closest('[data-conversation-scroll]')
    const composer = scroll?.querySelector(':scope > [data-composer-seat]')
    if (!scroll || !composer) return undefined
    const old = { display: composer.style.display, overflow: scroll.style.overflow, position: scroll.style.position }
    composer.style.display = 'none'
    scroll.style.overflow = 'hidden'
    scroll.style.position = 'relative'
    return () => {
      composer.style.display = old.display
      scroll.style.overflow = old.overflow
      scroll.style.position = old.position
    }
  }, [rootRef])
}

function useHostTheme() {
  useEffect(() => {
    document.body.classList.add('skk-host-active')
    const sidebar = document.querySelector('[data-slot="sidebar"] > div')
    const previous = sidebar ? {
      image: sidebar.style.getPropertyValue('background-image'),
      imagePriority: sidebar.style.getPropertyPriority('background-image'),
      size: sidebar.style.getPropertyValue('background-size'),
      position: sidebar.style.getPropertyValue('background-position'),
    } : null
    if (sidebar) {
      sidebar.style.setProperty('background-image', `linear-gradient(rgba(3, 7, 25, .16), rgba(3, 6, 24, .28)), url("${sidebarArtUrl}")`, 'important')
      sidebar.style.setProperty('background-size', 'cover', 'important')
      sidebar.style.setProperty('background-position', 'center', 'important')
    }
    return () => {
      document.body.classList.remove('skk-host-active')
      if (sidebar && previous) {
        sidebar.style.setProperty('background-image', previous.image, previous.imagePriority)
        sidebar.style.setProperty('background-size', previous.size)
        sidebar.style.setProperty('background-position', previous.position)
      }
    }
  }, [])
}

function SidePanel({ kind, lines, settings, setSettings, close }) {
  return (
    <aside className="skk-panel" role="dialog" aria-label={kind === 'history' ? '对话记录' : '界面设置'}>
      <div className="skk-panel-head">
        <strong>{kind === 'history' ? '对话记录' : '界面设置'}</strong>
        <button className="skk-chip" type="button" onClick={close}>关闭</button>
      </div>
      {kind === 'history' ? (
        lines.length ? lines.map(line => (
          <div className="skk-history-row" key={line.key}>
            <span className="skk-history-name">{line.role === 'player' ? settings.playerName : line.name}</span>
            <p className="skk-history-text">{line.text}</p>
          </div>
        )) : <p className="skk-empty">还没有对话记录。</p>
      ) : (
        <>
          <label className="skk-setting">玩家名称
            <input value={settings.playerName} maxLength={20} onChange={e => setSettings(s => ({ ...s, playerName: e.target.value }))} />
          </label>
          <label className="skk-setting">打字速度
            <select value={settings.speed} onChange={e => setSettings(s => ({ ...s, speed: e.target.value }))}>
              <option value="instant">直接显示</option><option value="slow">慢</option><option value="normal">正常</option><option value="fast">快</option>
            </select>
          </label>
          <label className="skk-setting">角色动态
            <select value={settings.motion ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, motion: e.target.value === 'on' }))}>
              <option value="on">启用</option><option value="off">关闭</option>
            </select>
          </label>
          <label className="skk-setting">回复风格
            <select value={settings.replyStyle ? 'on' : 'off'} onChange={e => setSettings(s => ({ ...s, replyStyle: e.target.value === 'on' }))}>
              <option value="on">启用丝柯克风格</option><option value="off">使用原始风格</option>
            </select>
          </label>
          <p className="skk-empty">回复风格仅在“丝柯克剧场”视图打开且此开关启用时注入；离开视图后自动失效。图片和个人信息不会上传。</p>
        </>
      )}
    </aside>
  )
}

function ApprovalCard({ wait, nodes }) {
  const [answering, setAnswering] = useState(false)
  const [error, setError] = useState('')
  const callId = wait.payload?.callId
  let command = ''
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (node?.kind !== 'assistant') continue
    const call = node.blocks?.find(block => block?.kind === 'tool-call' && block.callId === callId)
    if (call) { try { command = JSON.parse(call.argsRaw)?.command || '' } catch {} }
  }
  const answer = async outcome => {
    setAnswering(true); setError('')
    try {
      const receipt = await wait.respond({ ok: true, value: { sessionId: wait.sessionId, approvalId: wait.payload.approvalId, outcome } })
      if (!receipt?.accepted) throw new Error(receipt?.reason || '审批反馈未被接受')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '审批失败'); setAnswering(false) }
  }
  return <section className="skk-approval" role="group" aria-label="操作授权">
    <div><strong>需要你的授权</strong><span>{wait.payload?.reason || `${wait.payload?.toolName || '工具'} 请求执行受限操作`}</span>{command ? <code>{command}</code> : null}{error ? <em>{error}</em> : null}</div>
    <div><button type="button" disabled={answering} onClick={() => answer('rejected')}>拒绝</button><button className="is-allow" type="button" disabled={answering} onClick={() => answer('allowed-once')}>允许一次</button></div>
  </section>
}

export function loadSettings() {
  try {
    return { playerName: '旅行者', speed: 'normal', motion: true, replyStyle: true, ...JSON.parse(localStorage.getItem('skk-gal:settings') || '{}') }
  } catch {
    return { playerName: '旅行者', speed: 'normal', motion: true, replyStyle: true }
  }
}

export function saveLocalSettings(settings, notify = false) {
  try {
    localStorage.setItem('skk-gal:settings', JSON.stringify(settings))
    if (notify) window.dispatchEvent(new CustomEvent('skk-gal:settings-changed', { detail: settings }))
  } catch {}
}

export function syncReplyStyle(replyStyle, active) {
  const payload = { replyStyle }
  if (typeof active === 'boolean') payload.active = active
  return fetch('/skk-gal/settings', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  }).catch(() => {})
}

export function SkirkGal({ useSession, inputActions }) {
  const rootRef = useRef(null)
  const feedRef = useRef(null)
  const nodes = useSession(s => s.nodes)
  const partial = useSession(s => s.partial)
  const running = useSession(s => s.running)
  const pending = useSession(s => s.pending)
  const runningCalls = useSession(s => s.runningCalls)
  const lines = useMemo(() => nodesToLines(nodes), [nodes])
  const live = partialText(partial)
  const current = live
    ? { key: 'partial', role: 'skirk', name: '丝柯克', text: live }
    : lines.at(-1) ?? { key: 'welcome', role: 'skirk', name: '丝柯克', text: '深渊之外仍有无数未知。你准备好继续前进了吗？' }
  const [settings, setSettings] = useState(loadSettings)
  const [shown, setShown] = useState('')
  const [panel, setPanel] = useState(null)
  const [draft, setDraft] = useState('')
  const [showWorkflow, setShowWorkflow] = useState(false)
  const workflows = useMemo(() => workflowFromConversation(nodes, partial, runningCalls), [nodes, partial, runningCalls])
  const workflowFor = key => workflows.filter(item => item.groupKey === key)
  const approval = Array.isArray(pending) ? pending.find(item => item?.kind === 'approval') : null
  const fullText = running && !live ? (Array.isArray(pending) && pending.length ? '等待你的回应……' : '正在观测深渊的回响……') : current.text
  const status = running && !live
  useFillConversation(rootRef)
  useHostTheme()

  useEffect(() => {
    const receive = event => setSettings(current => ({ ...current, ...event.detail }))
    window.addEventListener('skk-gal:settings-changed', receive)
    return () => window.removeEventListener('skk-gal:settings-changed', receive)
  }, [])

  useEffect(() => {
    let live = true
    fetch('/skk-gal/settings', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('settings unavailable')))
      .then(remote => { if (live && typeof remote.replyStyle === 'boolean') setSettings(value => ({ ...value, replyStyle: remote.replyStyle })) })
      .catch(() => {})
    const heartbeat = () => fetch('/skk-gal/settings', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: true }), keepalive: true,
    }).catch(() => {})
    heartbeat()
    const timer = setInterval(heartbeat, 5_000)
    return () => {
      live = false
      clearInterval(timer)
      fetch('/skk-gal/settings', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: false }), keepalive: true,
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    saveLocalSettings(settings)
  }, [settings])

  const replyStyleReady = useRef(false)
  useEffect(() => {
    if (!replyStyleReady.current) { replyStyleReady.current = true; return }
    fetch('/skk-gal/settings', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ replyStyle: settings.replyStyle, active: true }),
    }).catch(() => {})
  }, [settings.replyStyle])

  useEffect(() => {
    if (status) { setShown(fullText); return undefined }
    setShown('')
    if (live) { setShown(fullText); return undefined }
    if (settings.speed === 'instant') { setShown(fullText); return undefined }
    let at = 0
    const timer = setInterval(() => {
      at += 1
      setShown(fullText.slice(0, at))
      if (at >= fullText.length) clearInterval(timer)
    }, SPEED[settings.speed] ?? SPEED.normal)
    return () => clearInterval(timer)
  }, [current.key, fullText, settings.speed, live, status])

  useEffect(() => {
    const feed = feedRef.current
    if (feed) feed.scrollTop = feed.scrollHeight
  }, [lines.length, shown, live])

  const send = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    inputActions.setDraft(text)
    inputActions.submit()
    setDraft('')
  }, [draft, inputActions])

  const showFull = () => { setShown(fullText); setShowWorkflow(value => !value) }
  const assistantLines = lines.filter(line => line.role !== 'player')
  const lastPlayer = [...lines].reverse().find(line => line.role === 'player')
  const responseLines = assistantLines.length
    ? assistantLines.map((line, index) => index === assistantLines.length - 1 && !live ? { ...line, text: shown || line.text } : line)
    : [{ key: 'welcome', role: 'skirk', name: '丝柯克', text: '深渊之外仍有无数未知。你准备好继续前进了吗？' }]
  if (live) responseLines.push({ key: 'partial', role: 'skirk', name: '丝柯克', text: shown })
  if (status) responseLines.push({ key: 'status', role: 'system', name: '状态', text: fullText })
  return (
    <main ref={rootRef} className="skk-root" data-motion={settings.motion ? 'on' : 'off'}>
      <div className="skk-bg" style={{ backgroundImage: `linear-gradient(180deg, rgba(4, 8, 28, .12), rgba(3, 5, 20, .48)), url("${backgroundUrl}")` }} /><div className="skk-stars" /><div className="skk-vignette" />
      <div className="skk-topbar"><span className="skk-title">ABYSS · SKIRK THEATER</span><button className="skk-chip" type="button" onClick={() => setPanel('settings')}>界面设置</button></div>
      <div className="skk-character" style={settings.motion ? undefined : { animation: 'none' }}>
        <span className="skk-aura" /><img src={skirkUrl} alt="丝柯克角色立绘" style={settings.motion ? undefined : { animation: 'none' }} />
      </div>
      <section className="skk-response-zone" aria-label="丝柯克回复">
        <header className="skk-response-head"><span>丝柯克 · 回响记录</span><span className="skk-response-tools"><button className="skk-action" type="button" aria-pressed={showWorkflow} onClick={showFull}>{showWorkflow ? '收起全文' : '显示全文'}</button><button className="skk-action" type="button" onClick={() => setPanel('history')}>对话记录</button></span></header>
        <div className="skk-response-feed" ref={feedRef} aria-live="polite">
          {responseLines.map((line, index) => (
            <article className={`skk-response-card${line.role === 'system' ? ' is-status' : ''}`} key={`${line.key}-${index}`}>
              <div className="skk-response-meta"><strong>{line.name || '丝柯克'}</strong><span>NO. {String(index + 1).padStart(2, '0')}</span></div>
              {showWorkflow && line.role !== 'system' ? <section className="skk-workflow" aria-label={`第 ${index + 1} 段思考与执行`}><header><strong>思考与执行</strong><span>{line.key === 'partial' || workflowFor(line.key).some(item => item.status === 'running') ? '运行中' : '已完成'}</span></header>{workflowFor(line.key).length ? workflowFor(line.key).map((item, stepIndex) => <div className={`skk-workflow-item is-${item.status}`} key={`${item.key}-${stepIndex}`}><i /><div><strong>{item.title}</strong>{item.detail ? <pre>{item.detail}</pre> : null}</div><span>{item.status === 'running' ? '进行中' : '完成'}</span></div>) : <p>此段回复没有额外的思考或工具调用。</p>}</section> : null}
              <p>{line.text}{index === responseLines.length - 1 && (live || (!status && shown !== fullText)) ? <span className="skk-caret" /> : null}</p>
            </article>
          ))}
        </div>
      </section>
      {approval ? <ApprovalCard wait={approval} nodes={nodes} /> : null}
      <section className="skk-userbox" aria-label="用户对话框">
        <div className="skk-name" data-role="player">{settings.playerName || '旅行者'}</div>
        <p className="skk-user-last">{lastPlayer?.text || '等待你的指令……'}</p>
        <div className="skk-composer">
          <input className="skk-input" value={draft} placeholder="输入对话，Enter 发送" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button className="skk-send" type="button" aria-label="发送消息" onClick={send}>➤</button>
        </div>
      </section>
      {panel && <SidePanel kind={panel} lines={lines} settings={settings} setSettings={setSettings} close={() => setPanel(null)} />}
    </main>
  )
}
