const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Reader } = require('../models/Reader')
const debug = require('debug')('hobb:routes:readers')
const boom = require('@hapi/boom')
const { ValidationError } = require('objection')

const insertNewReader = async (readerId, person, next) => {
  debug(`Inserting new reader for user ID ${readerId}`)
  debug(`Querying for reader with ID ${readerId}`)
  const exists = await Reader.checkIfExistsByAuthId(readerId)
  if (exists) {
    return next(
      boom.badRequest(`reader already exists with id ${readerId}`, {
        type: 'Reader',
        id: readerId,
        activity: 'Create Reader'
      })
    )
  }

  const result = await Reader.createReader(readerId, person)
  if (result instanceof ValidationError) {
    return next(
      boom.badRequest('Validation error on create Reader: ', {
        type: 'Reader',
        activity: 'Create Reader',
        validation: result.data
      })
    )
  }

  return result
}

module.exports = function (app) {
  /**
   * @swagger
   * /readers:
   *   post:
   *     tags:
   *       - readers
   *     description: Create reader
   *     security:
   *       - Bearer: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/definitions/reader'
   *     responses:
   *       201:
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/reader'
   *       400:
   *         description: Reader already exists or Validation Error
   *       401:
   *         description: No Authentication
   */
  app.use('/', router)
  router.post(
    '/readers',
    passport.authenticate('jwt', { session: false }),
    function (req, res, next) {
      insertNewReader(req.user, req.body, next)
        .then(reader => {
          debug(`Got reader ${JSON.stringify(reader)}`)
          res.setHeader('Content-Type', 'application/ld+json')
          debug(`Setting location to ${reader.id}`)
          res.setHeader('Location', reader.id)
          res.sendStatus(201)
          res.end()
        })
        .catch(err => {
          next(err)
        })
    }
  )
}
