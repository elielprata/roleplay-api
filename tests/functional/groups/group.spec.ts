import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import Group from 'App/Models/Group'
import { GroupFactory, UserFactory } from 'Database/factories'

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

  test('it should create a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()

    const response = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    response.assertStatus(201)
    assert.exists(response.body().groupRequest, 'Players undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'PENDING')
  })

  test('it should return 409 when request already exists', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()
    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    response.assertStatus(409)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 409)
  })

  test('it should return 422 when user is already in the group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }
    const groupResponse = await client.post(`/groups`).json(groupPayload).loginAs(user)

    const response = await client
      .post(`/groups/${groupResponse.body().group.id}/requests`)
      .json({})
      .loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should list group requests by master', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client
      .get(`/groups/${group.id}/requests?master=${master.id}`)
      .loginAs(master)

    response.assertStatus(200)
    assert.exists(response.body().groupRequest, 'GroupRequests undefined')
    assert.equal(response.body().groupRequest.length, 1)
    assert.equal(response.body().groupRequest[0].id, groupRequest.id)
    assert.equal(response.body().groupRequest[0].userId, groupRequest.userId)
    assert.equal(response.body().groupRequest[0].groupId, groupRequest.groupId)
    assert.equal(response.body().groupRequest[0].status, groupRequest.status)
    assert.equal(response.body().groupRequest[0].group.name, group.name)
    assert.equal(response.body().groupRequest[0].user.username, user.username)
    assert.equal(response.body().groupRequest[0].group.master, master.id)
  })

  test('it should return empty when master has no group requests', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client
      .get(`/groups/${group.id}/requests?master=${user.id}`)
      .loginAs(master)

    response.assertStatus(200)
    assert.exists(response.body().groupRequest, 'GroupRequests undefined')
    assert.equal(response.body().groupRequest.length, 0)
  })

  test('it should return 422 when master is not provided', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.get(`/groups/${group.id}/requests`).loginAs(master)

    response.assertStatus(422)
    assert.exists(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should accept a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client
      .post(`/groups/${group.id}/requests/${groupRequest.id}/accept`)
      .loginAs(master)

    response.assertStatus(200)
    assert.exists(response.body().groupRequest, 'GroupRequests undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'ACCEPTED')

    await group.load('players')
    assert.isNotEmpty(group.players)
    assert.equal(group.players.length, 1)
    assert.equal(group.players[0].id, user.id)
  })

  test('it should return 404 when providing an unexisting group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client
      .post(`/groups/123/requests/${groupRequest.id}/accept`)
      .loginAs(master)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return 404 when providing an unexisting group request', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client.post(`/groups/${group.id}/requests/123/accept`).loginAs(master)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should reject a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client
      .delete(`/groups/${group.id}/requests/${groupRequest.id}`)
      .loginAs(master)

    response.assertStatus(200)
  })

  test('it should return 404 when providing an unexisting group for rejection', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client.delete(`/groups/123/requests/${groupRequest.id}`).loginAs(master)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return 404 when providing an unexisting group request for rejection', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    const response = await client.delete(`/groups/${group.id}/requests/123`).loginAs(master)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should updated a group', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
    }
    const response = await client.patch(`/groups/${group.id}`).json(groupPayload).loginAs(master)

    response.assertStatus(200)
    assert.exists(response.body().group, 'Group undefined')
    assert.equal(response.body().group.name, groupPayload.name)
    assert.equal(response.body().group.description, groupPayload.description)
    assert.equal(response.body().group.schedule, groupPayload.schedule)
    assert.equal(response.body().group.location, groupPayload.location)
    assert.equal(response.body().group.chronic, groupPayload.chronic)
  })

  test('it should return 404 when unexisting a group', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
    }
    const response = await client.patch(`/groups/123`).json(groupPayload).loginAs(master)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should remove user from group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroupRequest = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)
    const groupRequest = responseGroupRequest.body().groupRequest

    await client.post(`/groups/${group.id}/requests/${groupRequest.id}/accept`).loginAs(master)

    const response = await client.delete(`/groups/${group.id}/players/${user.id}`).loginAs(master)

    await group.load('players')
    response.assertStatus(200)
    assert.isEmpty(group.players)
  })

  test('it should not remove master of the group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const groupResponse = await client.post('/groups').json(groupPayload).loginAs(user)

    const response = await client
      .delete(`/groups/${groupResponse.body().group.id}/players/${user.id}`)
      .loginAs(user)

    const groupModel = await Group.findOrFail(groupResponse.body().group.id)
    await groupModel.load('players')
    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 400)
    assert.isNotEmpty(groupModel.players)
  })

  test('it should remove a group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const createdGroupResponse = await client.post('/groups').json(groupPayload).loginAs(user)
    const createdGroup = createdGroupResponse.body().group

    const response = await client.delete(`/groups/${createdGroup.id}`).loginAs(user)

    const emptyGroup = await Database.query().from('groups').where('id', createdGroup.id)
    assert.isEmpty(emptyGroup)

    const players = await Database.query().from('groups_users').where('group_id', createdGroup.id)
    assert.isEmpty(players)
    response.assertStatus(200)
  })

  test('it should return 404 when providing an unexisting group for deletion', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const response = await client.delete(`/groups/123`).loginAs(user)

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return all group when query is not provided to list groups', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(user)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups`).loginAs(user)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.exists(response.body().groups.data[0].id, 'Group id undefined')
  })

  test('it should return no groups by user id', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?user=1234`).loginAs(user)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 0)
  })

  test('it should return all groups by user id', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?user=${master.id}`).loginAs(master)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, bodyGroup.id)
    assert.equal(response.body().groups.data[0].name, bodyGroup.name)
    assert.equal(response.body().groups.data[0].description, bodyGroup.description)
    assert.equal(response.body().groups.data[0].location, bodyGroup.location)
    assert.equal(response.body().groups.data[0].schedule, bodyGroup.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('it should return all groups by user id and name', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'testIdName',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    await client
      .post('/groups')
      .json({ ...groupPayload, name: '123', description: '123' })
      .loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?user=${master.id}&text=stIdName`).loginAs(master)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, bodyGroup.id)
    assert.equal(response.body().groups.data[0].name, bodyGroup.name)
    assert.equal(response.body().groups.data[0].description, bodyGroup.description)
    assert.equal(response.body().groups.data[0].location, bodyGroup.location)
    assert.equal(response.body().groups.data[0].schedule, bodyGroup.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('it should return all groups by user id and description', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: '654321',
      description: 'testUserId',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    await client
      .post('/groups')
      .json({ ...groupPayload, name: '123', description: '123' })
      .loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?user=${master.id}&text=estUserId`).loginAs(master)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, bodyGroup.id)
    assert.equal(response.body().groups.data[0].name, bodyGroup.name)
    assert.equal(response.body().groups.data[0].description, bodyGroup.description)
    assert.equal(response.body().groups.data[0].location, bodyGroup.location)
    assert.equal(response.body().groups.data[0].schedule, bodyGroup.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('it should return all groups by and name', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'testWhithoutId',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    await client
      .post('/groups')
      .json({ ...groupPayload, name: '123', description: '123' })
      .loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?text=testWhithoutId`).loginAs(master)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, bodyGroup.id)
    assert.equal(response.body().groups.data[0].name, bodyGroup.name)
    assert.equal(response.body().groups.data[0].description, bodyGroup.description)
    assert.equal(response.body().groups.data[0].location, bodyGroup.location)
    assert.equal(response.body().groups.data[0].schedule, bodyGroup.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('it should return all groups by and description', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'testWhithoutIdDesc',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id,
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    await client
      .post('/groups')
      .json({ ...groupPayload, name: '123', description: '123' })
      .loginAs(master)
    const bodyGroup = responseGroup.body().group

    const response = await client.get(`/groups?text=testWhithoutIdDesc`).loginAs(master)

    responseGroup.assertStatus(201)
    response.assertStatus(200)
    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, bodyGroup.id)
    assert.equal(response.body().groups.data[0].name, bodyGroup.name)
    assert.equal(response.body().groups.data[0].description, bodyGroup.description)
    assert.equal(response.body().groups.data[0].location, bodyGroup.location)
    assert.equal(response.body().groups.data[0].schedule, bodyGroup.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })
})
