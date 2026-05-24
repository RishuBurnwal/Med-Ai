import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(testDir, '..')
const pidFile = path.join(frontendRoot, 'test-results', 'backend.pid')

export default async function globalTeardown() {
  try {
    const pid = Number(await fs.readFile(pidFile, 'utf8'))
    if (Number.isFinite(pid) && pid > 0) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
      } else {
        try {
          process.kill(pid)
        } catch {
          // already exited
        }
      }
    }
  } catch {
    // no pid file to clean up
  }

  try {
    await fs.unlink(pidFile)
  } catch {
    // ignore cleanup errors
  }
}
