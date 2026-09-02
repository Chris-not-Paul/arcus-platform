import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { startArcusApiServer } from './server/server.js'
import {
  ARCUS_API_CONTRACT_VERSION,
  matchesArcusApiContract,
} from './server/apiContract.js'

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
    const [session, register, account, health] = await Promise.all([
      fetchWithTimeout(`${arcusApiOrigin}/api/auth/session`),
      fetchWithTimeout(`${arcusApiOrigin}/api/auth/register`),
      fetchWithTimeout(`${arcusApiOrigin}/api/professional/account`),
      fetchWithTimeout(`${arcusApiOrigin}/api/health`),
    ])
    const healthPayload = health.ok ? await health.json() : null

    return matchesArcusApiContract({
      accountStatus: account.status,
      contractVersion: healthPayload?.apiContractVersion,
      registerStatus: register.status,
      sessionOk: session.ok,
    })
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
      throw new Error(
        `ARCUS API port 4174 is already in use, but the running API does not expose ${ARCUS_API_CONTRACT_VERSION}. Stop the old process and rerun npm run dev.`,
        { cause: error }
      )
    }

    console.error('ARCUS API failed to start', error)
  }
}

const arcusApiPlugin = {
  name: 'arcus-api',
  configureServer() {
    return ensureArcusApiServer()
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), arcusApiPlugin],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": arcusApiOrigin,
    },
    strictPort: true,
  },
})
