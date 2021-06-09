const settings = require('../settings.js');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.FOLDER_PATH = settings.LOGS_PATH; /*logs main path*/
    this.CONTENT_SEPARATOR = "-";
    this.NUMBER_OF_DASHED_LINES = 80;
  }

  /*get date for relevant timezone*/
  getTimeZonedDate() {
    let date = new Date(),
    tzOffset = date.getTimezoneOffset(), /*get timezone offset in minutes*/
    epoch = +date, /*timestamp*/
    timeZoneDate = new Date(epoch - tzOffset * 60000);  /*calculate timezoned date*/

    return timeZoneDate;
  }

  getReadableDate() {
    return new Date().toTimeString().split(' ')[0];
  }

  getTodayLogPath() {
    /*generates today's log path based on today's date*/
    const today = this.getTimeZonedDate(),

    year = today.getFullYear().toString(), /*taday's year*/

    month = (today.getMonth() + 1).toString(),/*taday's month - pluys 1 because the output of getMonth is index, not month number*/

    day = today.getDate().toString(); /*today's day of month*/

    /*
    log hierarchy example:
    logs
    - 2020                (folder for 2020 logs)
    ------ 10             (folder for 10/2020 logs)
    -------------20       (log fog for 20/10/2020)
    -------------24       (log fog for 24/10/2020)
    ------ 11             (folder for 11/2020 logs)
    -------------5        (log fog for 5/11/2020)
    - 2021
    ------ 1
    -------------20
    -------------24
    */


    /*if today's log not exists, create it*/

    let outputPath = this.FOLDER_PATH;

    /*check if year's folder exists, if not - create it*/
    outputPath = path.join(outputPath, year);

    if( ! fs.existsSync(outputPath) ) {
      fs.mkdirSync(outputPath);
    }

    /*check if months's folder exists, if not - create it*/
    outputPath = path.join(outputPath, month);

    if( ! fs.existsSync(outputPath) ) {
      fs.mkdirSync(outputPath);
    }

    return path.join(this.FOLDER_PATH, year, month, day + '.log');
  }


  log( vars = {}) {
    /*
    vars options:
    text - log contents - required
    type - message type - optional, optiona (error/message), default value: error
    */

    if(!vars.text) { /*required*/
      return null;
    }

    let text = vars.text || null,
    type = null;

    switch(vars.type) {
      case 'message':
      type = "message";
      break;

      case "error":
      type = "error";
      break;

      default:
      type = "message";
    }

    /*
    log data format:

    ----------------------------------------------------------------------------------------------------
    {type}
    {date}
    {contents}
    ----------------------------------------------------------------------------------------------------


    */
    text = this.CONTENT_SEPARATOR.repeat(this.NUMBER_OF_DASHED_LINES) + /*top separator*/
    "\n" +
    type.toUpperCase() + /*type*/
    "\n" +
    this.getReadableDate() + /*date*/
    "\n" +
    text + /*contents*/
    "\n" +
    this.CONTENT_SEPARATOR.repeat(this.NUMBER_OF_DASHED_LINES) + /*bottom separator*/
    "\n";

    const logPath = this.getTodayLogPath();

    /*write contents*/
    fs.appendFileSync(logPath, text);
    return true;
  }


}

module.exports = new Logger();
