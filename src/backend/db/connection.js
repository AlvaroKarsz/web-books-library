let pg = require('pg');
let config = require('../config.js');
let conString = `postgres://${config.DB_USER}:${config.DB_PASS}@${config.DB_ADDRESS}:${config.DB_PORT}/${config.DB_NAME}`;
let client = new pg.Client(conString);
client.connect();
module.exports = { pgClient:client };
