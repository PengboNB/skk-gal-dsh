import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const name = 'skk-gal'
export const inject = ['webServer']

const SETTINGS_PATH = join(homedir(), '.dsh', 'skk-gal', 'settings.json')
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
}
