const settings = require('../settings.js');
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
const fs = require('fs');
const path = require('path');
const {google} = require('googleapis');


class Drive {
  constructor() {
    this.SCOPES = ['https://www.googleapis.com/auth/drive'];
    this.ACCESS_TYPE = 'offline';
    this.CREDENTIALS_PATH = settings.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_CREDENTIALS_FILE_PATH;
    this.TOKEN_PATH = settings.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_TOKEN_FILE_PATH;
    this.MAIN_FOLDER_ID = config.DRIVE_MAIN_FOLDER_ID;
    this.TIME_OUT_EVENT = 'timeout';
    this.oAuth2Client = null;
    this.drive = null;
    this.token = null;
    this.credentials = null;
  }

  /*function to get credentials info*/
  getCredentials() {
    this.credentials = this.readFile(this.CREDENTIALS_PATH);
  }

  /*function to get token info*/
  getToken() {
    this.token = this.readFile(this.TOKEN_PATH);
  }

  /*function to read file from filesystem*/
  readFile(path) {
    try {
      return JSON.parse(
        fs.readFileSync(path)
      );
    } catch(e) {
      return null;
    }
  }

  /*function to write token into file*/
  saveToken(token) {
    try{
      fs.writeFileSync(this.TOKEN_PATH, JSON.stringify(token));
    } catch(e) {
      //ignore
    }
  }

  /*generates URL to authorize app*/
  generateAuthUrl() {
    return  this.oAuth2Client.generateAuthUrl({
      access_type: this.ACCESS_TYPE,
      scope: this.SCOPES
    });
  }

  /*
  get called from outside of this class
  used to get from user the code after he visited the URL generated to authorize this app
  */
  async promptResponse(res) {
    if(!res) { /*no token*/
      return false;
    }

    if(res === this.TIME_OUT_EVENT ) { /*timeout event*/
      return res; /*return the timeout event*/
    }

    try{
      let token = await this.oAuth2Client.getToken(res);
      token = token.tokens;
      this.saveToken(token);
      return true;
    } catch(err) {
      return false;
    }
  }

  setToken() {
    this.oAuth2Client.setCredentials(this.token);
  }

  /*function to login to drive*/
  login() {
    /*get credentials*/
    this.getCredentials();

    /*credentials file not found or invalid json*/
    if(!this.credentials) {
      return {
        error: "Credentials file not found (or invalid json file)"
      };
    }

    /*connect to app*/
    this.oAuth2Client = new google.auth.OAuth2(
      this.credentials.installed.client_id, this.credentials.installed.client_secret, this.credentials.installed.redirect_uris[0]
    );

    /*get token if token exists*/
    this.getToken();

    /*no token found in file system - get a new one*/
    if(!this.token) {

      /*return response that indicates that a code from user is needed*/
      /*exit backup function - login should be called again*/
      return {
        type: 'auth',
        message: "Please visit the following URL and authorize this app: ",
        link: this.generateAuthUrl()
      };
    }

    this.setToken();

    this.openDrive();
  }

  /*function to open google drive connection using auth2client*/
  openDrive() {
    let auth = this.oAuth2Client;
    this.drive = google.drive({version: 'v3', auth});
  }

  /*function to get list of folders in main folder*/
  getFolders() {
    return new Promise((resolve) => {
      this.drive.files.list({
        pageSize:1000,
        fields:"nextPageToken, files(id, name)",
        q : `mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${this.MAIN_FOLDER_ID}' in parents`
      }).then((response) => {
        /*sucess*/
        /*resolve with data*/
        resolve({
          data: response.data.files
        });
        return;
      }).catch((error) => {
        /*resolve with error*/
        resolve({
          error: error.errors && error.errors[0] ? error.errors[0].message : 'Timeout'
        });
        return;
      });
    });
  }

  /*
  function to use from "getFiles"
  it will fetch files once and return files and nextPageToken
  */
  getFilesSingle(qString, nextPageToken = '') {
    return new Promise((resolve) => {
      this.drive.files.list({
        pageSize:1000,
        fields:"nextPageToken, files(id, name,parents,md5Checksum)",
        pageToken: nextPageToken,
        q : qString
      }).then((response) => {
        /*sucess - return files*/
        resolve({
          data: {
            nextPageToken: response.data.nextPageToken ? response.data.nextPageToken : null,
            files: response.data.files
          }
        });

        return;

      }).catch((error) => {
        /*API error - resolve with error*/
        resolve({
          error: error.errors[0].message
        });
        return;
      });
    });
  }

