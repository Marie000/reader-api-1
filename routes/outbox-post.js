const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Reader } = require('../models/Reader')
const { Activity } = require('../models/Activity')
const NoSuchReaderError = require('../errors/no-such-reader')
const debug = require('debug')('hobb:routes:outbox')
const jwtAuth = passport.authenticate('jwt', { session: false })
const _ = require('lodash')

const utils = require('./utils')

module.exports = function (app) {
  app.use('/', router)
  router
    .route('/reader-:shortId/activity')
    .post(jwtAuth, function (req, res, next) {
      const shortId = req.params.shortId
      Reader.byShortId(shortId)
        .then(reader => {
          if (!utils.checkReader(req, reader)) {
            res.status(403).send(`Access to reader ${shortId} disallowed`)
          } else {
            if (!req.is('application/ld+json')) {
              return next(new Error('Body must be JSON-LD'))
            }

            const body = req.body
            if (typeof body !== 'object') {
              return next(new Error('Body must be a JSON object'))
            }

            let pr
            if (body.type === 'Create') {
              switch (body.object.type) {
                case 'reader:Publication':
                  pr = Reader.addPublication(reader, body.object)
                  break
                case 'Document':
                  pr = Reader.addDocument(reader, body.object)
                  break
                case 'Note':
                  pr = Reader.addNote(reader, body.object)
                  break
                default:
                  pr = Promise.resolve(null)
              }
            } else {
              pr = Promise.resolve(null)
            }
            pr
              .then(result => {
                debug(result)
                let props = Object.assign(body, {
                  actor: {
                    type: 'Person',
                    id: reader.url
                  }
                })
                if (result) {
                  props = Object.assign(props, {
                    object: {
                      type: result.json.type,
                      id: result.url
                    }
                  })
                }
                debug(props)
                Activity.createActivity(props)
                  .then(activity => {
                    res.status(201)
                    res.set('Location', activity.url)
                    res.end()
                  })
                  .catch(next)
              })
              .catch(next)
          }
        })
        .catch(err => {
          if (err instanceof NoSuchReaderError) {
            res.status(404).send(err.message)
          } else {
            next(err)
          }
        })
    })
}