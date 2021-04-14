const basicFunctions = require('./basic');
const fs = require('fs');
const path = require('path');

class Images {
  constructor() {
    this.BASE = 'base64';
  }

  isUrl(data) {
    return /^www/.test(data) || /^http/.test(data);
  }

  async saveImage(raw,filePath,fileTitle) {
    /*if url was received, download file from url*/
    let format;
    if(this.isUrl(raw)) {
      format = this.getTypeFromUrl(raw);
      raw = await this.downloadPicture(raw, format);
      if(!raw) {/*error downloading pic*/
        return null;
      }
      /*downloaded as buffer - convert to base64*/
      raw = this.bufferToBase64(raw);
    } else {
      /*raw data was received, get format from raw*/
      format = this.getTypeFromRaw(raw);
    }
    /*save the pic*/
    this.imageFromRaw(raw,filePath,fileTitle, format);
    /*return full path*/
    return path.join(filePath, fileTitle + '.' + format);
  }

  makeHttpRequestSettings(url ,format) {
    return {
      method:'GET',
      headers: {
        'Content-Type': `image/${format}`
      }
    };
  }

  imageFromRaw(raw,filePath,fileTitle, format) {
    /*make full path from file path and file name*/
    const fullPath = path.join(filePath, fileTitle + '.' + format);
    /*remove headers data from raw*/
    raw = raw.replace(/^data:image\/\w+;base64,/, "");
    /*write raw data*/
    fs.writeFileSync(fullPath, Buffer.from(raw, this.BASE));
  }

  getTypeFromUrl(url) {
    if(/png$/.test(url)) {
      return 'png';
    }
    //default value
    return 'jpg';
  }

  getTypeFromRaw(raw) {
    if(/^data\:image\/png/.test(raw)) {
      return 'png';
    }
    //default value
    return 'jpeg';
  }

  async downloadPicture(url, format) {
    /*make http request*/
    let pic = await basicFunctions.doFetch(url, this.makeHttpRequestSettings(url, format), {
      buffer:true,
      timeout:4000
    });
    return pic;
  }

  bufferToBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
  }

  calculateMD5(filePath) {
    const md5 = require("md5-file");
    return md5.sync(filePath);
  }

}

module.exports = new Images();
