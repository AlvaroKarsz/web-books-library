const basicFunctions = require('./basic');
const fs = require('fs');


class OpenLibrary {
  constructor() {
    this.COVER_URL = 'http://covers.openlibrary.org/b/isbn/';
    this.COVER_URL_ENDING = '-L.jpg?default=false';//default=false so if picture not exists, return 404
    this.DATA_URL_BY_ISBN = 'https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:';
  }

  async getCoverByIsbn(isbn) {
    /*set http request settings*/
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'image/jpg'
      }
    };
    /*make the http request*/
    let response = await basicFunctions.doFetch(this.COVER_URL + isbn + this.COVER_URL_ENDING, requestSettings, {buffer:true, timeout:3000});
    if(!response) {
      /*error from http request*/
      return null;
    }
    return this.COVER_URL + isbn + this.COVER_URL_ENDING;
  }

  async getCoverByIsbnBasedOnID(isbn) {
    /*
    use data url to fetch data, including picture based on book id
    */
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    /*make the http request*/
    let response = await basicFunctions.doFetch(this.DATA_URL_BY_ISBN + isbn, requestSettings, {timeout:3000});
    if(!response) {
      /*error from http request*/
      return null;
    }
    /*get key to json (special format)*/
    const key = this.buildKeyFromISBN(isbn);

    if(!response[key]) {
      /*no relevant data in json*/
      return null;
    }

    response = response[key];

    if(!response.cover) {
      /*no covers for this one*/
      return null;
    }

    response = response.cover;

    /*get the biggest picture found*/
    if(response.large) {
      response = response.large;
    } else if (response.medium) {
      response = response.medium;
    } else if (response.small) {
      response = response.small;
    } else {
      /*unknown covers json*/
      return null;
    }
    /*return cover url*/
    return response;
  }


  async getDataByISBN(isbn) {
    /*
    gets:isbn
    returns: title, author, pages, publication year, collection
    */

    /*set http request settings*/
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    /*make the http request*/
    let response = await basicFunctions.doFetch(this.DATA_URL_BY_ISBN + isbn, requestSettings, {timeout:3000});
    if(!response) {
      /*error from http request*/
      return null;
    }
    /*get key to json (special format)*/
    const key = this.buildKeyFromISBN(isbn);

    if(!response[key]) {
      /*no relevant data in json*/
      return null;
    }

    response = response[key];

    /*save in output data found regarding this ISBN*/
    let output = {
      title: '',
      author: '',
      pages: '',
      year: '',
      isbn: isbn,
      collection: []
    };

    if(response.title) {
      output.title = response.title;
    }

    if(response.authors && Array.isArray(response.authors)) {
      output.author = response.authors.map(a => a.name).join(" and ");
    }

    if(response.publish_date) {
      /*get just year*/
      output.year = response.publish_date.match(/[0-9]{4}/)[0] || '';
    }

    /*number of pages can appear in 2 different values*/
    if(response.number_of_pages) {
      output.pages = response.number_of_pages;
    } else if (response.pagination && /[0-9]+/.test(response.pagination)) {
      output.pages = response.pagination.match(/[0-9]+/)[0];
    }

    /*
    now check for stories if this is a collection
    collection can appear in several ways in table_of_contents
    */

    if(response.table_of_contents && Array.isArray(response.table_of_contents)) {
      /*we have stories*/
      if(response.table_of_contents.length === 1) {
        /*
        special case when all stories appear in same line seperated by "-"
        example:
        Contents: Rita Hayworth and Shawshank redemption - Apt pupil - The body - The breathing method - Afterword.
        */
        output.collection = response.table_of_contents.length[0].replace('Contents:','').split('-').map(a => a.trim());
      } else {
        /*
        normal case
        array of stories
        */
        output.collection = response.table_of_contents.map(a => a.title);
      }
      /*
      some names may end with "--"
      for example:
      {  "level": 0,  "label": "",  "title": "Hope Springs Eternal : Rita Hayworth and the Shawshank Redemption --",  "pagenum": ""}
      */
      output.collection = output.collection.map(a => a.replace(/\-\-$/,'').trim())
    }
    return output;
  }

  buildKeyFromISBN(isbn) {
    /*
    when fetching data from data's endpoint
    the key (based on isbn) is not trivial
    */
    return `ISBN:${isbn}`;
  }

};
module.exports = new OpenLibrary();
