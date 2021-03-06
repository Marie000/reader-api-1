const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Reader } = require('../models/Reader')
const debug = require('debug')('hobb:routes:readers')
const _ = require('lodash')

class ReaderExistsError extends Error {
  constructor (userId) {
    super(`Reader already exists for user ${userId}`)
  }
}

const insertNewReader = (userId, person) => {
  debug(`Inserting new reader for user ID ${userId}`)
  return new Promise((resolve, reject) => {
    debug(`Querying for user with ID ${userId}`)
    Reader.checkIfExists(userId)
      .then(response => {
        if (response) {
          reject(new ReaderExistsError(userId))
        } else {
          return Reader.createReader(userId, person)
        }
      })
      .then(resolve)
  })
}

/**
 * @swagger
 * definition:
 *   readers-request:
 *     properties:
 *       type:
 *         type: string
 *         enum: ['Person']
 *       name:
 *         type: string
 *       '@context':
 *         type: array
 *
 */

module.exports = function (app) {
  /**
   * @swagger
   * /readers:
   *   post:
   *     tags:
   *       - readers
   *     description: POST /readers
   *     security:
   *       - Bearer: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/definitions/readers-request'
   *     responses:
   *       201:
   *         description: Created
   *       400:
   *         description: 'Reader already exists'
   */
  app.use('/', router)
  router.post(
    '/readers',
    passport.authenticate('jwt', { session: false }),
    function (req, res, next) {
      insertNewReader(req.user, req.body)
        .then(reader => {
          debug(`Got reader ${JSON.stringify(reader)}`)
          res.setHeader(
            'Content-Type',
            'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
          )
          debug(`Setting location to ${reader.url}`)
          res.setHeader('Location', reader.url)
          res.sendStatus(201)
          res.end()
        })
        .catch(err => {
          if (err instanceof ReaderExistsError) {
            res.status(400).send(err.message)
          } else {
            next(err)
          }
        })
    }
  )
}
