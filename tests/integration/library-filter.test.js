const request = require('supertest')
const tap = require('tap')
const urlparse = require('url').parse
const {
  getToken,
  createUser,
  destroyDB,
  getActivityFromUrl,
  createPublication
} = require('../utils/utils')
const app = require('../../server').app

const test = async () => {
  if (!process.env.POSTGRE_INSTANCE) {
    await app.initialize()
  }

  const token = getToken()
  const readerCompleteUrl = await createUser(app, token)
  const readerUrl = urlparse(readerCompleteUrl).path

  const createPublicationSimplified = async object => {
    return await createPublication(app, token, readerUrl, object)
  }

  await createPublicationSimplified({
    name: 'Publication A',
    author: 'John Smith',
    editor: 'Jane Doe'
  })

  await tap.test('filter library by collection', async () => {
    // add more publications
    // publication 2
    const pubBres = await createPublicationSimplified({ name: 'Publication 2' })

    const pubActivityUrl = pubBres.get('Location')
    const pubActivityObject = await getActivityFromUrl(
      app,
      pubActivityUrl,
      token
    )
    const publication = pubActivityObject.object

    // publication 3
    await createPublicationSimplified({ name: 'Publication 3' })

    // create a stack
    const stackRes = await request(app)
      .post(`${readerUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' }
          ],
          type: 'Create',
          object: {
            type: 'reader:Stack',
            name: 'mystack'
          }
        })
      )

    const stackActivityUrl = stackRes.get('Location')
    const stackActivityObject = await getActivityFromUrl(
      app,
      stackActivityUrl,
      token
    )

    const stack = stackActivityObject.object
    // assign mystack to publication B
    await request(app)
      .post(`${readerUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' }
          ],
          type: 'Add',
          object: { id: stack.id, type: 'reader:Stack' },
          target: { id: publication.id, type: 'Publication' }
        })
      )

    // get library with filter for collection
    const res = await request(app)
      .get(`${readerUrl}/library?stack=mystack`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res.statusCode, 200)

    const body = res.body
    await tap.type(body, 'object')
    await tap.equal(body.totalItems, 1)
    await tap.ok(Array.isArray(body.items))
    // documents should include:
    await tap.equal(body.items[0].name, 'Publication 2')
  })

  // add more publications

  await createPublicationSimplified({ name: 'Publication 4' })
  await createPublicationSimplified({ name: 'Publication 5' })
  await createPublicationSimplified({ name: 'Publication 6' })
  await createPublicationSimplified({ name: 'Publication 7' })
  await createPublicationSimplified({ name: 'Publication 8' })
  await createPublicationSimplified({ name: 'Publication 9' })
  await createPublicationSimplified({ name: 'Publication 10' })
  await createPublicationSimplified({ name: 'Publication 11' })
  await createPublicationSimplified({ name: 'Publication 12' })
  await createPublicationSimplified({ name: 'Publication 13' })

  await tap.test('filter library by title', async () => {
    await createPublicationSimplified({ name: 'superbook' })
    await createPublicationSimplified({ name: 'Super great book!' })

    const res = await request(app)
      .get(`${readerUrl}/library?title=super`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res.status, 200)
    await tap.ok(res.body)
    await tap.equal(res.body.totalItems, 2)
    await tap.ok(res.body.items)
    await tap.equal(res.body.items[0].name, 'Super great book!')

    // should work with limit
    const res2 = await request(app)
      .get(`${readerUrl}/library?title=publication`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res2.body.totalItems, 10)

    const res3 = await request(app)
      .get(`${readerUrl}/library?title=publication&limit=11`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res3.body.totalItems, 11)

    // should return 0 items if none found
    const res4 = await request(app)
      .get(`${readerUrl}/library?title=ansoiwereow`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res4.body.totalItems, 0)
  })

  await tap.test('filter library by attribution', async () => {
    await createPublicationSimplified({
      name: 'new book 1',
      author: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 2',
      author: `jo H. n'dOe`
    })
    await createPublicationSimplified({
      name: 'new book 3',
      author: 'John Smith',
      editor: 'John doe'
    })

    const res = await request(app)
      .get(`${readerUrl}/library?attribution=John%20Doe`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
    await tap.equal(res.status, 200)
    await tap.ok(res.body)

    const body = res.body
    await tap.type(body, 'object')
    await tap.type(body.id, 'string')
    // should @context be an object or a string?
    await tap.type(body['@context'], 'string')
    await tap.equal(body.type, 'Collection')
    await tap.type(body.totalItems, 'number')
    await tap.equal(body.totalItems, 3)
    await tap.ok(Array.isArray(body.items))
    // documents should include:
    await tap.equal(body.items[0].type, 'Publication')
    await tap.type(body.items[0].id, 'string')
    await tap.type(body.items[0].name, 'string')
    await tap.equal(body.items[0].name, 'new book 3')
    await tap.equal(body.items[0].author[0].name, 'John Smith')
    // documents should NOT include:
    await tap.notOk(body.items[0].resources)
    await tap.notOk(body.items[0].readingOrder)
    await tap.notOk(body.items[0].links)
    await tap.notOk(body.items[0].json)

    // should work with partial match
    const res1 = await request(app)
      .get(`${readerUrl}/library?attribution=John d`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res1.body.items.length, 3)

    // should work with limit
    await createPublicationSimplified({
      name: 'new book 4',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 5',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 6',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 7',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 8',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 9',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 10',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 11',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 12',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 13',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 14',
      author: 'Jane Smith',
      editor: 'John Doe'
    })
    await createPublicationSimplified({
      name: 'new book 15',
      author: 'Jane Smith',
      editor: 'John Doe'
    })

    const res2 = await request(app)
      .get(`${readerUrl}/library?attribution=John%20Doe`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res2.body.items.length, 10)

    const res3 = await request(app)
      .get(`${readerUrl}/library?attribution=John%20Doe&limit=11`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res3.body.items.length, 11)

    const res4 = await request(app)
      .get(`${readerUrl}/library?attribution=John%20Doe&limit=11&page=2`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res4.body.items.length, 4)
  })

  await tap.test('filter library by attribution with role', async () => {
    const res = await request(app)
      .get(`${readerUrl}/library?attribution=John%20D&role=author`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
    await tap.equal(res.status, 200)
    await tap.ok(res.body)
    await tap.equal(res.body.items.length, 2)

    // should work with editor and with pagination
    const res2 = await request(app)
      .get(`${readerUrl}/library?attribution=John%20D&role=editor`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res2.body.items.length, 10)

    const res3 = await request(app)
      .get(`${readerUrl}/library?attribution=John%20D&role=editor&page=2`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res3.body.items.length, 3)
  })

  await tap.test('filter library by author', async () => {
    const res = await request(app)
      .get(`${readerUrl}/library?author=John%20Doe`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
    await tap.equal(res.status, 200)
    await tap.ok(res.body)

    const body = res.body
    await tap.type(body, 'object')
    await tap.type(body.id, 'string')
    // should @context be an object or a string?
    await tap.type(body['@context'], 'string')
    await tap.equal(body.type, 'Collection')
    await tap.type(body.totalItems, 'number')
    await tap.equal(body.totalItems, 2)
    await tap.ok(Array.isArray(body.items))
    // documents should include:
    await tap.equal(body.items[0].type, 'Publication')
    await tap.type(body.items[0].id, 'string')
    await tap.type(body.items[0].name, 'string')
    await tap.equal(body.items[0].name, 'new book 2')
    await tap.equal(body.items[0].author[0].name, `jo H. n'dOe`)
    // documents should NOT include:
    await tap.notOk(body.items[0].resources)
    await tap.notOk(body.items[0].readingOrder)
    await tap.notOk(body.items[0].links)
    await tap.notOk(body.items[0].json)

    // should work with limit
    const res2 = await request(app)
      .get(`${readerUrl}/library?author=JaneSmith`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res2.body.items.length, 10)

    const res3 = await request(app)
      .get(`${readerUrl}/library?author=JaneSmith&limit=11`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res3.body.items.length, 11)

    const res4 = await request(app)
      .get(`${readerUrl}/library?author=JaneSmith&limit=11&page=2`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res4.body.items.length, 1)
  })

  if (!process.env.POSTGRE_INSTANCE) {
    await app.terminate()
  }
  await destroyDB(app)
}

module.exports = test
