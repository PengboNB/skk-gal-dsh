import test from 'node:test'
import assert from 'node:assert/strict'
import { nodesToLines, partialText } from '../.dsh-plugin/client/transcript.mjs'

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
