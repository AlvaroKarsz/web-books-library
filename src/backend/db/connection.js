const settings = require('../settings.js');
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
const pg = require('pg');

const client = new pg.Client(`postgres://${config.DB_USER}:${config.DB_PASS}@${config.DB_ADDRESS}:${config.DB_PORT}/${config.DB_NAME}`);
client.connect();

module.exports = client;
