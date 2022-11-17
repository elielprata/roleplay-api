import Mail from '@ioc:Adonis/Addons/Mail'
import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

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
  }).pin()
})
