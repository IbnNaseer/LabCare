const env = require('./env');

module.exports = {
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.env === 'development' ? console.log : false,
  define: {
    engine: 'InnoDB',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};
