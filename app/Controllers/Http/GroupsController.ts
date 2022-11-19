import BadRequest from 'App/Exceptions/BadRequestException'

import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Group from 'App/Models/Group'
import CreateGroupValidator from 'App/Validators/CreateGroupValidator'

export default class GroupsController {
  public async index({ request, response, bouncer }: HttpContextContract) {
    const { ['user']: userId, text } = request.qs()

    const page = request.input('page', 1)
    const limit = request.input('limit', 5)

    const groupsQuery = this.filterByQueryString(userId, text)
    const groups = await groupsQuery.paginate(page, limit)

    return response.ok({ groups })
  }

  public async store({ request, response, bouncer }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroupValidator)
    const group = await Group.create(groupPayload)

    await bouncer.authorize('deleteGroup', group)
    await group.related('players').attach([groupPayload.master])
    await group.load('players')

    response.created({ group })
  }

  public async update({ request, response }: HttpContextContract) {
    const id = request.param('id')
    const payload = request.all()
    const group = await Group.findOrFail(id)
    const updatedGroup = await group.merge(payload).save()

    return response.ok({ group: updatedGroup })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = +request.param('groupId')
    const playerId = +request.param('playerId')

    const group = await Group.findOrFail(groupId)

    if (playerId === group.master) throw new BadRequest('cannot remove master from group', 400)
    await group.related('players').detach([playerId])

    return response.ok({})
  }

  public async destroy({ request, response, bouncer, auth }: HttpContextContract) {
    const id = request.param('id')
    const group = await Group.findOrFail(id)

    await bouncer.authorize('deleteGroup', group)

    await group.delete()
    return response.ok({})
  }

  private filterByQueryString(userId: number, text: string) {
    if (userId && text) return this.filterByUserAndText(userId, text)
    else if (userId) return this.filterByUser(userId)
    else if (text) return this.filterByText(text)
    else return this.all()
  }

  private all() {
    return Group.query().preload('players').preload('masterUser')
  }

  private filterByUser(userId: number) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
  }

  private filterByText(text: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.whereNameOrDescription(text))
  }

  private filterByUserAndText(userId: number, text: string) {
    return Group.query()
      .preload('players')
      .preload('masterUser')
      .withScopes((scope) => scope.withPlayer(userId))
      .withScopes((scope) => scope.whereNameOrDescription(text))
  }
}
