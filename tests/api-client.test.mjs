import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ApiError,
  createApiClient,
  REQUEST_TIMEOUT_MS,
  STARTUP_TIMEOUT_MS,
} from '../src/api-client.ts'

const ok = (data) => new Response(JSON.stringify({ success: true, data }))
const waitForAbort = (signal) =>
  new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })

function client(fetchRequest) {
  const state = { token: 'saved-token', expired: 0 }
  const api = createApiClient({
    baseUrl: 'https://api.example.test',
    getToken: () => state.token,
    onUnauthorized: () => {
      state.token = null
      state.expired++
    },
    fetchRequest,
  })
  return { api, state }
}

test('requests include the saved token and preserve Headers overrides', async () => {
  const { api } = client(async (url, init) => {
    assert.equal(url, 'https://api.example.test/users')
    assert.equal(init.headers.get('Authorization'), 'Bearer saved-token')
    assert.equal(init.headers.get('Content-Type'), 'application/custom+json')
    assert.equal(init.headers.get('X-Request-ID'), 'request-1')
    return ok({ id: 1 })
  })
  assert.deepEqual(
    await api('/users', {
      headers: new Headers({
        'Content-Type': 'application/custom+json',
        'X-Request-ID': 'request-1',
      }),
    }),
    { id: 1 },
  )
})

test('a stalled connection reaches a deadline and keeps the session', async () => {
  let calls = 0
  const { api, state } = client(async (_, init) => {
    calls++
    return waitForAbort(init.signal)
  })
  await assert.rejects(
    api('/users', { timeoutMs: 5 }),
    (error) =>
      error instanceof ApiError && error.status === 0 && /taking too long/.test(error.message),
  )
  assert.equal(calls, 1)
  assert.equal(state.token, 'saved-token')
  assert.equal(state.expired, 0)
})

test('the same deadline bounds a stalled response body', async () => {
  const { api } = client(async (_, init) => ({
    ok: true,
    status: 200,
    text: () => waitForAbort(init.signal),
  }))
  await assert.rejects(api('/users', { timeoutMs: 5 }), /taking too long/)
})

test('timed-out writes are sent once and warn that the action may have completed', async () => {
  let calls = 0
  const { api } = client(async (_, init) => {
    calls++
    return waitForAbort(init.signal)
  })
  await assert.rejects(
    api('/decision', { method: 'PUT', timeoutMs: 5 }),
    /Check whether the action completed/,
  )
  assert.equal(calls, 1)
})

test('network failures have a useful message and preserve the token', async () => {
  const { api, state } = client(async () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(api('/users'), /Unable to reach the server/)
  assert.equal(state.token, 'saved-token')
  assert.equal(state.expired, 0)
})

test('an HTML gateway failure becomes an actionable server error', async () => {
  const { api, state } = client(
    async () => new Response('<html>Unavailable</html>', { status: 503 }),
  )
  await assert.rejects(
    api('/users'),
    (error) => error.status === 503 && /temporarily unavailable/.test(error.message),
  )
  assert.equal(state.expired, 0)
})

test('non-object gateway bodies retain the HTTP error classification', async () => {
  for (const body of ['null', '[]', '"unavailable"']) {
    const { api } = client(async () => new Response(body, { status: 503 }))
    await assert.rejects(
      api('/users'),
      (error) => error.status === 503 && /temporarily unavailable/.test(error.message),
    )
  }
})

test('unauthorized responses clear only the session that sent the request', async () => {
  const { api, state } = client(
    async () => new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 }),
  )
  await assert.rejects(api('/me'), /Expired/)
  assert.equal(state.token, null)
  assert.equal(state.expired, 1)

  let newerState
  const newer = client(async () => {
    newerState.token = 'new-session'
    return new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 })
  })
  newerState = newer.state
  await assert.rejects(newer.api('/me'), /Expired/)
  assert.equal(newer.state.token, 'new-session')
  assert.equal(newer.state.expired, 0)
})

test('invalid success bodies and validation arrays do not become undefined data', async () => {
  const invalid = client(async () => new Response('<html>Wrong host</html>'))
  await assert.rejects(invalid.api('/me'), /unreadable response/)
  const validation = client(
    async () =>
      new Response(JSON.stringify({ detail: [{ msg: 'Invalid email' }] }), { status: 422 }),
  )
  await assert.rejects(validation.api('/me'), /Invalid email/)
})

test('caller cancellation is propagated instead of shown as a network outage', async () => {
  const { api, state } = client(async (_, init) => waitForAbort(init.signal))
  const controller = new AbortController()
  const pending = api('/me', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, (error) => error.name === 'AbortError')
  assert.equal(state.expired, 0)
})

test('a delayed cold start can succeed while an ordinary request reaches its deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const signals = []
  const { api } = client(async (_, init) => {
    signals.push(init.signal)
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
      setTimeout(() => resolve(ok({ connected: true })), 45_000)
    })
  })
  const ordinary = assert.rejects(api('/users'), /taking too long/)
  const startup = api('/me', { timeoutMs: STARTUP_TIMEOUT_MS })
  t.mock.timers.tick(REQUEST_TIMEOUT_MS)
  assert.equal(signals[0].aborted, true)
  assert.equal(signals[1].aborted, false)
  t.mock.timers.tick(15_000)
  assert.deepEqual(await startup, { connected: true })
  await ordinary
})
