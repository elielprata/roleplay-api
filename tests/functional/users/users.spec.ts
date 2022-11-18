import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('User', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

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
      username,
      email: 'test@test.com',
      password: 'test',
    })

    response.assertStatus(409)
    assert.include(response.body().message, 'username')
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when required data is not provided', async ({ client, assert }) => {
    const response = await client.post('/users').json({})

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid email', async ({ client, assert }) => {
    const { username, password } = await UserFactory.create()
    const response = await client.post('/users').json({
      username,
      email: 'test@',
      password,
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid password', async ({ client, assert }) => {
    const { username, email } = await UserFactory.create()
    const response = await client.post('/users').json({
      username,
      email,
      password: 'tes',
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should update an user', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const email = 'test@test.com'
    const avatar = 'htpps://image.com/img/1'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email,
        avatar,
        password: user.password,
      })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        email,
        avatar,
        id: user.id,
      },
    })
  })

  test('it should the password of the user', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const password = 'test'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: user.email,
        avatar: user.avatar,
        password,
      })
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().user.id, user.id)

    await user.refresh()
    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('it should return 422 when required data is not provided', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client.put(`/users/${user.id}`).json({}).loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid email', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)
      .json({
        password: user.password,
        email: 'test@',
        avatar: user.avatar,
      })
      .loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid password', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)
      .json({
        password: '123',
        email: user.email,
        avatar: user.avatar,
      })
      .loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid avatar', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)
      .json({
        password: user.password,
        email: user.email,
        avatar: 'htps:/aa.com',
      })
      .loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })
})
