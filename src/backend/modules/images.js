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

  async saveImage(raw,filePath,fileTitle, ops = {}) {
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

      if(ops.mime) {
        /*received from user*/
        format = ops.mime;
      } else {
        /*raw data was received, get format from raw*/
        format = this.getTypeFromRaw(raw);

      }
    }
    /*save the pic*/
    this.imageFromRaw(raw,filePath,fileTitle, format, ops);
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

  moveImage(from, to) {
    /*
    both from and to shoud be a json with folder and id values
    */

    /*get full picture name (including extension)*/
    let picFullName = basicFunctions.getPictureMime(from.folder, from.id);
    /*if file not exists - exit function*/
    if(!picFullName) {
      return;
    }
    /*get file extension from full name*/
    let fileExtension = picFullName.split('.').pop();

    /*move the file*/
    fs.renameSync( path.join(__dirname, '..', '..','..', from.folder, picFullName)  , path.join(__dirname, '..', '..','..', to.folder, to.id + '.' + fileExtension ) );
  }

  getFullPath(folder, fileName) {
    /*find full path of file based on folder name and file name without extension*/

    /*get full picture name (including extension)*/
    const picFullName = basicFunctions.getPictureMime(folder, fileName);

    /*file not exists*/
    if(!picFullName) {
      return;
    }

    return path.join(__dirname, '..', '..','..', folder, picFullName);
  }

  deleteImage(folderName,fileTitle) {
    /*function to delete picture from file system (if picture exists)*/
    /*get picture full name (including extension type)*/
    const picFullName = basicFunctions.getPictureMime(folderName, fileTitle);
    if(!picFullName) {
      /*file not found - no need to delete - exit function*/
      return;
    }
    /*delete the picture*/
    fs.unlinkSync(path.join(__dirname, '..', '..','..', folderName, picFullName));
  }

  imageFromRaw(raw,filePath,fileTitle, format, ops) {
    /*make full path from file path and file name*/
    const fullPath = path.join(filePath, fileTitle + '.' + format);
    /*remove headers data from raw*/

    if(!ops.noModification) {//only if noModification flag is not present
      raw = raw.replace(/^data:(image|application)\/\w+;base64,/, "");
    }

    /*write raw data*/
    if(!ops.noModification) {
      fs.writeFileSync(fullPath, Buffer.from(raw, this.BASE));
    } else {/*write without buffers or encodings*/
      fs.writeFileSync(fullPath, raw);
    }

  }

  getTypeFromUrl(url) {
    if(/png$/.test(url)) {
      return 'png';
    } else if (/pdf$/.test(raw)) {
      return 'pdf';
    }
    //default value
    return 'jpg';
  }

  getTypeFromRaw(raw) {
    if(/^data\:image\/png/.test(raw)) {
      return 'png';
    } else if (/^data\:application\/pdf/.test(raw)) {
      return 'pdf';
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
