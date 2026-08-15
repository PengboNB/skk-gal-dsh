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
