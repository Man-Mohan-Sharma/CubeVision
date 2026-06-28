const { hashPassword, verifyPassword } = require('../utils/password')
const { signJwt, verifyJwt } = require('../utils/jwt')

describe('Password hashing', () => {
  test('hashes and verifies password without storing plaintext', () => {
    const hash = hashPassword('secret123')
    expect(hash).toMatch(/^scrypt\$/)
    expect(hash).not.toContain('secret123')
    expect(verifyPassword('secret123', hash)).toBe(true)
    expect(verifyPassword('wrong-password', hash)).toBe(false)
  })
})

describe('JWT utilities', () => {
  test('signs and verifies a user token', () => {
    const token = signJwt({ sub: 'user123', email: 'a@test.com' }, { expiresIn: '1h' })
    const payload = verifyJwt(token)
    expect(payload.sub).toBe('user123')
    expect(payload.email).toBe('a@test.com')
    expect(payload.exp).toBeGreaterThan(payload.iat)
  })
})
