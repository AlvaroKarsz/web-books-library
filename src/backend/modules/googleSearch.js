const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);

class GoogleSearcher {
  constructor() {
    this.BASE_URL = "https://www.google.com/search?q=";
    this.SETTINGS = {
      method:'GET',
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    };
  }

  async getAsin(title, author, accurate = true) {
    /*if accurate is false, search without "amazon" and "novel" key words*/

    /*in order to fetch accurate info, both are needed*/
    if(!title || !author) {
      return null;
    }

    /*
    from some testings made, the most accurate info is fetched when multiple authors are cut.
    for example, if a book has many author, just pass the first one.

    same for acronyms
    */
    author = author.split(/\sas\s/i)[0]; /*acronyms*/
    author = author.split(/\sand\s/i)[0]; /*multiple authors*/

    /*trim info*/
    author = author.trim();
    title = title.trim();


    /*encode params*/
    title = encodeURIComponent(title);
    author = encodeURIComponent(author);

    /*url to get asin from title and author*/
    let url = `${this.BASE_URL}${accurate ? "amazon novel " : ""}${title} ${author} asin`;

    /*regexp to extract asin from html result*/
    const rgx = /ASIN\s?\:?\,?\=?\s?[0-9A-Z]+/i;

    /*make the http request, and ask for text response*/
    let req = await basicFunctions.doFetch(url, this.SETTINGS, {
      text:true,
      timeout: 5000 /*max 5 sec*/
    });

    /*nothing found*/
    if(!req) {
      /*if this search was in accurate mode, try the search again in non-accurate mode*/
      if(accurate) {
        return await this.getAsin(title, author, false);
      }
      return null;
    }

    /*apply regexp*/
    req = req.match(rgx);

    /*no match - no asin*/
    if(!req) {
      /*if this search was in accurate mode, try the search again in non-accurate mode*/
      if(accurate) {
        return await this.getAsin(title, author, false);
      }
      return null;
    }

    /*keep first match*/
    req = req[0];

    /*remove asin string from it*/
    req = req.replace(/ASIN\s?\:?\,?\=?\s?/i, '');

    /*trim data*/
    req = req.trim();

    return req;
  }

}

module.exports = new GoogleSearcher();
