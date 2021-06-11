const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);

class GoogleAPI {
  constructor() {
    this.SEARCH_URL = 'https://www.googleapis.com/books/v1/volumes?maxResults=30&orderBy=relevance&printType=BOOKS&q=';
  }

  async fetchIsbnByTitleAndAuthor(title, author) {
    /*
    use google api to get book isbn
    */
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const fullUrl = this.SEARCH_URL + title + ' ' + author;

    let response = await basicFunctions.doFetch(fullUrl, requestSettings);
    if(!response || !response.items) {
      /*error from http request*/
      return null;
    }
    /*
    google api will return many matches, iterate all and get the one with same title and same author
    return isbn 13 or isbn 10
    */
    let foundFlag = null;
    for (let i = 0, l = response.items.length ; i < l ; i++ ) {
      foundFlag = false;//reset flag
      if(!response.items[i].volumeInfo || !response.items[i].volumeInfo.title || !response.items[i].volumeInfo.authors) {
        /*missing data in this listing*/
        continue;
      }
      if(response.items[i].volumeInfo.title.toLowerCase().replace(/\s/g,'') !== title.toLowerCase().replace(/\s/g,'')) {
        /*
        different book title
        after removing white spaces, it should match (insensitive)
        */
        continue;
      }

      /*google api will return authors as array, iterate all elements, at least one should match*/
      for(let j = 0 , s = response.items[i].volumeInfo.authors.length ; j < s ; j ++ ) {
        if(response.items[i].volumeInfo.authors[j].toLowerCase().replace(/\s/g,'') === author.toLowerCase().replace(/\s/g,'')) {
          /*
          match - received author in function is one of authors from google api response
          change flag to true and exit nested loop
          */
          foundFlag = true;
          break;
        }
      }
      if(!foundFlag) {
        /*no author match*/
        continue;
      }
      if(!response.items[i].volumeInfo.industryIdentifiers) {
        /*no isbns for this book*/
        continue;
      }
      /*iterate through identifiers and check for isbn*/
      for(let j = 0 , s = response.items[i].volumeInfo.industryIdentifiers.length ; j < s ; j ++ ) {
        if(['isbn_13','isbn_10'].includes(response.items[i].volumeInfo.industryIdentifiers[j].type.toLowerCase())) {
          return response.items[i].volumeInfo.industryIdentifiers[j].identifier
        }
      }
    }
    /*nothing found*/
    return null;
  }

  async fetchRatings(vars = {}) {
    /*better result cheching by title and author, if not passed, check by isbn*/
    let isbn = vars.isbn || null,
    title = vars.title || null,
    author = vars.author || null;

    /*can't check by author*/
    if(!isbn && !title) {
      return null;
    }

    let url = this.SEARCH_URL; /*base url*/

    if(title) {
      url += title;
      /*add author if passed*/
      if(author) {
        url += ' ' + author;
      }
    } else { /*search by ISBN*/
      url += isbn;
    }

    /*make the http request*/
    let response = await basicFunctions.doFetch(url, {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      timeout: 4000 /*limit to 4 seconds*/
    });

    if(!response || !response.items) {
      /*error from http request / nothing found*/
      return null;
    }
    response = response.items;

    /*find rating in items, save the one with bigger count*/
    let rating = 0, count = 0;

    for(let i = 0 , l = response.length ; i < l ; i ++ ) {
      if(response[i].volumeInfo) {
        if(response[i].volumeInfo.averageRating && response[i].volumeInfo.ratingsCount) {/*found*/
          if(response[i].volumeInfo.ratingsCount > count) {/*bigger - save this one*/
            rating = response[i].volumeInfo.averageRating;
            count = response[i].volumeInfo.ratingsCount;
          }
        }
      }
    }

    /*return data if found, null if not*/
    return count ? {
      rating: rating,
      count: count
    } : null;
  }

  async fetchIsbnByTitleAndAuthorBulk(dataArr) {
    let isbns = [];
    /*
    exactly like fetchIsbnByTitleAndAuthor method, but for more than 1 element
    just make some parallel requests to fetchIsbnByTitleAndAuthor method.
    */
    for(let i = 0 , l = dataArr.length ; i < l ; i ++ ) {
      isbns.push(
        this.fetchIsbnByTitleAndAuthor(dataArr[i].title, dataArr[i].author)
      );
    }

    /*
    now wait for all promises to resolve and return output
    */
    isbns = await Promise.all(isbns);
    /*
    now add isbn to evert element and return the dataArr with isbns attached
    */
    dataArr = dataArr.map((el, ind) => {
      el.isbn = isbns[ind];
      return el;
    });
    return dataArr;
  }

  async fetchCoversByTitleAndAuthor(title, author = null, opts = {}) {
    /*
    use google API in order to fetch covers
    opts options:
    limit: max results
    */
    const requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const fullUrl = `${this.SEARCH_URL}${title}${author ? ' ' + author : ''}`;

    let response = await basicFunctions.doFetch(fullUrl, requestSettings,  {timeout:3000});
    if(!response || !response.items) {
      /*error from http request*/
      return null;
    }

    /*settings in order to fetch images*/
    const imageRequestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'image/jpg'
      }
    };

    /*save images*/
    let imagesArr = [];
    /*number of maximun images to fetch*/
    const maxImages = opts.limit ? opts.limit : 9;
    /*save number of valid images so far*/
    let counter = 0;

    for (let item in response.items) {
      if (! basicFunctions.exists(response.items[item]['volumeInfo']) ) {
        /*
        invalid item - ignore it
        */
        continue;
      }

      if (! basicFunctions.exists(response.items[item]['volumeInfo']['title']) ) {
        /*
        invalid item - ignore it
        */
        continue;
      }

      if (! basicFunctions.insensitiveInclude2Ways(title,response.items[item]['volumeInfo']['title']) ) {
        /*
        title received from google api doesn't match our title
        ignore this item
        */
        continue;
      }

      if (! basicFunctions.exists(response.items[item]['volumeInfo']['imageLinks']) ) {
        /*
        no images for this item
        ignore it
        */
        continue;
      }

      if (! basicFunctions.exists(response.items[item]['volumeInfo']['imageLinks']['thumbnail']) ) {
        /*
        no thumbnail for this item
        ignore it
        */
        continue;
      }

      /*
      valid image - increare counter
      */
      counter ++;

      /*try to fetch the thumbnail*/

      /*
      save the url
      */
      imagesArr.push(response.items[item]['volumeInfo']['imageLinks']['thumbnail']);

      if(counter === maxImages) {
        /*
        reached maxinum images wanted
        break loop
        */
        break;
      }
    }

    /*
    return pictures found
    */
    imagesArr = imagesArr.filter(r => r);//remove nulls
    return imagesArr;
  }

};
module.exports = new GoogleAPI();
