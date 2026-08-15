export function pendingKind(wait) {
  return typeof wait?.kind === 'string' ? wait.kind : 'pending'
}

export function pendingTitle(wait, index = 0) {
  const payload = wait?.payload && typeof wait.payload === 'object' ? wait.payload : {}
  if (pendingKind(wait) === 'approval') return '需要你的授权'
  return payload.title || payload.label || payload.name || `待处理任务 ${index + 1}`
}

export function pendingDescription(wait) {
  const payload = wait?.payload && typeof wait.payload === 'object' ? wait.payload : {}
  return payload.reason || payload.description || payload.message || payload.prompt || `${pendingKind(wait)} 正在等待你的处理`
}

function normalizeOption(option, index) {
  if (typeof option === 'string') return { id: option, label: option, value: option }
  if (!option || typeof option !== 'object') return { id: String(index), label: `选项 ${index + 1}`, value: String(index) }
  const label = option.label || option.title || option.name || option.value || option.id || `选项 ${index + 1}`
  const value = option.value ?? option.id ?? label
  return { ...option, id: String(option.id ?? value ?? index), label: String(label), value }
}

export function pendingQuestions(wait) {
  const payload = wait?.payload && typeof wait.payload === 'object' ? wait.payload : {}
  const fromQuestions = Array.isArray(payload.questions) ? payload.questions : []
  if (fromQuestions.length) {
    return fromQuestions.map((question, index) => {
      const id = String(question?.id || question?.name || `question_${index + 1}`)
      const options = Array.isArray(question?.options) ? question.options.map(normalizeOption) : []
      return { id, prompt: question?.question || question?.label || question?.prompt || `问题 ${index + 1}`, options }
    })
  }
  const options = Array.isArray(payload.options) ? payload.options.map(normalizeOption) : []
  if (options.length) return [{ id: 'choice', prompt: payload.question || payload.prompt || '请选择一个处理方式', options }]
  return []
}

export function buildPendingResponse(wait, action, value = {}) {
  const payload = wait?.payload && typeof wait.payload === 'object' ? wait.payload : {}
  if (pendingKind(wait) === 'approval') {
    return {
      ok: true,
      value: {
        sessionId: wait?.sessionId,
        approvalId: payload.approvalId,
        outcome: action === 'reject' ? 'rejected' : 'allowed-once',
      },
    }
  }
  if (action === 'reject') return { ok: false, value: { cancelled: true, reason: value.reason || '用户在丝柯克剧场中取消了该任务' } }
  if (value.answers && typeof value.answers === 'object') {
    return { ok: true, value: { answers: value.answers, choices: value.answers, response: value.answers } }
  }
  return { ok: true, value: value.value ?? {} }
}
