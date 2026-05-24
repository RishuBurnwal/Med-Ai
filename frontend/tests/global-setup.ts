import { spawn, spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(testDir, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const backendDir = path.resolve(repoRoot, 'backend')
const isWindows = process.platform === 'win32'
const pythonPath = isWindows
  ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.join(backendDir, '.venv', 'bin', 'python')
const pidFile = path.join(frontendRoot, 'test-results', 'backend.pid')

async function backendIsHealthy() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/health')
    return response.ok
  } catch {
    return false
  }
}

export default async function globalSetup() {
  await fs.mkdir(path.dirname(pidFile), { recursive: true })

  const seed = spawnSync(pythonPath, [path.join(backendDir, 'seed.py')], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  })

  if (seed.status !== 0) {
    throw new Error(`Backend seed failed with exit code ${seed.status ?? 'unknown'}`)
  }

  if (await backendIsHealthy()) {
    await fs.writeFile(pidFile, '')
    return
  }

  const backend = spawn(pythonPath, [path.join(backendDir, 'main.py')], {
    cwd: backendDir,
    detached: false,
    stdio: 'inherit',
    shell: false,
  })

  backend.on('error', (error) => {
    console.error(`Backend spawn error: ${error.message}`)
  })

  backend.unref()
  await fs.writeFile(pidFile, String(backend.pid ?? ''))

  const startedAt = Date.now()
  while (Date.now() - startedAt < 60000) {
    if (await backendIsHealthy()) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('Backend did not become healthy at http://127.0.0.1:8000/api/health within 60 seconds')
}
