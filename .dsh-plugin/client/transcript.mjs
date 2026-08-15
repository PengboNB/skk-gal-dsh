export function cleanText(value) {
  return typeof value === 'string'
    ? value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : ''
}

function blockText(blocks, assistant = false) {
  if (!Array.isArray(blocks)) return ''
  return cleanText(blocks.map(block => {
    if (!block || typeof block !== 'object') return ''
    if (assistant && block.kind && block.kind !== 'text') return ''
    return typeof block.text === 'string' ? block.text : ''
  }).filter(Boolean).join('\n'))
}

export function nodeToLine(node) {
  if (!node || typeof node !== 'object') return null
  const key = `node-${String(node.seq ?? Math.random())}`
  if (node.kind === 'user' || node.kind === 'steering') {
    const text = blockText(node.content)
    return text ? { key, role: 'player', name: '旅行者', text } : null
  }
  if (node.kind === 'assistant') {
    const text = blockText(node.blocks, true)
    return text ? { key, role: 'skirk', name: '丝柯克', text } : null
  }
  if (node.kind === 'turn-error') {
    return { key, role: 'system', name: '系统', text: `发生错误：${String(node.message ?? '回合失败')}` }
  }
  return null
}

export function nodesToLines(nodes) {
  return Array.isArray(nodes) ? nodes.map(nodeToLine).filter(Boolean) : []
}

export function partialText(partial) {
  return blockText(partial?.blocks, true)
}

function shortArgs(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  try {
    const value = JSON.parse(raw)
    const command = value?.command ?? value?.cmd ?? value?.path ?? value?.query ?? value?.url
    return cleanText(typeof command === 'string' ? command : JSON.stringify(value))
  } catch { return cleanText(raw) }
}

export function workflowFromConversation(nodes, partial, runningCalls = []) {
  const running = new Set((Array.isArray(runningCalls) ? runningCalls : []).map(call => call?.callId ?? call?.id).filter(Boolean))
  const items = []
  const visit = (blocks, live = false, groupKey = '') => {
    if (!Array.isArray(blocks)) return
    for (const block of blocks) {
      if (block?.kind === 'reasoning' && cleanText(block.text)) items.push({ key: `reasoning-${items.length}`, groupKey, kind: 'reasoning', title: live ? '正在思考' : '思考过程', detail: cleanText(block.text), status: live ? 'running' : 'done' })
      if (block?.kind === 'tool-call') items.push({ key: block.callId || `tool-${items.length}`, groupKey, kind: 'tool', title: block.name || '工具调用', detail: shortArgs(block.argsRaw), status: live || running.has(block.callId) ? 'running' : 'done' })
    }
  }
  for (const node of Array.isArray(nodes) ? nodes : []) if (node?.kind === 'assistant') visit(node.blocks, false, `node-${String(node.seq ?? '')}`)
  visit(partial?.blocks, true, 'partial')
  return items
}
