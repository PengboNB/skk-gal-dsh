import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const worker = fileURLToPath(new URL('../.dsh-plugin/session-trash-worker.mjs', import.meta.url))
const sessionId = 'session-11111111-1111-1111-1111-111111111111'

async function runWorker(home) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [worker, '0'], { env: { ...process.env, SKK_GAL_DSH_ROOT: join(home, '.dsh') }, stdio: 'inherit' })
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`worker exited ${code}`)))
  })
}

test('queues move sessions to trash and restore them without overwriting indexes', async () => {
  const home = await mkdtemp(join(tmpdir(), 'skk-trash-test-'))
  const dsh = join(home, '.dsh')
  const session = join(dsh, 'sessions', '--D-test--', sessionId)
  await mkdir(session, { recursive: true })
  await mkdir(join(dsh, 'storages'), { recursive: true })
  await mkdir(join(dsh, 'skk-gal'), { recursive: true })
  await writeFile(join(session, 'session.jsonl.zstd'), 'test')
  await writeFile(join(dsh, 'storages', 'workspace.json'), JSON.stringify({ global: { archivedSessionIds: [sessionId] }, tables: { workspaces: { one: { sessionIds: [sessionId] } } } }))
  await writeFile(join(dsh, 'storages', 'session_projcache.json'), JSON.stringify({ tables: { sessions: { [sessionId]: { identity: { cwd: 'D:\\test' } } } } }))
  await writeFile(join(dsh, 'skk-gal', 'pending-deletions.json'), JSON.stringify({ items: [{ action: 'delete', sessionId, title: '测试', cwd: 'D:\\test' }] }))
  await runWorker(home)

  const workspaceAfterDelete = JSON.parse(await readFile(join(dsh, 'storages', 'workspace.json')))
  const projectionAfterDelete = JSON.parse(await readFile(join(dsh, 'storages', 'session_projcache.json')))
  assert.deepEqual(workspaceAfterDelete.global.archivedSessionIds, [])
  assert.deepEqual(workspaceAfterDelete.tables.workspaces.one.sessionIds, [])
  assert.equal(projectionAfterDelete.tables.sessions[sessionId], undefined)

  const trashItems = await import('node:fs/promises').then(fs => fs.readdir(join(dsh, 'session-trash')))
  assert.equal(trashItems.length, 1)
  await writeFile(join(dsh, 'skk-gal', 'pending-deletions.json'), JSON.stringify({ items: [{ action: 'restore', trashId: trashItems[0], sessionId, title: '测试' }] }))
  await runWorker(home)

  assert.equal(await readFile(join(session, 'session.jsonl.zstd'), 'utf8'), 'test')
  const workspaceAfterRestore = JSON.parse(await readFile(join(dsh, 'storages', 'workspace.json')))
  const projectionAfterRestore = JSON.parse(await readFile(join(dsh, 'storages', 'session_projcache.json')))
  assert.deepEqual(workspaceAfterRestore.global.archivedSessionIds, [sessionId])
  assert.deepEqual(workspaceAfterRestore.tables.workspaces.one.sessionIds, [sessionId])
  assert.equal(projectionAfterRestore.tables.sessions[sessionId].identity.cwd, 'D:\\test')
})
