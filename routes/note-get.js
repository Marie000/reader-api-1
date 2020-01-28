const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Note } = require('../models/Note')
const debug = require('debug')('hobb:routes:document')
const utils = require('../utils/utils')
const boom = require('@hapi/boom')

module.exports = app => {
  app.use('/', router)

  /**
   * @swagger
   * /notes/{id}:
   *   get:
   *     tags:
   *       - notes
   *     description: GET /notes/:id
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: the short id of the note
   *     security:
   *       - Bearer: []
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: A Note Object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/definitions/note'
   *       404:
   *         description: 'No Note with ID {id}'
   *       403:
   *         description: 'Access to note {id} disallowed'
   */

  router.get(
    '/notes/:id',
    passport.authenticate('jwt', { session: false }),
    function (req, res, next) {
      const id = req.params.id
      Note.byId(id)
        .then(note => {
          if (!note || note.deleted) {
            return next(
              boom.notFound(`No note with ID ${id}`, {
                type: 'Note',
                id,
                activity: 'Get Note'
              })
            )
          } else if (!utils.checkReader(req, note.reader)) {
            return next(
              boom.forbidden(`Access to note ${id} disallowed`, {
                type: 'Note',
                id,
                activity: 'Get Note'
              })
            )
          } else {
            debug(note)
            res.setHeader('Content-Type', 'application/ld+json')
            res.end(
              JSON.stringify(
                Object.assign(note.toJSON(), {
                  '@context': [{ reader: 'https://rebus.foundation/ns/reader' }]
                })
              )
            )
          }
        })
        .catch(next)
    }
  )
}
