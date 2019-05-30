const request = require('supertest')
const tap = require('tap')
const urlparse = require('url').parse
const { getToken, destroyDB } = require('../utils/utils')

const test = async app => {
  if (!process.env.POSTGRE_INSTANCE) {
    await app.initialize()
  }

  const token = getToken()
  // to avoid duplicate tokens:
  await new Promise(_func => setTimeout(_func, 50))
  const token2 = getToken()
  let readerUrl

  await tap.test('Create Reader', async () => {
    const res = await request(app)
      .post('/readers')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          name: 'Jane Doe',
          profile: { property: 'value' },
          preferences: { favoriteColor: 'blueish brown' },
          json: { something: '!!!!' }
        })
      )
    await tap.equal(res.status, 201)
    await tap.type(res.get('Location'), 'string')
    readerUrl = res.get('Location')
  })

  await tap.test('Create Simple Reader', async () => {
    const res = await request(app)
      .post('/readers')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token2}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          name: 'Jane Doe'
        })
      )
    await tap.equal(res.status, 201)
    await tap.type(res.get('Location'), 'string')
  })

  await tap.test('Create reader that already exists', async () => {
    const res = await request(app)
      .post('/readers')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token2}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          name: 'Jane Doe'
        })
      )

    await tap.equal(res.status, 400)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 400)
    await tap.equal(error.error, 'Bad Request')
    await tap.equal(error.details.type, 'Reader')
    await tap.type(error.details.id, 'string')
    await tap.equal(error.details.activity, 'Create Reader')
  })

  // TODO: add test for incomplete reader object (once incoming json is validated)

  if (!process.env.POSTGRE_INSTANCE) {
    await app.terminate()
  }
  await destroyDB(app)
}

module.exports = test
