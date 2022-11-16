import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('User', (group) => {
  test('it should create an user', async ({ client, assert }) => {
    const userPayload = {
      username: 'test',
      email: 'test@test.com',
      password: 'test',
      avatar: 'https://images.com/image/1',
    }
    const response = await client.post('/users').json(userPayload)

    response.assertStatus(201)

    assert.exists(response.body().user, 'User undefined')
    assert.exists(response.body().user.id, 'Id undefined')
    assert.equal(response.body().user.email, userPayload.email)
    assert.notExists(response.body().user.password, 'Password defined')
    assert.equal(response.body().user.avatar, userPayload.avatar)

    /* const { password, avatar, ...expected } = userPayload
    
    response.assertBodyContains(expected) */
  })

  test('it should return 409 when email is already in use', async ({ client, assert }) => {
    const { email } = await UserFactory.create()
    const response = await client.post('/users').json({
      email,
      username: 'test',
      password: 'test',
    })

    response.assertStatus(409)
    assert.include(response.body().message, 'email')
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 409 when username is already in use', async ({ client, assert }) => {
    const { username } = await UserFactory.create()
    const response = await client.post('/users').json({
      email: 'test@test.com',
      username,
      password: 'test',
    })

    response.assertStatus(409)
    assert.include(response.body().message, 'username')
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when required data is not provided', async ({ client, assert }) => {
    const response = await client.post('/users').json({})
    console.log(response.body())
    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  }).pin()
})
