const tesseract = require('tesseract.js');
const glob = require("glob");
const fs = require('fs');
const path = require('path');

class PictureDecoder {
  constructor() {}

  decode(pic, lang = 'eng') {
    //decode picture and return promise
    return new Promise((resolve, reject) => {
      tesseract.recognize(
        pic,
        lang
      ).then((res) => {
        resolve(res.data.text);
      }).catch((err) => {
        reject();
      });
    });
  }

  clear() {
    //clear file made during pic recognizion
    //traineddata file extension
    const currentDir = process.cwd();
    glob("*.traineddata", false ,(er, files) => {
      if(!er && files) {
        files.forEach((file) => {
          fs.unlinkSync(path.join(currentDir, file));
        });
      }
    });
  }

}
module.exports = new PictureDecoder();
