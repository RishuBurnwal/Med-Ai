import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(frontendRoot, '..')
const backendDir = path.resolve(repoRoot, 'backend')
const isWindows = process.platform === 'win32'
const pythonPath = isWindows
  ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
  : path.join(backendDir, '.venv', 'bin', 'python')

const seedResult = spawnSync(pythonPath, [path.join(backendDir, 'seed.py')], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false,
})

if (seedResult.status !== 0) {
  process.exit(seedResult.status ?? 1)
}

const backend = spawn(pythonPath, [path.join(repoRoot, 'main.py')], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false,
})

backend.on('error', (error) => {
  console.error(`Backend spawn error: ${error.message}`)
})

const cleanup = () => {
  if (!backend.killed) {
    backend.kill()
  }
}

process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})
backend.on('exit', (code, signal) => {
  console.error(`Backend exited: code=${code ?? 'null'} signal=${signal ?? 'null'}`)
})

const viteBinary = isWindows
  ? path.join(frontendRoot, 'node_modules', '.bin', 'vite.cmd')
  : path.join(frontendRoot, 'node_modules', '.bin', 'vite')

const vite = spawn(viteBinary, ['--host', '127.0.0.1', '--port', '5173'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  shell: true,
})

vite.on('error', (error) => {
  console.error(`Vite spawn error: ${error.message}`)
})

vite.on('exit', (code) => {
  cleanup()
  process.exit(code ?? 1)
})