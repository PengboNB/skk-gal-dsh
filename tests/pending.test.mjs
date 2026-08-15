import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPendingResponse, pendingDescription, pendingQuestions, pendingTitle } from '../.dsh-plugin/client/pending.mjs'

test('builds DSH approval responses', () => {
  const wait = { kind: 'approval', sessionId: 'session-1', payload: { approvalId: 'approval-1', reason: '需要授权' } }
  assert.equal(pendingTitle(wait), '需要你的授权')
  assert.equal(pendingDescription(wait), '需要授权')
  assert.deepEqual(buildPendingResponse(wait, 'approve'), { ok: true, value: { sessionId: 'session-1', approvalId: 'approval-1', outcome: 'allowed-once' } })
  assert.deepEqual(buildPendingResponse(wait, 'reject'), { ok: true, value: { sessionId: 'session-1', approvalId: 'approval-1', outcome: 'rejected' } })
})

test('normalizes pending questions and choices', () => {
  const wait = { kind: 'user-input', payload: { questions: [{ id: 'target', question: '选择任务', options: [{ label: '任务 A', value: 'a' }, '任务 B'] }] } }
  assert.deepEqual(pendingQuestions(wait), [{ id: 'target', prompt: '选择任务', options: [{ label: '任务 A', value: 'a', id: 'a' }, { label: '任务 B', value: '任务 B', id: '任务 B' }] }])
  assert.deepEqual(buildPendingResponse(wait, 'submit', { answers: { target: 'a' } }), { ok: true, value: { answers: { target: 'a' }, choices: { target: 'a' }, response: { target: 'a' } } })
})
