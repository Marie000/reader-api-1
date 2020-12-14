const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Reader } = require('../../models/Reader')
const { urlToId, checkReader } = require('../../utils/utils')
const boom = require('@hapi/boom')
const debug = require('debug')('ink:routes:reader-get')
const { getStorageData } = require('../../utils/getStorageData')

module.exports = app => {
  /**
   * @swagger
   * /readers/{id}:
   *   get:
   *     tags:
   *       - readers
   *     description: Get Reader by id
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: the id of the reader
   *       - in: query
   *         name: storageData
   *         schema:
   *           type: boolean
   *         description: pass 'true' if you would like the storage data for the user. In bytes.
   *     security:
   *       - Bearer: []
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: A reader object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/reader'
   *       401:
   *         description: No authentication
   *       403:
   *         description: 'Access to reader {id} disallowed'
   *       404:
   *         description: 'No Reader with ID {id}'
   */
  app.use('/', router)
  router.get(
    '/readers/:id',
    passport.authenticate('jwt', { session: false }),
    function (req, res, next) {
      Reader.byId(req.params.id)
        .then(async reader => {
          debug('reader retrieved: ', reader)
          if (!reader || reader.deleted) {
            return next(
              boom.notFound(
                `Get Reader Error: No Reader found with id ${req.params.id}`,
                {
                  requestUrl: req.originalUrl
                }
              )
            )
          } else if (!checkReader(req, reader)) {
            return next(
              boom.forbidden(`Access to reader ${req.params.id} disallowed`, {
                requestUrl: req.originalUrl
              })
            )
          } else {
            if (req.query.storageData) {
              reader.storageData = await getStorageData(urlToId(reader.id))
            }

            res.setHeader('Content-Type', 'application/ld+json')
            res.end(JSON.stringify(reader.toJSON()))
          }
        })
        .catch(err => {
          next(err)
        })
    }
  )
}
