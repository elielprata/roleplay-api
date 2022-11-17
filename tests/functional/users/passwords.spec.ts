import Hash from '@ioc:Adonis/Core/Hash'
import Mail from '@ioc:Adonis/Addons/Mail'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'
import { DateTime, Duration } from 'luxon'

test.group('Password', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should send and mail with forgot password instructions', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const fakeMailer = Mail.fake()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    response.assertStatus(204)

    assert.isTrue(fakeMailer.exists({ to: [{ address: user.email }] }))
    assert.isTrue(fakeMailer.exists({ from: { address: 'no-reply@roleplay.com' } }))
    assert.isTrue(fakeMailer.exists({ subject: 'Roleplay: Recuperação de Senha' }))
    assert.isTrue(fakeMailer.exists((mail) => mail.html!.includes(user.username)))

    Mail.restore()
  })

  test('it should create a reset password token', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    response.assertStatus(204)

    const tokens = await user.related('tokens').query()
    assert.isNotEmpty(tokens)
  })

  test('it should return 422 when required data is not provided or data is invalid', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/forgot-password').json({})

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should be able to reset password', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    await user.refresh()
    const checkPassword = await Hash.verify(user.password, '123456')

    assert.isTrue(checkPassword)
    response.assertStatus(204)
  })

  test('it should return 422 when required data is not provided or data is invalid', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/reset-password').json({})

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should return 404 when using the same toke twice', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })
    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it cannot reset password when token is expired after 2 hours', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    response.assertStatus(410)
    assert.equal(response.body().code, 'TOKEN_EXPIRED')
    assert.equal(response.body().status, 410)
  })
})
