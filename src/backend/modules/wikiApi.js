const basicFunctions = require('./basic');
const settings = require('../settings');
const fs = require('fs');


class WikiClass {
  constructor() {
    this.URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
  }

  orderTitle(title) {
    /*
    wiki api needs book name capitalize with _ insead white spaces
    */
    title = title.split(' ');
    title = title.map(a => a.charAt(0).toUpperCase() + a.slice(1).toLowerCase());
    title = title.join('_');
    return title;
  }

  async getCoverByTitle(title, returnLinks = true) {
    /*
    if returnLinks is true, this function will return just remote links to pictures
    if false, this will download the picture, save locally and return the local path
    */
    /*settings in order to fetch API for json*/
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };


    /*settings in order to fetch images*/
    const imageRequestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'image/jpg'
      }
    };

    /*make the http request*/
    let response = await basicFunctions.doFetch(this.URL + this.orderTitle(title), requestSettings, {timeout:3000});
    if(!response) {
      /*error from http request*/
      return null;
    }

    let imagesArr = [];

    //check if originalimage exists ion response
    if ( basicFunctions.exists(response['originalimage'])  &&  basicFunctions.exists(response['originalimage']['source']) ) {
      /*source pic exists*/
      imagesArr.push(
        (
          returnLinks ? response['originalimage']['source'] :
          new Promise((resolve,reject) => {

            basicFunctions.doFetch(response['originalimage']['source'], imageRequestSettings, {buffer:true, timeout:3000}).then((res) => {
              if(!res) {
                /*
                error from http request
                ignore
                */
                resolve(null);
                return;
              }
              /*
              generate a random string as picture name
              */
              const fileNameRand = basicFunctions.generateRandomString(50) + '.jpg',
              imageRandomName = settings.TMP_FOLDER_PATH + '/' + fileNameRand;

              /*write to the file to tmp file*/
              fs.writeFileSync(imageRandomName, Buffer.from(res));

              resolve(settings.TMP_FOLDER_NAME + '/' + fileNameRand);
            });

          })
        )
      );

    }

    //check if thumbnail exists ion response
    if ( basicFunctions.exists(response['thumbnail'])  &&  basicFunctions.exists(response['thumbnail']['source']) ) {
      /*source pic exists*/
      imagesArr.push(
        (
          returnLinks ? response['thumbnail']['source'] :

          new Promise((resolve,reject) => {

            basicFunctions.doFetch(response['thumbnail']['source'], imageRequestSettings, {buffer:true, timeout:3000}).then((res) => {
              if(!res) {
                /*
                error from http request
                ignore
                */
                resolve(null);
                return;
              }
              /*
              generate a random string as picture name
              */

              let imageRandomName = settings.TMP_FOLDER_PATH + '/' + basicFunctions.generateRandomString(50) + '.jpg';

              /*write to the file to tmp file*/
              fs.writeFileSync(imageRandomName, Buffer.from(res));
              resolve(imageRandomName);
            });

          })
        )
      );

    }

    /*no images in response*/
    if(imagesArr.length === 0) {
      return null;
    }

    /*wait untill fetch is done*/
    imagesArr = await Promise.all(imagesArr);
    /*filter empty*/
    imagesArr = imagesArr.filter(o => o);
    return imagesArr;
  }

};
module.exports = new WikiClass();
