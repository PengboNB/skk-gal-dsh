import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const dshRoot = resolve(process.env.SKK_GAL_DSH_ROOT || join(homedir(), '.dsh'))
const pluginRoot = join(dshRoot, 'skk-gal')
const queuePath = join(pluginRoot, 'pending-deletions.json')
const trashRoot = join(dshRoot, 'session-trash')
const lockPath = join(pluginRoot, 'trash-worker.lock')
const parentPid = Number(process.argv[2])

const inside = (root, target) => {
  const value = relative(resolve(root), resolve(target))
  return value !== '' && !value.startsWith(`..${sep}`) && value !== '..' && !resolve(value).startsWith(sep)
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return fallback }
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, path)
}

async function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try { process.kill(pid, 0); return true } catch { return false }
}

async function findSession(dir, sessionId) {
  for (const item of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (!item.isDirectory()) continue
    const path = join(dir, item.name)
    if (item.name === sessionId) return path
    const nested = await findSession(path, sessionId)
    if (nested) return nested
  }
  return null
}

async function moveToTrash(entry) {
  const sessionId = entry.sessionId
  if (!/^session-[0-9a-f-]{36}$/i.test(sessionId)) throw new Error('invalid session id')
  const sessionsRoot = join(dshRoot, 'sessions')
  const source = await findSession(sessionsRoot, sessionId)
  if (!source || !inside(sessionsRoot, source) || basename(source) !== sessionId) throw new Error('session directory not found')

  const workspacePath = join(dshRoot, 'storages', 'workspace.json')
  const projectionPath = join(dshRoot, 'storages', 'session_projcache.json')
  const workspace = await readJson(workspacePath, null)
  const projection = await readJson(projectionPath, null)
  if (!workspace || !projection) throw new Error('DSH indexes unavailable')

  const trashId = `${Date.now()}-${sessionId}`
  const itemRoot = join(trashRoot, trashId)
  if (!inside(trashRoot, itemRoot)) throw new Error('unsafe trash path')
  await mkdir(trashRoot, { recursive: true })
  await mkdir(itemRoot, { recursive: false })

  const memberships = []
  for (const [workspaceId, value] of Object.entries(workspace.tables?.workspaces || {})) {
    if (Array.isArray(value.sessionIds) && value.sessionIds.includes(sessionId)) memberships.push(workspaceId)
  }
  const archived = workspace.global?.archivedSessionIds?.includes(sessionId) === true
  const projectionEntry = projection.tables?.sessions?.[sessionId] ?? null
  const metadata = { trashId, sessionId, title: entry.title || '未命名会话', cwd: entry.cwd || '', deletedAt: new Date().toISOString(), originalPath: source, memberships, archived, projectionEntry }
  await atomicJson(join(itemRoot, 'manifest.json'), metadata)
  await atomicJson(join(itemRoot, 'workspace.before.json'), workspace)
  await atomicJson(join(itemRoot, 'session_projcache.before.json'), projection)

  await rename(source, join(itemRoot, 'session'))
  if (Array.isArray(workspace.global?.archivedSessionIds)) workspace.global.archivedSessionIds = workspace.global.archivedSessionIds.filter(id => id !== sessionId)
  for (const value of Object.values(workspace.tables?.workspaces || {})) {
    if (Array.isArray(value.sessionIds)) value.sessionIds = value.sessionIds.filter(id => id !== sessionId)
  }
  if (projection.tables?.sessions) delete projection.tables.sessions[sessionId]
  await atomicJson(workspacePath, workspace)
  await atomicJson(projectionPath, projection)
}

async function restoreFromTrash(entry) {
  const itemRoot = join(trashRoot, entry.trashId || '')
  if (!inside(trashRoot, itemRoot)) throw new Error('unsafe trash path')
  const metadata = await readJson(join(itemRoot, 'manifest.json'), null)
  if (!metadata || !/^session-[0-9a-f-]{36}$/i.test(metadata.sessionId)) throw new Error('trash manifest unavailable')
  const sessionsRoot = join(dshRoot, 'sessions')
  const target = resolve(metadata.originalPath)
  const source = join(itemRoot, 'session')
  if (!inside(sessionsRoot, target) || basename(target) !== metadata.sessionId) throw new Error('unsafe restore path')
  try { await stat(target); throw new Error('session path already exists') } catch (error) { if (error?.message === 'session path already exists') throw error }
  const workspacePath = join(dshRoot, 'storages', 'workspace.json')
  const projectionPath = join(dshRoot, 'storages', 'session_projcache.json')
  const workspace = await readJson(workspacePath, null)
  const projection = await readJson(projectionPath, null)
  if (!workspace || !projection) throw new Error('DSH indexes unavailable')
  await mkdir(dirname(target), { recursive: true })
  await rename(source, target)
  if (metadata.archived && Array.isArray(workspace.global?.archivedSessionIds) && !workspace.global.archivedSessionIds.includes(metadata.sessionId)) workspace.global.archivedSessionIds.push(metadata.sessionId)
  for (const workspaceId of metadata.memberships || []) {
    const value = workspace.tables?.workspaces?.[workspaceId]
    if (value && Array.isArray(value.sessionIds) && !value.sessionIds.includes(metadata.sessionId)) value.sessionIds.push(metadata.sessionId)
  }
  if (metadata.projectionEntry && projection.tables?.sessions) projection.tables.sessions[metadata.sessionId] = metadata.projectionEntry
  await atomicJson(workspacePath, workspace)
  await atomicJson(projectionPath, projection)
  await rm(itemRoot, { recursive: true, force: false })
}

async function main() {
  while (await processAlive(parentPid)) await new Promise(resolve => setTimeout(resolve, 1000))
  await mkdir(pluginRoot, { recursive: true })
  let lock
  try { lock = await open(lockPath, 'wx') } catch { return }
  try {
    const queue = await readJson(queuePath, { items: [] })
    const failed = []
    for (const entry of queue.items || []) {
      try { entry.action === 'restore' ? await restoreFromTrash(entry) : await moveToTrash(entry) } catch (error) { failed.push({ ...entry, error: error instanceof Error ? error.message : String(error) }) }
    }
    await atomicJson(queuePath, { items: failed, updatedAt: new Date().toISOString() })
  } finally {
    await lock?.close()
    await rm(lockPath, { force: true })
  }
}

await main()
