import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'

test.group('Group', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return Database.rollbackGlobalTransaction()
  })

  test('it should create a group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }
    const response = await client.post('/groups ').json(groupPayload).loginAs(user)

    response.assertStatus(201)
    assert.equal(response.body().group.name, groupPayload.name)
    assert.equal(response.body().group.description, groupPayload.description)
    assert.equal(response.body().group.schedule, groupPayload.schedule)
    assert.equal(response.body().group.location, groupPayload.location)
    assert.equal(response.body().group.chronic, groupPayload.chronic)
    assert.equal(response.body().group.master, groupPayload.master)

    assert.exists(response.body().group.players, 'Players undefined')
    assert.equal(response.body().group.players.length, 1)
    assert.equal(response.body().group.players[0].id, groupPayload.master)
  })

  test('it should return 422 when required data is not provided', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client.post('/groups').json({}).loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  //test('it should ').pin()
})
