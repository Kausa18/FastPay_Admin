import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionRefresher, SESSION_REFRESH_RETRY_MS } from '../src/session-token.ts'

const token = (exp) =>
  `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`

test('high-frequency activity cannot flood token refresh after an outage', async () => {
  let calls = 0
  let time = 1_000_000
  const refresher = createSessionRefresher({
    getToken: () => token(1_050),
    setToken: () => assert.fail('failed refresh must not replace the token'),
    exchange: async () => {
      calls++
      throw new Error('Unavailable')
    },
    refreshWindowMs: 60_000,
    now: () => time,
  })
  await refresher.refresh()
  await Promise.all(Array.from({ length: 100 }, () => refresher.refresh()))
  assert.equal(calls, 1)
  time += SESSION_REFRESH_RETRY_MS
  await refresher.refresh()
  assert.equal(calls, 2)
})

test('concurrent refresh calls share one exchange and store the returned token', async () => {
  let saved = token(1_050)
  let complete
  let calls = 0
  const refresher = createSessionRefresher({
    getToken: () => saved,
    setToken: (value) => {
      saved = value
    },
    exchange: () => {
      calls++
      return new Promise((resolve) => {
        complete = resolve
      })
    },
    refreshWindowMs: 60_000,
    now: () => 1_000_000,
  })
  const pending = refresher.refresh()
  await refresher.refresh()
  assert.equal(calls, 1)
  complete(token(2_000))
  await pending
  assert.equal(saved, token(2_000))
})

test('a late refresh cannot restore a signed-out session', async () => {
  let saved = token(1_050)
  let complete
  const refresher = createSessionRefresher({
    getToken: () => saved,
    setToken: () => assert.fail('logout must remain effective'),
    exchange: () =>
      new Promise((resolve) => {
        complete = resolve
      }),
    refreshWindowMs: 60_000,
    now: () => 1_000_000,
  })
  const pending = refresher.refresh()
  saved = null
  complete(token(2_000))
  await pending
})

test('fresh and cancelled sessions spend no refresh requests', async () => {
  const refresher = createSessionRefresher({
    getToken: () => token(2_000),
    setToken: () => assert.fail(),
    exchange: () => assert.fail('fresh or cancelled session must not refresh'),
    refreshWindowMs: 60_000,
    now: () => 1_000_000,
  })
  await refresher.refresh()
  refresher.cancel()
  await refresher.refresh()
})
