const basicFunctions = require('./basic');
const config = require('../config');

class GoodReads {
  constructor() {
    this.KEY = config.GOOD_READS_KEY;
    this.RATINGS_URL = 'https://www.goodreads.com/book/review_counts.json';
    this.ISBN_BY_TITLE_AND_AUTHOR_URL = 'https://www.goodreads.com/book/title.json';
    this.MAX_ISBNS_IN_HTTP_PAYLOAD = 500;
  }

  async fetchRating(isbn) {
    /*
    fetch goodreads's rating by book isbn
    SINGLE BOOK
    */
    const requestSettings = {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: this.KEY,
        isbns: isbn,
        format: 'json'
      })
    };

    let response = await basicFunctions.doFetch(this.RATINGS_URL, requestSettings, {timeout:5000});
    if(!response || !response.books) {
      /*error from http request*/
      return null;
    }
    return {
      rating: response.books[0].average_rating,
      count: response.books[0].work_ratings_count,
    };
  }

  async fetchRatings(isbns) {
    /*
    fetch goodreads's ratings by book isbns
    MANY BOOK
    */

    /*must be an array*/
    if(!basicFunctions.isArray(isbns)) {
      isbns = [isbns];
    }

    /*if this array is empty return just an empty array*/
    if(!isbns.length) {
      return [];
    }

    /*
    request payload has a limit
    cut arr to small arrays to avoid error from HTTP request
    */
    isbns = this.cutIsbnArrToLegalSizeIsbnArr(isbns);

    /*
    loop through array of arrays and make http requests
    */
    let output = [];//save here all responses
    let requestSettings = {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    response;

    for(let d = 0 , f = isbns.length ; d < f ; d ++ ) {
      /*create http payload for this list of arrays*/
      requestSettings.body = JSON.stringify({
        key: this.KEY,
        isbns: isbns[d],
        format: 'json'
      });
      /*make http request*/
      response = await basicFunctions.doFetch(this.RATINGS_URL, requestSettings, {timeout:10000});
      if(response && response.books) {
        output = [...output, ...response.books];
      }
    }
    return output;
  }

  cutIsbnArrToLegalSizeIsbnArr(arr) {
    let output = [];
    for(let i = 0, l = arr.length ; i < l ; i += this.MAX_ISBNS_IN_HTTP_PAYLOAD) {
      output.push(arr.slice(i, i + this.MAX_ISBNS_IN_HTTP_PAYLOAD));
    }
    return output;
  }

  async fetchIsbnFromTitleAndAuthor(title, author) {
    /*use API to retive isbn from title and autho*/

    const requestSettings = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    /*
    response from this endpoint is a mess
    for example:

    {"reviews_widget":"<style>\n  #goodreads-widget {\n    font-family: georgia, serif;\n    padding: 18px 0;\n    width:565px;\n  }\n  #goodreads-widget h1 {\n    font-weight:normal;\n    font-size: 16px;\n    border-bottom: 1px solid #BBB596;\n    margin-bottom: 0;\n  }\n  #goodreads-widget a {\n    text-decoration: none;\n    color:#660;\n  }\n  iframe{\n    background-color: #fff;\n  }\n  #goodreads-widget a:hover { text-decoration: underline; }\n  #goodreads-widget a:active {\n    color:#660;\n  }\n  #gr_footer {\n    width: 100%;\n    border-top: 1px solid #BBB596;\n    text-align: right;\n  }\n  #goodreads-widget .gr_branding{\n    color: #382110;\n    font-size: 11px;\n    text-decoration: none;\n    font-family: \"Helvetica Neue\", Helvetica, Arial, sans-serif;\n  }\n</style>\n<div id=\"goodreads-widget\">\n  <div id=\"gr_header\"><h1><a rel=\"nofollow\" href=\"https://www.goodreads.com/book/show/149267.The_Stand\">The Stand Reviews</a></h1></div>\n  <iframe id=\"the_iframe\" src=\"https://www.goodreads.com/api/reviews_widget_iframe?did=DEVELOPER_ID&amp;format=html&amp;isbn=0385199570&amp;links=660&amp;review_back=fff&amp;stars=000&amp;text=000\" width=\"565\" height=\"400\" frameborder=\"0\"></iframe>\n  <div id=\"gr_footer\">\n    <a class=\"gr_branding\" target=\"_blank\" rel=\"nofollow noopener noreferrer\" href=\"https://www.goodreads.com/book/show/149267.The_Stand?utm_medium=api&amp;utm_source=reviews_widget\">Reviews from Goodreads.com</a>\n  </div>\n</div>\n"}

    so convert to text and find the isbn with regexp
    */
    const url = `${this.ISBN_BY_TITLE_AND_AUTHOR_URL}?key=${this.KEY}&title=${title} ${author}&format=json`;
    let response = await basicFunctions.doFetch(url , requestSettings, {timeout:5000, text:true});
    if(!response) {
      /*error from http request*/
      return null;
    }

    response = response.match(/isbn\=[0-9]+/);

    if(!response) {
      /*no isbn in html*/
      return null;
    }

    /*first match is the isbn*/
    return response[0].replace('isbn=','');
  }

};
module.exports = new GoodReads();
