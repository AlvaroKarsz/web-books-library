const settings = require('../settings.js');
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const path = require('path');
const fs = require('fs');


/*
THIS MODULE USES DRIVE CLASS TO BACKUP LOCAL FILES TO GOOGLE DRIVE.
DRIVEBACKUP RECEIVES A WS POINTER, AND IT WILL SENT PROGRESS TO WS
*/

class DriveBackup {
  constructor() {
    this.DRIVE = require(settings.SOURCE_CODE_BACKEND_DRIVE_MODULE_FILE_PATH);
    this.ALL_FOLDERS = [
      settings.GENERAL_PICTURES_FOLDER_NAME,
      settings.BACKUPS_FOLDER_NAME,
      settings.BOOKS_FOLDER_NAME,
      settings.E_BOOKS_FOLDER_NAME,
      settings.ICONS_FOLDER_NAME,
      settings.SERIES_FOLDER_NAME,
      settings.STORIES_FOLDER_NAME,
      settings.WISH_LIST_FOLDER_NAME
    ];
    this.ROOT_PATH = settings.ROOT_PATH;
    this.IGNORE_FILE = '.gitignore';
    this.WS = null; /*websocket pointer*/
    this.FOLDERS_TO_BACKUP = null;
    this.DRIVE_FOLDERS = null;
    this.DRIVE_FILES = {};
    this.LOCAL_FILES = {};
    this.DB_DATA = {};
    this.IS_WORKING = false;
    this.TIME_OUT_EVENT = 'timeout';
    this.TIME_OUT_SECONDS = 320;
    this.STOP = false;/*use this variable to stop backup*/
    this.resolver = null; /*resolve function outside scope*/
    this.createClosePromise();
  }

  createClosePromise() {
    /*
    promise and promise holder
    this promise will resolve when websocket is closed, so getResponse function will not stuck program
    */
    this.closePromiseResolver = null;
    this.closePromise = new Promise((r) => {
      this.closePromiseResolver = r;
    });
  }

  /*function to stop backup*/
  stop() {
    this.IS_WORKING = false;/*release process*/
    this.STOP = true;
  }

  stopBackupParamsSet() {
    this.IS_WORKING = false;
    this.STOP = false;
  }

  timeOut(sec, val = null) {
    return new Promise((res) => {
      setTimeout(() => {
        res(val);
      }, sec * 1000);
    });
  }

