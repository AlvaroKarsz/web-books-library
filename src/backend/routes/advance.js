const settings = require('../settings.js');
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const exec = require("child_process").execSync;

module.exports = (app) => {

  /*backup DB content (structure + data)*/
  app.get('/advance/db/backup', async (req, res) =>  {
    /*backup command*/
    const command = `pg_dump --dbname=postgresql://${config.DB_USER}:${config.DB_PASS}@${config.DB_ADDRESS}:${config.DB_PORT}/${config.DB_NAME} -f ${settings.BACKUP_DB_FILE_PATH}`;

    /*
    SAVE CURRENT WORKING DIRECTORY
    CHANGE DIRECTORY TO POSTGRES BIN FOLDER
    BACKUP
    CHANGE DIRECTORY AGAIN TO SAVED WORKING DIRECTORY
    */

    /*save directory*/
    const initDirectory = process.cwd();

    /*change directory to postgres bin*/
    process.chdir(`${config.DB_FOLDER_PATH}`);

    /*backup DB*/

    try {

      exec(command);

    } catch(err) {

      /*shell command error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error while backing up PostgreSQL DB - " + err
      });
      /*change directory to saved one*/
      process.chdir(initDirectory);

      /*send error message to frontend*/
      res.redirect(
        basic.buildRefererUrl(req.headers.referer, 'Could not Backup DB')
      );
      return;

    }

    /*log action*/
    logger.log({
      text: "PostgreSQL DB backup succeeded.\nBackup file: " + settings.BACKUP_DB_FILE_PATH
    });
    /*change directory to saved one*/
    process.chdir(initDirectory);

    /*save new md5sum hash in DB*/
    /*save md5hash*/
    await db.savePictureHashes({
      id: settings.BACKUP_DB_FILE_NAME.split('.').slice(0,-1).join('.'), /*get file name without extension*/
      folder: settings.BACKUPS_FOLDER_NAME,
      md5: imagesHandler.calculateMD5(
        imagesHandler.getFullPath(settings.BACKUPS_FOLDER_NAME, settings.BACKUP_DB_FILE_NAME.split('.').slice(0,-1).join('.')) /*get file name without extension*/
      )
    });

    /*send success message*/
    res.redirect(
      basic.buildRefererUrl(req.headers.referer, 'DB Backup Succeeded', false)
    );
    return;

  });

}
