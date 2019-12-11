const express = require('express')
const router = express.Router()
const passport = require('passport')
const { Reader } = require('../models/Reader')
const jwtAuth = passport.authenticate('jwt', { session: false })
const boom = require('@hapi/boom')
const { libraryCacheUpdate } = require('../utils/cache')
const { Publication_Tag } = require('../models/Publications_Tags')

const utils = require('../utils/utils')

module.exports = function (app) {
  /**
   * @swagger
   * /publications/{pubId}/tags/{tagId}:
   *   delete:
   *     tags:
   *       - tags
   *       - publications
   *     description: DELETE /publications/:pubId/tags/:tagId
   *     parameters:
   *       - in: path
   *         name: pubId
   *         schema:
   *           type: string
   *         required: true
   *       - in: path
   *         name: tagId
   *         schema:
   *           type: string
   *         required: true
   *     security:
   *       - Bearer: []
   *     responses:
   *       204:
   *         description: Successfully removed Tag from Publication
   *       404:
   *         description: publication, tag or pub-tag relation not found
   *       403:
   *         description: 'Access to tag or publication disallowed'
   */
  app.use('/', router)
  router
    .route('/publications/:pubId/tags/:tagId')
    .delete(jwtAuth, function (req, res, next) {
      const pubId = req.params.pubId
      const tagId = req.params.tagId
      Reader.byAuthId(req.user)
        .then(reader => {
          if (!reader) {
            return next(
              boom.notFound(`No reader with this token`, {
                type: 'Reader',
                activity: 'Remove Tag from Publication'
              })
            )
          } else {
            Publication_Tag.removeTagFromPub(pubId, tagId).then(
              async result => {
                if (result instanceof Error) {
                  switch (result.message) {
                    case 'no publication':
                      return next(
                        boom.notFound(`no publication found with id ${pubId}`, {
                          type: 'Publication',
                          id: pubId,
                          activity: 'Remove Tag from Publication'
                        })
                      )

                    case 'no tag':
                      return next(
                        boom.notFound(`no tag found with id ${tagId}`, {
                          type: 'reader:Tag',
                          id: tagId,
                          activity: 'Remove Tag from Publication'
                        })
                      )

                    case 'not found':
                      return next(
                        boom.notFound(
                          `no relationship found between Tag ${tagId} and Publication ${pubId}`,
                          {
                            type: 'Publication_Tag',
                            activity: 'Remove Tag from Publication'
                          }
                        )
                      )

                    default:
                      return next(err)
                  }
                } else {
                  await libraryCacheUpdate(reader.id)
                  res.status(204).end()
                }
              }
            )
          }
        })
        .catch(err => {
          next(err)
        })
    })
}
