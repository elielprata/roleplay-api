import Group from 'App/Models/Group'
import Factory from '@ioc:Adonis/Lucid/Factory'
import Users from 'App/Models/User'

export const UserFactory = Factory.define(Users, ({ faker }) => {
  return {
    username: faker.name.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    avatar: faker.internet.url(),
  }
}).build()

export const GroupFactory = Factory.define(Group, ({ faker }) => {
  return {
    name: faker.name.fullName(),
    description: faker.lorem.sentence(),
    schedule: faker.date.weekday(),
    location: faker.internet.url(),
    chronic: faker.lorem.words(3),
  }
}).build()
