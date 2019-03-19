// @flow
'use strict'
const Model = require('objection').Model
const { BaseModel } = require('./BaseModel.js')
const short = require('short-uuid')
const translator = short()
const { Activity } = require('./Activity')
const _ = require('lodash')
const { urlToId } = require('../routes/utils')

/**
 * @property {Reader} reader - Returns the reader that owns this note. In most cases this should be 'actor' in the activity streams sense
 * @property {Document} inReplyTo - returns the document, if any, that this note is on.
 * @property {Publication} context - Returns the note's parent `Publication`.
 * @property {Activity[]} outbox - Returns the activities on this note. **Question** how should a note reference its activities?
 * @property {Tag[]} tag - Returns the note's `Tag` objects (i.e. links, hashtags, stacks and categories).
 *
 * todo: handle attributedTo and tags properly.
 *
 * This type covers all annotations on both Publications and Documents.
 *
 */
class Note extends BaseModel {
  static get tableName () /*: string */ {
    return 'Note'
  }
  get path () /*: string */ {
    return 'note'
  }
  static get jsonSchema () /*: any */ {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', maxLength: 255 },
        readerId: { type: 'string', format: 'uuid', maxLength: 255 },
        json: {
          type: 'object',
          properties: {
            type: { const: 'Note' }
          },
          additionalProperties: true
        },
        updated: { type: 'string', format: 'date-time' },
        published: { type: 'string', format: 'date-time' },
        deleted: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true,
      required: ['json']
    }
  }

  static get relationMappings () /*: any */ {
    const { Publication } = require('./Publication.js')
    const { Reader } = require('./Reader.js')
    const { Document } = require('./Document.js')
    return {
      reader: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reader,
        join: {
          from: 'Note.readerId',
          to: 'Reader.id'
        }
      },
      outbox: {
        relation: Model.HasManyRelation,
        modelClass: Activity,
        join: {
          from: 'Note.id',
          to: 'Activity.noteId'
        }
      },
      inReplyTo: {
        relation: Model.BelongsToOneRelation,
        modelClass: Document,
        join: {
          from: 'Note.documentId',
          to: 'Document.id'
        }
      },
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: Publication,
        join: {
          from: 'Note.publicationId',
          to: 'Publication.id'
        }
      }
    }
  }

  static async byShortId (
    shortId /*: string */
  ) /*: Promise<{
    id: string,
    type: string,
    json: {
      type: string,
      content: string,
      'oa:selector':any,
      context: string,
      inReplyTo: string,
      summaryMap: { en: string },
      readerId: string,
      published: string,
      updated: string,
      reader: {id: string, json: any, userId: string, published: string, updated: string}
    }
  }> */ {
    return Note.query()
      .findById(translator.toUUID(shortId))
      .eager('reader')
  }

  asRef () /*: string */ {
    return this.toJSON().id
  }

  static async delete (shortId /*: string */) /*: Promise<any> */ {
    const noteId = translator.toUUID(shortId)
    let note = await Note.query().findById(noteId)
    if (!note || note.deleted) return null
    note.deleted = new Date().toISOString()
    return await Note.query().updateAndFetchById(noteId, note)
  }

  static async update (object /*: any */) /*: Promise<any> */ {
    // $FlowFixMe
    const noteId = urlToId(object.id)
    const modifications = _.pick(object, [
      'content',
      'summary',
      'oa:hasSelector'
    ])
    let note = await Note.query().findById(noteId)
    if (!note || note.deleted) {
      return null
    }
    note.json = Object.assign(note.json, modifications)
    return await Note.query().updateAndFetchById(noteId, note)
  }
}

module.exports = { Note }
