/**
 * Ensures a password test user exists before E2E runs.
 * 1) POST /auth/register (idempotent if backend returns 400 for existing email)
 * 2) Fallback: run backend/create_test_user.py
 */
import { execSync } from 'node:child_process'
import path from 'node:path'

const API_BASE = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000/api/v1'

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  username: 'testuser',
}

async function ensureUserViaRegister(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  })

  if (res.ok) {
    console.log('[global-setup] Registered test user via API')
    return
  }

  const text = await res.text().catch(() => '')
  if (res.status === 400 && /already|taken|registered/i.test(text)) {
    console.log('[global-setup] Test user already exists (register returned 400)')
    return
  }

  throw new Error(`Register failed: ${res.status} ${text}`)
}

function ensureUserViaScript(): void {
  const repoRoot = path.resolve(__dirname, '../../..')
  const backendDir = path.join(repoRoot, 'backend')
  execSync('python3 create_test_user.py', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  })
  console.log('[global-setup] Seeded test user via create_test_user.py')
}

export default async function globalSetup() {
  try {
    await ensureUserViaRegister()
  } catch (err) {
    console.warn('[global-setup] Register API unavailable or failed:', err)
    try {
      ensureUserViaScript()
    } catch (scriptErr) {
      console.error('[global-setup] Seed script failed:', scriptErr)
      throw scriptErr
    }
  }
}
