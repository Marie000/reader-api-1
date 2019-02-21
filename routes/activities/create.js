const { Reader } = require('../../models/Reader')
const { Tag } = require('../../models/Tag')
const { Activity } = require('../../models/Activity')
const { createActivityObject } = require('./utils')

const handleCreate = async (req, res, reader) => {
  const body = req.body
  switch (body.object.type) {
    case 'reader:Publication':
      const resultPub = await Reader.addPublication(reader, body.object)
      if (resultPub instanceof Error || !resultPub) {
        const message = resultPub
          ? resultPub.message
          : 'publication creation failed'
        res.status(400).send(`create publication error: ${message}`)
      }
      const activityObjPub = createActivityObject(body, resultPub, reader)
      Activity.createActivity(activityObjPub)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    case 'Document':
      const resultDoc = await Reader.addDocument(reader, body.object)
      if (
        resultDoc instanceof Error &&
        resultDoc.message === 'no publication'
      ) {
        res
          .status(404)
          .send(
            `no publication found for ${
              body.object.context
            }. Document must belong to an existing publication.`
          )
        break
      }
      if (resultDoc instanceof Error || !resultDoc) {
        const message = resultDoc
          ? resultDoc.message
          : 'document creation failed'
        res.status(400).send(`create document error: ${message}`)
        break
      }
      const activityObjDoc = createActivityObject(body, resultDoc, reader)
      Activity.createActivity(activityObjDoc)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    case 'Note':
      const resultNote = await Reader.addNote(reader, body.object)
      if (!resultNote) res.status.send('create note error')
      if (resultNote instanceof Error) {
        switch (resultNote.message) {
          case 'no publication':
            res
              .status(404)
              .send(
                `note creation failed: no publication found with id ${
                  body.object.context
                }`
              )
            break

          case 'no document':
            res
              .status(404)
              .send(
                `note creation failed: no document found with id ${
                  body.object.inReplyTo
                }`
              )
            break

          case 'wrong publication':
            res
              .status(400)
              .send(
                `note creation failed: document ${
                  body.object.inReplyTo
                } does not belong to publication ${body.object.context}`
              )
            break

          default:
            res.status(400).send(`note creation failed: ${resultNote.message}`)
            break
        }
        break
      }
      if (resultNote instanceof Error || !resultNote) {
        const message = resultNote ? resultNote.message : 'note creation failed'
        res.status(400).send(`create note error: ${message}`)
      }
      const activityObjNote = createActivityObject(body, resultNote, reader)
      Activity.createActivity(activityObjNote)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    case 'reader:Stack':
      const resultStack = await Tag.createTag(reader.id, body.object)
      if (resultStack instanceof Error || !resultStack) {
        const message = resultStack
          ? resultStack.message
          : 'stack creation failed'
        res.status(400).send(`create stack error: ${message}`)
      }
      const activityObjStack = createActivityObject(body, resultStack, reader)
      Activity.createActivity(activityObjStack)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    default:
      res.status(400).send(`cannot create ${body.object.type}`)
      break
  }
}

module.exports = { handleCreate }