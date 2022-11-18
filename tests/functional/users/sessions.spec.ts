import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('Session', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should authenticate an user', async ({ client, assert }) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })

    response.assertStatus(201)
    assert.isDefined(response.body().user, 'User undefined')
    assert.equal(response.body().user.id, id)
  })

  test('it should return an api token when session is created', async ({ client, assert }) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })

    response.assertStatus(201)
    assert.isDefined(response.body().token, 'Token undefined')
    assert.equal(response.body().user.id, id)
  })

  test('it should return 400 when credentials are not provided', async ({ client, assert }) => {
    const response = await client.post('/sessions').json({})

    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 400 when credentials are invalid', async ({ client, assert }) => {
    const { email } = await UserFactory.create()
    const response = await client.post('/sessions').json({
      email,
      password: 'test',
    })

    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().message, 'invalid credentials')
  })

  test('it should return 200 when user signs out', async ({ client, assert }) => {
    const plainPassword = 'test'
    const user = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client
      .post('/sessions')
      .json({
        email: user.email,
        password: plainPassword,
      })
      .loginAs(user)
    response.assertStatus(201)

    const apiToken = response.body().token

    const logout = await client
      .delete('/sessions')
      .header('Authorization', `Bearer ${apiToken.token}`)

    logout.assertStatus(200)
  })

  test('it should revoke when user signs out', async ({ client, assert }) => {
    const plainPassword = 'test'
    const user = await UserFactory.merge({ password: plainPassword }).create()
    /* const response = await client.post('/sessions').json({
      email: user.email,
      password: plainPassword,
    })
    response.assertStatus(201)

    const apiToken = response.body().token
 */
    const logout = await client.delete('/sessions').loginAs(user)

    logout.assertStatus(200)

    const token = await Database.query().select('*').from('api_tokens')

    assert.isEmpty(token)
  }).pin()
})
