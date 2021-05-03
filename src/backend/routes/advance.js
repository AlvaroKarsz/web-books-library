const settings = require('../settings.js');
const config = require('../config.js');
const path = require('path');
const exec = require("child_process").execSync;
const basic = require('../modules/basic.js');

module.exports = (app) => {

  /*backup DB content (structure + data)*/
  app.get('/advance/db/backup', (req, res) =>  {
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

      /*change directory to saved one*/
      process.chdir(initDirectory);

      /*send error message to frontend*/
      res.redirect(
        basic.buildRefererUrl(req.headers.referer, 'Could not Backup DB')
      );
      return;

    }
    /*change directory to saved one*/
    process.chdir(initDirectory);
    /*send success message*/
    res.redirect(
      basic.buildRefererUrl(req.headers.referer, 'DB Backup Succeeded', false)
    );
    return;

  });

}
