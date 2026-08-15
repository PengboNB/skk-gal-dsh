import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const name = 'skk-gal'
export const inject = ['webServer']

const SETTINGS_PATH = join(homedir(), '.dsh', 'skk-gal', 'settings.json')
const QUEUE_PATH = join(homedir(), '.dsh', 'skk-gal', 'pending-deletions.json')
const TRASH_ROOT = join(homedir(), '.dsh', 'session-trash')
const WORKER_PATH = fileURLToPath(new URL('./session-trash-worker.mjs', import.meta.url))
const ACTIVE_WINDOW_MS = 15_000
const STYLE_PROMPT = `你正在使用“丝柯克剧场”插件的角色化回复风格。请遵守以下要求：
- 默认使用简体中文，语气冷静、克制、直接，像阅历深厚而要求严格的引导者。
- 先给出结论，再给必要步骤；代码、命令、日志和事实必须准确，不能为了角色感牺牲技术质量。
- 可偶尔使用深渊、星海、锋刃或试炼意象，但一次回复最多一处，不重复口头禅，不堆砌修辞。
- 不要声称自己就是游戏角色丝柯克，不虚构官方剧情、台词、关系或设定。
- 用户要求纯技术表达、其他语气或明确格式时，优先服从用户要求。`

async function loadSettings() {
  try {
    const value = JSON.parse(await readFile(SETTINGS_PATH, 'utf8'))
    return { replyStyle: value.replyStyle !== false }
  } catch {
    return { replyStyle: true }
  }
}

async function saveSettings(settings) {
  await mkdir(dirname(SETTINGS_PATH), { recursive: true })
  await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
}

async function loadQueue() {
  try { return JSON.parse(await readFile(QUEUE_PATH, 'utf8')) } catch { return { items: [] } }
}

async function saveQueue(value) {
  await mkdir(dirname(QUEUE_PATH), { recursive: true })
  await writeFile(QUEUE_PATH, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function listTrash() {
  const result = []
  for (const item of await readdir(TRASH_ROOT, { withFileTypes: true }).catch(() => [])) {
    if (!item.isDirectory()) continue
    try { result.push(JSON.parse(await readFile(join(TRASH_ROOT, item.name, 'manifest.json'), 'utf8'))) } catch {}
  }
  return result.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)))
}

function validSessionId(value) { return /^session-[0-9a-f-]{36}$/i.test(value) }
function inside(root, target) {
  const value = relative(resolve(root), resolve(target))
  return value !== '' && !value.startsWith(`..${sep}`) && value !== '..'
}

function startWorker() {
  const child = spawn(process.execPath, [WORKER_PATH, String(process.pid)], { detached: true, stdio: 'ignore', windowsHide: true })
  child.unref()
}

function sendJson(res, status, value) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(value))
}

async function readJson(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 4096) throw new Error('request too large')
  }
  return body ? JSON.parse(body) : {}
}

export function apply(ctx) {
  let settings = { replyStyle: false }
  let settingsReady = false
  let lastActiveAt = 0
  const view = () => ({ ...settings, active: Date.now() - lastActiveAt <= ACTIVE_WINDOW_MS })
  const settingsLoad = loadSettings().then(value => { settings = value; settingsReady = true })

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt) {
    ctx.effect(() => systemPrompt.section({
      name: 'skk-gal-reply-style',
      order: 40,
      text: () => settingsReady && settings.replyStyle && Date.now() - lastActiveAt <= ACTIVE_WINDOW_MS ? STYLE_PROMPT : '',
    }), 'skk-gal:reply-style')
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/skk-gal/settings',
    handler: async (req, res) => {
      try {
        await settingsLoad
        if (req.method === 'GET') return sendJson(res, 200, view())
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        if (body.active === true) lastActiveAt = Date.now()
        if (body.active === false) lastActiveAt = 0
        if (typeof body.replyStyle === 'boolean') {
          settings = { ...settings, replyStyle: body.replyStyle }
          await saveSettings(settings)
        }
        return sendJson(res, 200, view())
      } catch (error) {
        return sendJson(res, 400, { error: error instanceof Error ? error.message : 'invalid request' })
      }
    },
  }), 'skk-gal:settings-api')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/skk-gal/session-trash',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET') {
          const queue = await loadQueue()
          return sendJson(res, 200, { pending: queue.items || [], trash: await listTrash() })
        }
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
        const body = await readJson(req)
        if (body.action === 'queue') {
          if (!validSessionId(body.sessionId) || typeof body.title !== 'string' || body.confirm !== body.title) throw new Error('确认文字与会话标题不匹配')
          const queue = await loadQueue()
          if (!(queue.items || []).some(item => item.sessionId === body.sessionId)) queue.items.push({ action: 'delete', sessionId: body.sessionId, title: body.title, cwd: typeof body.cwd === 'string' ? body.cwd : '', queuedAt: new Date().toISOString() })
          await saveQueue({ items: queue.items, updatedAt: new Date().toISOString() })
          startWorker()
          return sendJson(res, 200, { ok: true, pending: queue.items })
        }
        if (body.action === 'cancel') {
          const queue = await loadQueue()
          queue.items = (queue.items || []).filter(item => item.sessionId !== body.sessionId)
          await saveQueue({ items: queue.items, updatedAt: new Date().toISOString() })
          return sendJson(res, 200, { ok: true })
        }
        if (body.action === 'restore') {
          const item = (await listTrash()).find(value => value.trashId === body.trashId)
          if (!item || body.confirm !== item.title) throw new Error('确认文字与会话标题不匹配')
          const queue = await loadQueue()
          if (!(queue.items || []).some(value => value.trashId === item.trashId)) queue.items.push({ action: 'restore', trashId: item.trashId, sessionId: item.sessionId, title: item.title, queuedAt: new Date().toISOString() })
          await saveQueue({ items: queue.items, updatedAt: new Date().toISOString() })
          startWorker()
          return sendJson(res, 200, { ok: true })
        }
        if (body.action === 'purge') {
          const item = (await listTrash()).find(value => value.trashId === body.trashId)
          if (!item || body.confirm !== item.title) throw new Error('确认文字与会话标题不匹配')
          const target = join(TRASH_ROOT, item.trashId)
          if (!inside(TRASH_ROOT, target)) throw new Error('unsafe trash path')
          await rm(target, { recursive: true, force: false })
          return sendJson(res, 200, { ok: true })
        }
        throw new Error('unknown action')
      } catch (error) {
        return sendJson(res, 400, { error: error instanceof Error ? error.message : 'invalid request' })
      }
    },
  }), 'skk-gal:session-trash-api')
}