  /*
  function to get files from list of folders
  folder array should be an array of IDs
  */
  getFiles(folders) {
    return new Promise(async (resolve) => {
      /*no folders received - return empty arr*/
      if(!folders) {
        resolve([]);
        return;
      }
      /*covnert to array if received argument isn't array*/
      if(!Array.isArray(folders)) {
        folders = [folders];
      }

      /*build query string*/
      let qString = `trashed = false and (${
        folders
        /*map all folder it to appear as query*/
        .map((folder) => {
          return " '" + folder + "' in parents or";
        })
        /*join to one single string*/
        .join('')
        /*remove last "or"*/
        .slice(0, -2)
      })`;

      /*
      google API has a limit, so "pageToken" will indicate that there is more data to fetch
      */
      let pageToken = ''; /*store here "nextPageToken" from prev. request if any*/
      let files = []; /*store here list of files*/
      let tmp;

      /*call getFilesSingle function to make a fetch request until nextPageToken is empty*/
      while(true) {
        tmp = await this.getFilesSingle(qString, pageToken);
        /*in case of API error stop and return the error*/
        if(tmp.error) {
          resolve({
            error: tmp.error
          });
          return;
        }

        /*save files*/
        files.push(...tmp.data.files);
        /*check nextPageToken - if empty exit loop*/
        if(!tmp.data.nextPageToken) {
          break;
        } else {
          pageToken = tmp.data.nextPageToken; /*save for next usage*/
        }
      }

      /*resolve with files*/
      resolve({
        data: files
      });
      return;
    });
  }

  /*function to create a folder in drive*/
  createFolder(name) {

    return new Promise((resolve) => {
      this.drive.files.create({
        resource: {
          'name' : name,
          'parents' : [this.MAIN_FOLDER_ID],
          'mimeType' : 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      }).then((response) => {
        /*sucess - resolve with folder id*/
        resolve({
          data: response.data.id
        });

        return;

      }).catch((error) => {
        /*API error - resolve with error*/

        resolve({
          error: error.errors[0].message
        });
        return;
      });
    });
  }

  /*function to convert local file extension to mime*/
  convertFileExtensionToMime(extension) {
    return {
      'png': 'image/png',
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'txt':'text/plain',
      'ico': 'image/vnd.microsoft.icon',
      'sql': 'application/sql',
      'pdf': 'application/pdf'
    }[extension.toLowerCase()];
  }

  /*function to upload file to google drive*/
  uploadFile(fileName, filePath, folderId) {

    return new Promise((resolve) => {
      /*get mime type from file name*/
      let mimeType = fileName.split('.');
      mimeType = mimeType[mimeType.length - 1];
      mimeType = this.convertFileExtensionToMime(mimeType);

      /*no mime - resolve with error*/
      if(!mimeType) {
        resolve({
          error: 'Invalid File extension - no Mime Type found'
        });
        return;
      }
      /*upload file*/
      this.drive.files.create({
        resource: {
          name: fileName,
          parents: [folderId]
        },
        media: {
          mimeType: mimeType,
          body: fs.createReadStream( path.join(filePath, fileName) )
        },
        fields: 'id'
      }).then((response) => {
        /*sucess - resolve with file ID*/
        resolve({
          data: response.data.id
        });
        return;

      }).catch((error) => {
        /*API error - resolve with error*/
        resolve({
          error: error.errors[0].message
        });
        return;
      });
    });
  }

  /*function to delete file from drive*/
  deleteFile(fileId) {
    return new Promise((resolve) => {

      this.drive.files.delete({
        fileId: fileId
      }).then((response) => {
        /*sucess - resolve with true*/
        resolve({
          data: true
        });
        return;

      }).catch((error) => {
        /*API error - resolve with error*/
        resolve({
          error: error.errors[0].message
        });
        return;
      });
    });
  }

}

module.exports = new Drive();
