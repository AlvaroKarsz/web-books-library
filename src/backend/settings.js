const path = require("path");

const APP_PATH = path.join(__dirname, '..', '..');

module.exports = {
  BLANK_PIC_PATH: path.join(APP_PATH , 'generalPics', 'blank.jpg'),
  BACKUP_DB_FILE_PATH: path.join(APP_PATH , 'backups', 'db_bkp.sql'),
  APP_PORT: 80,
  WS_PORT: 8080,
  IMAGES_NUM_PER_PAGE: 25,
  BOOKS_PER_ROW: 5
};
