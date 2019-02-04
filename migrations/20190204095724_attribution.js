exports.up = function (knex, Promise) {
  return knex.schema.createTable('Attribution', function (table) {
    table.uuid('id').primary()
    table.string('canonicalId').index()
    table.string('role').index()
    table
      .boolean('isContributor')
      .defaultTo(false)
      .index()
    table.jsonb('json')
    table
      .uuid('readerId')
      .references('id')
      .inTable('Reader')
      .notNullable()
      .onDelete('CASCADE')
      .index()
    table
      .uuid('documentId')
      .references('id')
      .inTable('Document')
      .nullable()
      .index()
    table
      .uuid('publicationId')
      .references('id')
      .inTable('Publication')
      .nullable()
      .onDelete('CASCADE')
      .index()
    table
      .timestamp('published')
      .defaultTo(knex.fn.now())
      .notNullable()
    table
      .timestamp('updated')
      .defaultTo(knex.fn.now())
      .notNullable()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTable('Attribution')
}
