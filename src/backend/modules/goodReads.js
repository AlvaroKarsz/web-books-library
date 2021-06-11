const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const xml2js = require('xml2js');

class GoodReads {
  constructor() {
    this.KEY = config.GOOD_READS_KEY;
    this.RATINGS_URL = 'https://www.goodreads.com/book/review_counts.json';
    this.INFO_BY_TITLE_AND_AUTHOR_URL = 'https://www.goodreads.com/book/title.xml';
    this.MAX_ISBNS_IN_HTTP_PAYLOAD = 500;
    this.XML_PARSER = new xml2js.Parser();
  }


  async fetchBookInfo(vars = {}) {
    /*
    vars options
    title: book's title
    author: book's author
    isbn: book's isbn

    at least isbn/title are needed
    priority:
    isbn
    title + author
    title
    */

    let isbn = vars.isbn || null,
    title = vars.title || null,
    author = vars.author || null;

    /*not enough to search*/
    if(!isbn && !title) {
      return null;
    }

    const requestSettings = {
      headers: {
        'Content-Type': 'text/xml, application/xml'
      }
    };

    /*fetch xml*/
    let url = `${this.INFO_BY_TITLE_AND_AUTHOR_URL}?key=${this.KEY}&format=xml&title=`;
    if(isbn) {
      url += isbn;
    } else {/*title (+author ?)*/
      url += title;
      if(author) {
        url += ' ' + author;
      }
    }

    /*ask format as text*/
    let response = await basicFunctions.doFetch(url , requestSettings, {timeout:5000, text:true});

    if(!response) {
      /*error from http request*/
      return null;
    }
    /*render json from xml - on error return null*/
    try {
      response = await this.XML_PARSER.parseStringPromise(response);
      if(!response) {/*error from parser*/
        throw '';
      }

      if(typeof response !== 'object') {
        throw '';/*unexpected response - should be json*/
      }

      if(!response.GoodreadsResponse) {
        throw '';/*must include this key*/
      }

      response = response.GoodreadsResponse;
      if(!basicFunctions.isArray(response.book)) {
        throw '';/*must include this key, and must be an array*/
      }
      response = response.book[0];
      return response;

    } catch(err) {
      return null;
    }
  }

  async fetchRatingFromTitleAndAuthor(title, author) {
    /*use fetchBookInfo to fetch all info, then search for isbn13/isbn*/
    let info = await this.fetchBookInfo({
      title: title,
      author: author
    });
    /*error from API*/
    if(!info) {
      return null;
    }

    /*rating found*/
    if(basicFunctions.isArray(info.average_rating) && basicFunctions.isArray(info.ratings_count)) {
      return {
        rating: info.average_rating[0],
        count: info.ratings_count[0]
      }
    }
    /*nothing found*/
    return null;
  }

  async fetchIsbnFromTitleAndAuthor(title, author) {
    /*use fetchBookInfo to fetch all info, then search for isbn13/isbn*/
    let info = await this.fetchBookInfo({
      title: title,
      author: author
    });
    /*error from API*/
    if(!info) {
      return null;
    }

    /*priority: ISBN13, ISBN, error*/
    if(basicFunctions.isArray(info.isbn13)) {
      return info.isbn13[0];
    }

    if(basicFunctions.isArray(info.isbn)) {
      return info.isbn[0];
    }

    return null;/*no isbn*/
  }

