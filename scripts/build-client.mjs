import { build } from 'esbuild'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const output = join(root, '.dsh-plugin', 'client.js')
const temp = mkdtempSync(join(tmpdir(), 'skk-gal-'))
const bundled = join(temp, 'bundle.cjs')

try {
  await build({
    entryPoints: [join(root, '.dsh-plugin', 'client', 'index.mjs')],
    outfile: bundled,
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    external: ['react'],
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    loader: { '.png': 'dataurl', '.webp': 'dataurl' },
    logLevel: 'info',
  })
  const body = readFileSync(bundled, 'utf8').replace(/\n$/, '')
  const code = `window.__ModuleLoader__.load({\n  id: "skk-gal",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`
  if (process.argv.includes('--check')) {
    const old = readFileSync(output, 'utf8')
    if (old !== code) throw new Error('client.js 不是最新构建，请运行 npm run build')
    console.log('[skk-gal] client.js check OK')
  } else {
    writeFileSync(output, code)
    console.log('[skk-gal] client.js built')
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}
