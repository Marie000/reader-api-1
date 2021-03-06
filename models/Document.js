// @flow
'use strict'
const Model = require('objection').Model
const { BaseModel } = require('./BaseModel.js')
const { Publication } = require('./Publication.js')
const { Reader } = require('./Reader.js')
const short = require('short-uuid')
const translator = short()
const _ = require('lodash')

/**
 * @property {Reader} reader - Returns the reader that owns this document.
 * @property {Publication} context - Returns the document's parent `Publication`.
 * @property {Note[]} replies - Returns the notes associated with this document.
 * @property {Activity[]} outbox - Returns the activities on this document. **Question** how should a document reference its activities?
 * @property {Attribution[]} attributedTo - returns the `Attribution` objects (can be many) attributed with contributing to or creating this document.
 * @property {Tag[]} tag - Returns the document's `Tag` objects (i.e. links, hashtags, stacks and categories).
 *
 * This model covers Images, Pages (HTML, plain text, markdown), Articles, Audio, and Video resources that can be included in a publication and uploaded by a reader
 */
class Document extends BaseModel {
  static get tableName () {
    return 'Document'
  }
  get path () {
    return 'document'
  }
  static get jsonSchema () {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', maxLength: 255 },
        readerId: { type: 'string', format: 'uuid', maxLength: 255 },
        publicationId: { type: 'string', format: 'uuid', maxLength: 255 },
        json: {
          type: 'object',
          properties: {
            type: { type: 'string' }
          },
          additionalProperties: true
        },
        updated: { type: 'string', format: 'date-time' },
        published: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true,
      required: ['json']
    }
  }
  static get relationMappings () {
    const { Note } = require('./Note.js')
    const { Activity } = require('./Activity.js')
    const { Attribution } = require('./Attribution.js')
    const { Tag } = require('./Tag.js')
    return {
      reader: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reader,
        join: {
          from: 'Document.readerId',
          to: 'Reader.id'
        }
      },
      outbox: {
        relation: Model.HasManyRelation,
        modelClass: Activity,
        join: {
          from: 'Document.id',
          to: 'Activity.documentId'
        }
      },
      attributedTo: {
        relation: Model.HasManyRelation,
        modelClass: Attribution,
        join: {
          from: 'Document.id',
          to: 'Attribution.documentId'
        }
      },
      replies: {
        relation: Model.HasManyRelation,
        modelClass: Note,
        join: {
          from: 'Document.id',
          to: 'Note.documentId'
        }
      },
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: Publication,
        join: {
          from: 'Document.publicationId',
          to: 'Publication.id'
        }
      },
      tag: {
        relation: Model.HasManyRelation,
        modelClass: Tag,
        join: {
          from: 'Document.id',
          to: 'Tag.documentId'
        }
      }
    }
  }

  asRef () {
    return _.omit(this.toJSON(), ['content', 'contentMap'])
  }

  static async byShortId (shortId /*: string */) {
    return Document.query()
      .findById(translator.toUUID(shortId))
      .eager('reader')
  }
}
module.exports = { Document }
