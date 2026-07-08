import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { startArcusApiServer } from './server/server.js'

const arcusApiOrigin = 'http://127.0.0.1:4174'

async function fetchWithTimeout(url, timeoutMs = 1600) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function existingArcusApiIsCurrent() {
  try {
    const [session, register, account] = await Promise.all([
      fetchWithTimeout(`${arcusApiOrigin}/api/auth/session`),
      fetchWithTimeout(`${arcusApiOrigin}/api/auth/register`),
      fetchWithTimeout(`${arcusApiOrigin}/api/professional/account`),
    ])

    return (
      session.ok &&
      register.status === 405 &&
      account.status === 401
    )
  } catch {
    return false
  }
}

async function ensureArcusApiServer() {
  if (await existingArcusApiIsCurrent()) {
    console.log(`ARCUS API already available at ${arcusApiOrigin}`)
    return
  }

  try {
    await startArcusApiServer()
  } catch (error) {
    if (
      error?.code === 'EADDRINUSE' &&
      (await existingArcusApiIsCurrent())
    ) {
      console.log(`ARCUS API already available at ${arcusApiOrigin}`)
      return
    }

    if (error?.code === 'EADDRINUSE') {
      console.error(
        `ARCUS API port 4174 is already in use, but the running API does not expose the current ARCUS contract. Stop the old process and rerun npm run dev.`
      )
      return
    }

    console.error('ARCUS API failed to start', error)
  }
}

const arcusApiPlugin = {
  name: 'arcus-api',
  configureServer() {
    ensureArcusApiServer()
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), arcusApiPlugin],
  server: {
    proxy: {
      "/api": arcusApiOrigin,
    },
  },
})
