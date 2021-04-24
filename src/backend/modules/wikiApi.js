const basicFunctions = require('./basic');
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

  async getCoverByTitle(title) {
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
      imagesArr.push(response['originalimage']['source']);

    }

    //check if thumbnail exists ion response
    if ( basicFunctions.exists(response['thumbnail'])  &&  basicFunctions.exists(response['thumbnail']['source']) ) {
      /*source pic exists*/
      imagesArr.push(response['thumbnail']['source']);

    }

    /*no images in response*/
    if(imagesArr.length === 0) {
      return null;
    }
    /*filter empty*/
    imagesArr = imagesArr.filter(o => o);
    return imagesArr;
  }

};
module.exports = new WikiClass();