  async fetchDescription(vars = {}) {
    /*use fetchBookInfo to fetch all info, then search for description*/


    /*
    vars options
    title: book's title
    author: book's author
    isbn: book's isbn

    at least isbn/title are needed
    priority:
    isbn
    title + author
    title
    */

    let isbn = vars.isbn || null,
    title = vars.title || null,
    author = vars.author || null;

    /*not enough to search*/
    if(!isbn && !title) {
      return null;
    }
    let info;
    /*if isbn exists try to fetch data based on ISBN*/
    if(isbn) {
      info = await this.fetchBookInfo({
        isbn: isbn
      });

      /*error from API / response without description  from isbn based search - try author and title if received*/
      if(!info || !basicFunctions.isArray(info.description)) {
        if(title) {
          info = await this.fetchBookInfo({
            title: title,
            author: author
          });
        }
      }

    } else {
      /*fetch data based on author + title*/
      info = await this.fetchBookInfo({
        title: title,
        author: author
      });
    }


    /*error from API / response without description */
    if(!info || !basicFunctions.isArray(info.description)) {
      return null;
    }

    info = info.description[0];
    /*replace all html line breakers with \n*/
    info = info.replace(/\<br\s\/\>/g,"\n");
    return info;
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

  async fetchTags(vars = {}) {
    /*
    vars options:
    title, author, isbn
    */

    /*no need to check if all are empty, this will be checked in fetchBookInfo*/
    const title = vars.title || null,
    author = vars.author || null,
    isbn = vars.isbn || null;


    /*
    this function fetches tags for a book, (Example: Nonfiction, Business, Psychology, Personal Development, Leadership)
    tags are not received from the REST API, do the work method is fetching the HTML page and retrieving it from the HTML coce.
    In order to fetch the HTML page, the page's URL is needed, and is fetched from the INFO_BY_TITLE_AND_AUTHOR_URL API's endpoint
    */

    /* get the URL using fetchBookInfo function */
    const bookInfo = await this.fetchBookInfo({
      title: title,
      author: author,
      isbn: isbn
    });

    /*no data found*/
    if(!bookInfo) {
      return null;
    }

    /*
    fetch url from XML data, the wanted key is url or link, example:

    <url>
    <![CDATA[ https://www.goodreads.com/some-book-unique-url ]]>
    </url>
    <link>
    <![CDATA[ https://www.goodreads.com/some-book-unique-url ]]>
    </link>

    should be a non empty array
    */

    let url = '';

    if(bookInfo.url && Array.isArray(bookInfo.url) && bookInfo.url.length) {
      url = bookInfo.url[0];
    } else if (bookInfo.link && Array.isArray(bookInfo.link) && bookInfo.link.length) {
      url = bookInfo.link[0];
    } else {
      /*no link , can't fetch html page*/
      return null;
    }

    /*
    fetch HTML page
    ask response as text
    */
    let htmlRes = await basicFunctions.doFetch(url, {
      method: 'GET',
      headers: {
        "User-Agent": `Mozilla/5.0 ${basicFunctions.generateRandomString(15)}`, /*add some random chars to user agent*/
        "cache-control": "max-age=0",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
      }
    }, {
      timeout: 4000,
      text:true
    });

    /*fetch error*/
    if(!htmlRes) {
      return null;
    }


    /*
    tags in HTML page looks like:

    <a class="actionLinkLite bookPageGenreLink" href="/genres/non-fiction">Nonfiction</a>

    ...
    */

    let rgx = /href\="\/genres\/[0-9A-Z\_\-\.]+"\>[0-9A-Z\_\-\.]+\</gi;

    htmlRes = htmlRes.match(rgx);

    /*
    expected output example:
    [
    'href="/genres/non-fiction">Nonfiction<',
    'href="/genres/economics">Economics<' ]

    get data between > <
    */

    /*no tags found*/
    if(!htmlRes) {
      return null;
    }

    /*regexp to fetch tag from html line*/
    rgx = /\>(.*?)\</;

    /*get tag*/
    htmlRes = htmlRes.map( a => a.match(rgx)[1] );

    /*remove duplicated*/
    htmlRes = htmlRes.filter( (a, i) => htmlRes.indexOf(a) === i  );

    /*ignore tags from this list*/
    const blackList = [
      'audiobook',
      'novels',
      'children',
      'adult',
      'unfinished',
      'buisness', /*typo, appears in alot of books*/
      'collections',
      'teen',
      'childrens',
      'novella',
      'textbooks',
      'literature',
      'anthologies',
      'canada',
      'essays',
      'writing',
      'language',
      'american',
      'japan'
    ];

    /*remove blacklist values*/
    htmlRes = htmlRes.filter( a => !blackList.includes(a.toLowerCase()) )

    if(!htmlRes.length) {/*no tags*/
      return null;
    }

    return htmlRes;
  }


  async fetchSimilarBooks(vars = {}) {
    /*
    fetch similars books
    vars can include isbn, title and author
    Isbn or title are required
    */

    /*fetch all data for book with fetchBookInfo function*/
    let info = await this.fetchBookInfo(vars);

    /*nothing found or vars is empty*/
    if(!info) {
      return null;
    }

    /*no similar books*/
    if(!info.similar_books) {
      return null;
    }

    info = info.similar_books;

    /*
    similar books example:
    [ {
    book: [
    [Object], [Object], [Object],
    [Object], [Object], [Object],
    [Object], [Object], [Object],
    [Object], [Object], [Object],
    [Object], [Object], [Object],
    [Object], [Object], [Object]  ]
  } ]

  validate format
  */

  if(!Array.isArray(info) || ! info[0] || !info[0].book) { /*invalid format*/
    return null;
  }

  info = info[0].book;

  let books = [];

  /*iterate through info and save book elements*/
  /*
  after saving books into array,
  we are going to fetch ratings from another function, and check if books exists in one of our DB tables.
  in order to make it easier, add an unique ID to each book to indenity it by.
  */
  let uniqueId = 0;
  for(let i = 0, l = info.length ; i < l ; i ++ ) {

    /*if all required data exist - save book*/
    if(
      info[i].title && info[i].title[0] &&
      (
        info[i].isbn13 && info[i].isbn13[0]
        || info[i].isbn && info[i].isbn[0]
      ) &&
      info[i].authors
    ) {

      /*data in arrays*/
      books.push({
        title: info[i].title[0],
        isbn: info[i].isbn13 ? info[i].isbn13[0] : info[i].isbn[0], /*priority for isbn13*/
        author: info[i].authors[0].author.map(a => a.name).join(' and '), /*join all authors into 1 string*/
        cover: info[i].image_url && !/nophoto/.test(info[i].image_url[0]) ?/*ignore empty photos*/
        info[i].image_url[0] :
        info[i].small_image_url && !/nophoto/.test(info[i].small_image_url[0]) ?
        info[i].small_image_url[0] : null, /*priority for bigger pictures*/
        year: info[i].publication_year ? info[i].publication_year[0] : null,
        unique: (++uniqueId).toString()
      });

    }
  }

  /*
  ALL SIMILAR BOOKS HAVE RATINGS DATA, BUT THE RATINGS IS EQUAL TO THE OGIRINAL BOOK RATINGS (GOODREADS API BUG)
  Search for following data:
  * ratings
  * Check if books exists in DB
  * Search for covers (only books without covers)
  do all these in parallel (async actions)
  use google Api to search for covers
  */

  let parallelActions = [
    this.fetchRatings(
      books.map(a => a.isbn)
    ),
    db.checkIfExistInDB(books)
  ];

  const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);

  books.forEach((bk) => {
    if(!bk.cover) {
      bk.cover = googleApi.fetchCoversByTitleAndAuthor(
        bk.title.split('(')[0].//remove () if exists
        split(':')[0]. //remove : if exists
        replace(/\s+/g,' ').//remove multiple white space with one
        trim()//remove whitespaces
        ,bk.author, {limit:1})
      }
    });



    /*wait for resolve in all actions*/
    parallelActions = await Promise.all(parallelActions);
    /*wait for all covers to resolve*/
    for(let i = 0 , l = books.length; i < l ; i ++ ) {
      if(basicFunctions.isPromise(books[i].cover)) { /*only if this is a promise*/
        books[i].cover = await books[i].cover;
      }
    }

    /*add ratings to books arr*/
    let ratings = parallelActions[0];
    if(ratings) {
      for(let i = 0 , l = ratings.length ; i < l ; i ++ ) {/*iterate through ratings*/
        for(let j = 0 , s = books.length ; j < s ; j ++ ) {/*find matching book by isbn*/
          if(books[j].isbn === ratings[i].isbn || books[j].isbn === ratings[i].isbn13) {
            books[j].rating = ratings[i].average_rating;
            books[j].rating_count = ratings[i].ratings_count;
            break;/*exit loop - go to next rating element*/
          }
        }
      }
    }

    /*add DB data*/
    let dbData = parallelActions[1];
    /*output example:
    {unique id 1: exists stamp 1, unique id 2, exists stamp 2 ...}
    */
    if(dbData) {
      for(let i = 0 , l = books.length ; i < l ; i ++ ) {/*iterate through books*/
        if(dbData[books[i].unique]) {//stamp exists
          books[i].exist = dbData[books[i].unique];
        }
      }
    }

    return books;
  }

};
module.exports = new GoodReads();
