import { test } from '@japa/runner'

test.group('User', () => {
  test('it should create an user', async ({ client, assert }) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'test',
      password: 'test',
      avatar: 'https://images.com/image/1',
    }
    const response = await client.post('/users').json(userPayload)

    assert.exists(response.body().user, 'User undefined')
    assert.exists(response.body().id, 'Id undefined')
    assert.equal(response.body().email, userPayload.email)
    assert.equal(response.body().password, userPayload.password)
    assert.equal(response.body().avatar, userPayload.avatar)

    /* const { password, avatar, ...expected } = userPayload
    response.assertStatus(201)
    response.assertBodyContains(expected) */
  })
})
