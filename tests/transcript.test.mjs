import test from 'node:test'
import assert from 'node:assert/strict'
import { nodesToLines, partialText, workflowFromConversation } from '../.dsh-plugin/client/transcript.mjs'

test('maps user and assistant text while ignoring tool noise', () => {
  const lines = nodesToLines([
    { seq: 1, kind: 'user', content: [{ text: '你好' }] },
    { seq: 2, kind: 'assistant', blocks: [{ kind: 'reasoning', text: 'hidden' }, { kind: 'text', text: '出发吧' }] },
    { seq: 3, kind: 'tool-result', content: [{ text: 'ignored' }] },
  ])
  assert.deepEqual(lines.map(x => [x.role, x.text]), [['player', '你好'], ['skirk', '出发吧']])
})

test('reads only text from a streaming partial', () => {
  assert.equal(partialText({ blocks: [{ kind: 'reasoning', text: 'hidden' }, { kind: 'text', text: '正在回答' }] }), '正在回答')
})

test('extracts reasoning and live tool calls for the GAL workflow', () => {
  const workflow = workflowFromConversation([{ kind: 'assistant', blocks: [{ kind: 'reasoning', text: '检查配置' }, { kind: 'tool-call', callId: 'call-1', name: 'exec', argsRaw: '{"command":"npm test"}' }] }], { blocks: [{ kind: 'tool-call', callId: 'call-2', name: 'read', argsRaw: '{"path":"README.md"}' }] }, [{ callId: 'call-2' }])
  assert.deepEqual(workflow.map(item => [item.groupKey, item.title, item.detail, item.status]), [['node-', '思考过程', '检查配置', 'done'], ['node-', 'exec', 'npm test', 'done'], ['partial', 'read', 'README.md', 'running']])
})
