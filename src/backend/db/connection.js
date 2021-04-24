const pg = require('pg');
const config = require('../config.js');
const client = new pg.Client(`postgres://${config.DB_USER}:${config.DB_PASS}@${config.DB_ADDRESS}:${config.DB_PORT}/${config.DB_NAME}`);
client.connect();
module.exports = { pgClient:client };