  closeEvent() {/*resolves close promise*/
    /*resolve promise*/
    this.closePromiseResolver(null);
    /*create a new one*/
    this.createClosePromise();
  }
  /*
  main function to backup files to google drive
  option - pass parameter to indicate which folder to backup, default: all folders
  */
  async backup(ws, folder) {
    if(this.IS_WORKING) {/*busy*/
      return null;
    }

    this.IS_WORKING = true;/*lock process*/

    let startTime = +new Date();
    /*clear class parameters*/
    this.clearParams();

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*save websocket pointer*/
    this.WS = ws;

    /*save wabted backup folder*/
    if( ! this.saveFoldersToBackup(folder) ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*login to google drive*/
    while(true) {
      let loginStatus = this.loginGoogleDrive();

      /*error from login function*/
      if(loginStatus && typeof loginStatus === 'object' && loginStatus.error) {
        this.sendError(loginStatus.error);
        this.stopBackupParamsSet();
        return null;
      }

      if(loginStatus && typeof loginStatus === 'object' && loginStatus.type && loginStatus.type === 'auth') {/*app needs authorization - pass link to user and await his response*/
        this.sendPrompt(loginStatus.message);
        this.sendLink(loginStatus.link);

        let tokenRes = await this.DRIVE.promptResponse( /*wait for users response and send it to drive class*/
          await Promise.race(
            [
              this.getResponse(),
              this.closePromise,
              this.timeOut( this.TIME_OUT_SECONDS , this.TIME_OUT_EVENT ) /*set timeout to request*/

            ]
          )
        );

        /*error with new token*/
        if(!tokenRes) {
          this.sendError('Invalid Code, Could not create a new Token');
          this.stopBackupParamsSet();
          return null;
        }

        /*timeout - won't wait forevet for this token*/
        if(tokenRes === this.TIME_OUT_EVENT) {
          this.sendError(`Timeout, Max. time to enter token: ${this.TIME_OUT_SECONDS} seconds`);
          this.stopBackupParamsSet();
          return null;
        }

      } else {
        break;
      }
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*fetch folders from drive*/
    if( ! await this.fetchGoogleDriveFolders() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*crete google drive folders (if not exists)*/
    if( ! await this.createGoogleDriveFolders() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*fetch relevant files data from google drive*/
    if( ! await this.fetchGoogleDriveFiles() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*fetch all files from file system*/
    if( ! this.fetchLocalFiles() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*fetch md5hash from DB*/
    if( ! await this.fetchDBHashes() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*update hashes DB if needed*/
    if( ! await this.updateDBHashes() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*Check for files to upload to Drive*/
    if( ! await this.uploadFilesToDrive() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    /*Check for old files in Google Drive to delete*/
    if( ! await this.deleteFilesFromDrive() ) {
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.stopBackupParamsSet();
      return null;
    }

    this.sendMessage('Backup Done');
    let endTime = +new Date();
    this.sendMessage(`Backup Time: ${(endTime - startTime)/1000} sec`);
    this.IS_WORKING = false;/*release process*/

    return true;
  }

  clearParams() {
    this.WS = null;
    this.FOLDERS_TO_BACKUP = null;
    this.DRIVE_FOLDERS = null;
    this.DRIVE_FILES = {};
    this.LOCAL_FILES = {};
    this.DB_DATA = {};
  }

  /*function to send message through websocket*/
  sendMessage(m) {
    this.wsSend({message: m});
  }

  /*function to send error through websocket*/
  sendError(m) {
    this.wsSend({error: m});
  }

  /*function to send question to user*/
  sendPrompt(m) {
    this.wsSend({prompt: m});
  }

  /*function to send link to user*/
  sendLink(m) {
    this.wsSend({link: m});
  }


  /*wait for ws incomming message*/
  getResponse() {
    /*
    creates an external promise
    this promise will be resolved when "setResponse" function is callsed from outside class
    */

    this.responsePromise = new Promise((r) => {
      this.resolver = r;
    });

    return this.responsePromise;
  }

  /*
  function to call from outside class
  resolves promise
  */
  setResponse(msg) {
    this.resolver(msg);
  }

  wsSend(msg) {
    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }
    try {
      this.WS.send(JSON.stringify(msg));
    } catch(err) {
      /*ignore*/
    }
  }

  exit() {
    if(!this.STOP) {
      this.sendError("Exit Backup process");
    }
    this.clearParams();
    this.IS_WORKING = false;//release process
  }

  loginGoogleDrive() {
    this.sendMessage('Logging into Google Drive');
    let res = this.DRIVE.login();
    this.sendMessage('Login process Succeeded');
    return res;
  }

  saveFoldersToBackup(folders) {
    /*check folder, make sure it exist in ALL_FOLDERS*/
    if(folders !== 'all' && !this.ALL_FOLDERS.includes(folders)) {
      this.sendError("Invalid backup option: " + folders);
      this.exit();
      return null;
    }

    /*change folder format before backup*/
    if(folders === 'all') {
      folders = this.ALL_FOLDERS;
    } else {
      folders = [folders];
    }

    /*send message with wanted folders for backup*/
    this.sendMessage('Initializing Backup for: ' + folders.join(', '));
    /*save param in class*/
    this.FOLDERS_TO_BACKUP = folders;
    return true;
  }

  async fetchGoogleDriveFolders() {
    this.sendMessage('Fetching folder names from Google Drive');
    this.DRIVE_FOLDERS = await this.DRIVE.getFolders();

    /*error listing folders*/
    if(this.DRIVE_FOLDERS.error) {
      this.sendError("Could not fetch folder names, " + this.DRIVE_FOLDERS.error);
      this.exit();
      return null;
    }

    this.DRIVE_FOLDERS = this.DRIVE_FOLDERS.data;
    this.sendMessage(this.DRIVE_FOLDERS.length + ' folders found in Google Drive');

    this.DRIVE_FOLDERS.forEach((fldr) => {
      this.sendMessage('Folder Name: ' + fldr.name + ', Folder id: ' + fldr.id);
    });
    return true;
  }

  /*function makes sure that all folders received from user exist in google drive, and create the missing folders*/
  async createGoogleDriveFolders() {
    this.sendMessage('Making sure wanted folders exist in Google Drive');
    let foundFlag = false;
    let tmp;

    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }
    for(let i = 0 , l = this.FOLDERS_TO_BACKUP.length ; i <  l ; i ++ ) {
      foundFlag = false; //reset flag
      this.sendMessage('Folder: ' + this.FOLDERS_TO_BACKUP[i]);

      for(let j = 0 , s = this.DRIVE_FOLDERS.length ; j <  s ; j ++ ) {
        if(this.DRIVE_FOLDERS[j].name === this.FOLDERS_TO_BACKUP[i]) {
          this.sendMessage('Exist, ID: ' + this.DRIVE_FOLDERS[j].id);
          foundFlag = true;
          break;
        }
      }

      /*folder not exists in google drive*/
      if(!foundFlag) {
        this.sendMessage('NOT Exist');
        this.sendMessage('Creating folder ' + this.FOLDERS_TO_BACKUP[i]);
        tmp = await this.DRIVE.createFolder(this.FOLDERS_TO_BACKUP[i]);
        /*add empty folder to drive files*/
        this.DRIVE_FILES[this.FOLDERS_TO_BACKUP[i]] = [];

        if(this.STOP) {/*stop message received - stop backup*/
          this.IS_WORKING = false;
          return null;
        }

        /*error creating folder*/
        if(tmp.error) {
          this.sendError("Could not create folder, " + tmp.error);
          this.exit();
          return null;
        }

        /*created remote folder*/
        this.sendMessage('Folder ' + this.FOLDERS_TO_BACKUP[i] + ' created successfully, ID: ' + tmp.data);

        /*save folder details in DRIVE_FOLDERS*/
        this.DRIVE_FOLDERS.push({
          id: tmp.data,
          name: this.FOLDERS_TO_BACKUP[i]
        });
      }
    }
    this.sendMessage('All wanted folders exist in Google Drive');
    return true;
  }

  async fetchGoogleDriveFiles() {
    this.sendMessage('Fetching relevant files from Google Drive');

    /*get array of wanted folders (JUST IDs)*/
    let folderIds = this.getArrayOfWantedFolderIDs();

    /*fetch files from google drive*/
    let tmp = await this.DRIVE.getFiles(folderIds);

    /*check for errors*/
    if(tmp.error) {
      this.sendError("Could not fetch files from Google Drive, " + tmp.error);
      this.exit();
      return null;
    }

    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }

    tmp = tmp.data;

    /*echo  all files and save in json format*/
    let tmpFolderName;
    for(let i = 0 , l = tmp.length ; i < l ; i ++ ) {
      if(this.STOP) {/*stop message received - stop backup*/
        this.IS_WORKING = false;
        return null;
      }
      tmpFolderName = this.getFolderNameFromId( tmp[i].parents[0]);
      this.sendMessage("File Name: " + tmp[i].name + ', Folder: ' + tmpFolderName);

      /*if folder not exist yet in DRIVE_FILES, create it*/
      if(typeof this.DRIVE_FILES[ tmpFolderName ] === 'undefined') {
        this.DRIVE_FILES[ tmpFolderName ] = [];
      }

      /*push element to DRIVE_FILES*/
      this.DRIVE_FILES[ tmpFolderName ].push({
        hash: tmp[i].md5Checksum,
        id: tmp[i].id,
        name: tmp[i].name,
      });

    }

    /*make sure all wanted folder exists on this.DRIVE_FILES json, if not create empty arrays*/
    if(this.STOP || !this.FOLDERS_TO_BACKUP) {/*stop received*/
      return null;
    }
    for(let k = 0 , l = this.FOLDERS_TO_BACKUP.length ; k < l ; k ++ ) {
      if(typeof this.DRIVE_FILES[ this.FOLDERS_TO_BACKUP[k] ] === 'undefined') {
        this.DRIVE_FILES[ this.FOLDERS_TO_BACKUP[k] ] = [];
      }
    }

    this.sendMessage('All Google Drive files fetched successfully');
    this.sendMessage('Number of fetched files: ' + tmp.length);
    return true;
  }

  getArrayOfWantedFolderIDs() {
    if(this.STOP || !this.FOLDERS_TO_BACKUP) {/*stop received*/
      return null;
    }
    let ids = [];
    for(let i = 0 , l = this.FOLDERS_TO_BACKUP.length ; i <  l ; i ++ ) {
      for(let j = 0 , s = this.DRIVE_FOLDERS.length ; j <  s ; j ++ ) {
        if(this.DRIVE_FOLDERS[j].name === this.FOLDERS_TO_BACKUP[i]) {
          ids.push(this.DRIVE_FOLDERS[j].id);
          break;
        }
      }
    }
    return ids;
  }

  getFolderIdFromName(folderName) {
    if(this.STOP || !this.DRIVE_FOLDERS) {/*stop received*/
      return null;
    }
    for(let j = 0 , s = this.DRIVE_FOLDERS.length ; j <  s ; j ++ ) {
      if(this.DRIVE_FOLDERS[j].name === folderName) {
        return this.DRIVE_FOLDERS[j].id;
      }
    }
    return '';
  }

  getFolderNameFromId(folderId) {
    if(this.STOP || !this.DRIVE_FOLDERS) {/*stop received*/
      return null;
    }
    for(let j = 0 , s = this.DRIVE_FOLDERS.length ; j <  s ; j ++ ) {
      if(this.DRIVE_FOLDERS[j].id === folderId) {
        return this.DRIVE_FOLDERS[j].name;
      }
    }
    return '';
  }

  fetchLocalFiles() {
    this.sendMessage('Fetching relevant files from File System');

    let tmp;
    let counter = 0;

    if(this.STOP || !this.FOLDERS_TO_BACKUP) {/*stop received*/
      return null;
    }

    /*iterate through wanted folders and list names*/
    for(let i = 0 , l = this.FOLDERS_TO_BACKUP.length ; i <  l ; i ++ ) {

      this.sendMessage('Folder: ' + this.FOLDERS_TO_BACKUP[i]);

      /*list files*/
      tmp = fs.readdirSync( path.join( this.ROOT_PATH, this.FOLDERS_TO_BACKUP[i] ) );

      if(this.STOP) {/*stop message received - stop backup*/
        this.IS_WORKING = false;
        return null;
      }

      /*remove ignored files and echo files*/
      for(let o = 0 , h = tmp.length ; o < h ; o ++ ) {

        /*ignroe file*/
        if(tmp[o] === this.IGNORE_FILE) {
          tmp[o] = null;
        } else {
          this.sendMessage('File: ' + tmp[o]);
          /*convert to json*/
          tmp[o] = {
            name: tmp[o],
            id: this.getFileIdFromName(tmp[o])
          }
        }
      }

      /*remove nulls*/
      tmp = tmp.filter(a => a);
      counter += tmp.length;
      /*save files*/
      this.LOCAL_FILES[ this.FOLDERS_TO_BACKUP[i] ] = tmp;

    }

    this.sendMessage('All File System files fetched successfully');
    this.sendMessage('Number of fetched files: ' + counter);
    return true;
  }

  getFileIdFromName(name) {
    name = name.split('.')
    name.pop();
    name = name.join('.');
    return name;
  }

  async fetchDBHashes(silent = false) {

    if(!silent) {
      this.sendMessage('Fetching MD5 Hashes from DB');
    }
    /*fetch from DB all MD5 hashes*/
    let tmp = await db.getAllMD5Hashes(this.FOLDERS_TO_BACKUP);

    /*order files in json format && echo found data*/
    for(let o = 0 , h = tmp.length ; o < h ; o ++ ) {
      if(!silent) {
        this.sendMessage('File Name: ' + tmp[o].id + ', Folder: ' + tmp[o].folder + ', Hash: ' + tmp[o].md5);
      }
      /*if folder not exist yet in DB_DATA, create it*/
      if(typeof this.DB_DATA[ tmp[o].folder ] === 'undefined') {
        this.DB_DATA[ tmp[o].folder ] = [];
      }

      /*push element to DB_DATA*/
      this.DB_DATA[ tmp[o].folder ].push({
        hash: tmp[o].md5,
        id: tmp[o].id
      });

    }
    if(!silent) {
      this.sendMessage('Done fetching from DB');
      this.sendMessage('Number of fetched hashes: ' + tmp.length);
    }
    return true;
  }

  async updateDBHashes() {
    /*compare files between file system and DB and add new files/ remove irrelevant files*/
    this.sendMessage('Updating DB info');
    this.sendMessage('Comparing DB with File System Files');

    let arrHolder = [];

    /*check for files that doesn't exist in DB*/
    this.sendMessage('Checking for files that not exist in DB');

    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }

    /*iterate through LOCAL_FILES and make sure all exist in DB_DATA*/
    let foundFlag = false;
    for(let folderName in this.LOCAL_FILES) {
      for(let i = 0 , l = this.LOCAL_FILES[folderName].length ; i < l ; i ++ ) {

        foundFlag = false;//reset
        this.sendMessage('File System File: ' + this.LOCAL_FILES[folderName][i].name + ', Folder: ' + folderName);

        /*iterate in DB_DATA and make sure this one exists*/
        if(typeof  this.DB_DATA[folderName] !== 'undefined') {
          for(let j = 0 , s = this.DB_DATA[folderName].length ; j < s ; j ++ ) {
            /*does exists*/
            if(this.LOCAL_FILES[folderName][i].id === this.DB_DATA[folderName][j].id) {
              foundFlag = true;
              this.sendMessage('Exist in DB');
              break;
            }
          }
        }
        /*not found*/
        if(!foundFlag) {
          arrHolder.push({id: this.LOCAL_FILES[folderName][i].id,folder: folderName});
          this.sendMessage(`Does not Exist in DB`);
        }

      }
    }

    /*files to insert into DB*/
    if(arrHolder.length) {
      this.sendMessage(`${arrHolder.length} files to insert into DB`);
      /*get hashes & insert into DB*/

      await db.savePictureHashes(arrHolder.map((fl) => {
        fl.md5 = imagesHandler.calculateMD5(
          imagesHandler.getFullPath(fl.folder, fl.id)
        );
        return fl;
      }));

      this.sendMessage(`${arrHolder.length} files inserted into DB successfully`);

    } else {
      /*no files to insert into DB*/
      this.sendMessage(`All files exist in DB, nothing to insert`);
    }

    /*check for files that doesn't exist in File System*/
    this.sendMessage('Checking for files That exist in DB but not exist in File System');

    arrHolder.length = 0;//reset array

    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }

    /*iterate through DB_DATA and make sure all exist in LOCAL_FILES*/
    foundFlag = false;
    for(let folderName in this.DB_DATA) {
      for(let i = 0 , l = this.DB_DATA[folderName].length ; i < l ; i ++ ) {

        foundFlag = false;//reset
        this.sendMessage('DB File: ' + this.DB_DATA[folderName][i].id + ', Folder: ' + folderName);

        /*iterate in LOCAL_FILES and make sure this one exists*/
        for(let j = 0 , s = this.LOCAL_FILES[folderName].length ; j < s ; j ++ ) {
          /*does exists*/
          if(this.DB_DATA[folderName][i].id === this.LOCAL_FILES[folderName][j].id) {
            foundFlag = true;
            this.sendMessage('Exist in File System');
            break;
          }
        }

        /*not found*/
        if(!foundFlag) {
          arrHolder.push({id: this.DB_DATA[folderName][i].id,folder: folderName});
          this.sendMessage(`Does not Exist in File System`);
        }

      }
    }

    /*files to delete from DB*/
    if(arrHolder.length) {
      this.sendMessage(`${arrHolder.length} files to delete from DB`);
      /*get hashes & insert into DB*/

      await db.deletePictureHashes(arrHolder);

      this.sendMessage(`${arrHolder.length} files deleted from DB successfully`);

    } else {
      /*no files to insert into DB*/
      this.sendMessage(`All files exist in File System, nothing to Delete`);
    }

    /*fetch again from DB - now after all changes were made*/
    this.DB_DATA = {};//reset DB data
    await this.fetchDBHashes(true);


    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }


    /*add MD5 hashes to LOCAL_FILES*/

    for(let folderName in this.LOCAL_FILES) {
      for(let i = 0 , l = this.LOCAL_FILES[folderName].length ; i < l ; i ++ ) {
        for(let j = 0 , s = this.DB_DATA[folderName].length ; j < s ; j ++ ) {
          if(this.DB_DATA[folderName][j].id === this.LOCAL_FILES[folderName][i].id) {
            this.LOCAL_FILES[folderName][i].hash = this.DB_DATA[folderName][j].hash;
            break;
          }
        }
      }
    }

    /*clear DB data - no more use*/
    this.DB_DATA = {};

    return true;
  }

  async uploadFilesToDrive() {
    /*
    iterate through local files
    if file not exists in drive upload it
    if exists with different md5hash delete old one and upload new one
    */
    this.sendMessage(`Checking for files to upload to Google Drive`);

    if(this.STOP) {/*stop message received - stop backup*/
      this.IS_WORKING = false;
      return null;
    }


    let foundFlag = false;
    let tmp;
    for(let folderName in this.LOCAL_FILES) {
      this.sendMessage(`Folder ${folderName}`);
      for(let i = 0 , l = this.LOCAL_FILES[folderName].length ; i < l ; i ++ ) {
        if(this.STOP) {/*stop message received - stop backup*/
          this.IS_WORKING = false;
          return null;
        }
        foundFlag = false;//reset
        this.sendMessage(`File ${this.LOCAL_FILES[folderName][i].name}`);
        /*iterate through drive files and look for match*/
        for(let j = 0 , s = this.DRIVE_FILES[folderName].length ; j < s ; j ++ ) {

          /*match*/
          if(this.LOCAL_FILES[folderName][i].name === this.DRIVE_FILES[folderName][j].name) {
            this.sendMessage(`File found in Google Drive`);
            this.sendMessage(`Comparing MD5SUM Hashes`);
            /*compare hashes*/

            if(this.LOCAL_FILES[folderName][i].hash === this.DRIVE_FILES[folderName][j].hash) { /*match*/
              this.sendMessage(`Match! Moving to next file`);

            } else {/*no match*/
              this.sendMessage(`NO MATCH!`);
              this.sendMessage(`Local Hash: ${this.LOCAL_FILES[folderName][i].hash}, Drive Hash: ${this.DRIVE_FILES[folderName][j].hash}`);

              /*delete remote file (old one)*/
              this.sendMessage(`Deleting file from Google Drive`);
              tmp = await this.DRIVE.deleteFile(this.DRIVE_FILES[folderName][j].id);

              if(this.STOP) {/*stop message received - stop backup*/
                this.IS_WORKING = false;
                return null;
              }

              /*API error*/
              if(tmp.error) {
                this.sendError("Could not delete file from Google Drive, " + tmp.error);
                this.exit();
                return null;
              }

              this.sendMessage(`File deleted from Google Drive`);

              /*upload new file version*/
              this.sendMessage(`Uploading new file to Google Drive`);

              tmp = await this.DRIVE.uploadFile(this.DRIVE_FILES[folderName][j].name, path.join(this.ROOT_PATH, folderName) , this.getFolderIdFromName(folderName));

              if(this.STOP) {/*stop message received - stop backup*/
                this.IS_WORKING = false;
                return null;
              }

              /*API error*/
              if(tmp.error) {
                this.sendError("Could not Upload file to Google Drive, " + tmp.error);
                this.exit();
                return null;
              }
              this.sendMessage(`File uploaded to Google Drive`);


            }
            foundFlag = true;
            break;/*id match - break loop*/
          }


        }
        /*not found - upload file*/
        if(!foundFlag) {
          this.sendMessage(`File not found in Google Drive`);
          this.sendMessage(`Uploading new file to Google Drive`);
          tmp = await this.DRIVE.uploadFile(this.LOCAL_FILES[folderName][i].name, path.join(this.ROOT_PATH, folderName) , this.getFolderIdFromName(folderName));

          if(this.STOP) {/*stop message received - stop backup*/
            this.IS_WORKING = false;
            return null;
          }

          /*API error*/
          if(tmp.error) {
            this.sendError("Could not Upload file to Google Drive, " + tmp.error);
            this.exit();
            return null;
          }

          this.sendMessage(`File uploaded to Google Drive`);

        }


      }
    }

    this.sendMessage(`Done Uploading files to Google Drive`);
    return true;
  }

  async deleteFilesFromDrive() {
    /*
    iterate through drive files
    if file not exists in local system, delete from drive
    */

    this.sendMessage(`Checking for files in Google Drive that not exists in File System`);
    let foundFlag = false;
    let tmp;

    for(let folderName in this.DRIVE_FILES) {
      this.sendMessage(`Folder ${folderName}`);
      for(let i = 0 , l = this.DRIVE_FILES[folderName].length ; i < l ; i ++ ) {
        foundFlag = false;//reset
        this.sendMessage(`File ${this.DRIVE_FILES[folderName][i].name}`);
        /*iterate through file system files and look for match*/
        for(let j = 0 , s = this.LOCAL_FILES[folderName].length ; j < s ; j ++ ) {

          /*match*/
          if(this.DRIVE_FILES[folderName][i].name === this.LOCAL_FILES[folderName][j].name) {
            this.sendMessage(`File found in File System`);
            foundFlag = true;
            break;
          }
        }

        if(!foundFlag) {  /*file not exists - delete from Google Drive*/
          this.sendMessage(`File not found in File System`);
          this.sendMessage(`Deleting file from Google Drive`);
          tmp = await this.DRIVE.deleteFile(this.DRIVE_FILES[folderName][i].id);

          if(this.STOP) {/*stop message received - stop backup*/
            this.IS_WORKING = false;
            return null;
          }

          /*API error*/
          if(tmp.error) {
            this.sendError("Could not delete file from Google Drive, " + tmp.error);
            this.exit();
            return null;
          }
          this.sendMessage(`File deleted from Google Drive`);
        }
      }
    }

    this.sendMessage(`Done Deleting old files from Google Drive`);
    return true;
  }

}

module.exports = new DriveBackup();
