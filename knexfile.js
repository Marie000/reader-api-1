// Update with your config settings.

const path = require('path')
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.SQLITE_DB || './dev.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations')
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: './test.sqlite3'
    },
    useNullAsDefault: true
  },
  postgresql: {
    client: 'postgresql',
    connection: {
      host: process.env.POSTGRE_INSTANCE,
      database: process.env.POSTGRE_DB,
      user: process.env.POSTGRE_USER,
      password: process.env.POSTGRE_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'migrations')
    }
  }
}
