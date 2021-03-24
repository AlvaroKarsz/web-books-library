const path = require('path');

let settings = {};
settings.APP_PATH = path.join(__dirname, '..', '..');
settings.TMP_FOLDER_NAME = 'tmp';
settings.PUBLIC_FOLDER_NAME = 'public';
settings.TMP_FOLDER_PATH = path.join(settings.APP_PATH, settings.PUBLIC_FOLDER_NAME, settings.TMP_FOLDER_NAME);

module.exports = settings;
