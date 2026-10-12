import test from 'node:test'
import assert from 'node:assert/strict'
import { canOpenPage, pageAccess } from '../src/access.ts'
import { tokenExpiresAt } from '../src/session-token.ts'

test('super administrators can open every page', () => {
  for (const path of Object.keys(pageAccess)) assert.equal(canOpenPage('super_admin', path), true)
})

test('restricted pages are closed to roles without access', () => {
  assert.equal(canOpenPage('support', '/kyc'), false)
  assert.equal(canOpenPage('support', '/finance'), false)
  assert.equal(canOpenPage('finance', '/users'), false)
  assert.equal(canOpenPage('operations', '/access'), false)
  assert.equal(canOpenPage('compliance', '/audit'), false)
})

test('roles keep access to the pages their work needs', () => {
  assert.equal(canOpenPage('compliance', '/kyc'), true)
  assert.equal(canOpenPage('finance', '/finance'), true)
  assert.equal(canOpenPage('operations', '/fraud'), true)
  assert.equal(canOpenPage('support', '/transactions'), true)
})

test('unknown pages are closed to everyone except through the fallback route', () => {
  assert.equal(canOpenPage('super_admin', '/not-a-page'), false)
})

test('token expiry is read from the token payload', () => {
  const payload = Buffer.from(JSON.stringify({ exp: 1_800_000_000 })).toString('base64url')
  assert.equal(tokenExpiresAt(`header.${payload}.signature`), 1_800_000_000_000)
  assert.equal(tokenExpiresAt('not-a-token'), null)
  assert.equal(tokenExpiresAt(null), null)
})
