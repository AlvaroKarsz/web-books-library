const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const xml2js = require('xml2js');

class GoodReads {
  constructor() {
    this.KEY = config.GOOD_READS_KEY;
    this.RATINGS_URL = 'https://www.goodreads.com/book/review_counts.json';
    this.INFO_BY_TITLE_AND_AUTHOR_URL = 'https://www.goodreads.com/book/title.xml';
    this.AUTHOR_ID_URL = 'https://www.goodreads.com/api/author_url/';
    this.AUTHOR_BOOKS_URL = 'https://www.goodreads.com/author/list.xml';
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
    title, author, isbn, bookData
    bookData is the result of calling "fetchBookInfo", if a function called it already, the output can be passed, so the call in this function will be avoided
    */

    /*no need to check if all are empty, this will be checked in fetchBookInfo*/
    let title = vars.title || null,
    author = vars.author || null,
    isbn = vars.isbn || null,
    bookData = vars.bookData || null;


    /*
    this function fetches tags for a book, (Example: Nonfiction, Business, Psychology, Personal Development, Leadership)
    tags are not received from the REST API, do the work method is fetching the HTML page and retrieving it from the HTML coce.
    In order to fetch the HTML page, the page's URL is needed, and is fetched from the INFO_BY_TITLE_AND_AUTHOR_URL API's endpoint
    */

    /* get the URL using fetchBookInfo function, if data wasn't received as argument */
    if(!bookData) {
      bookData = await this.fetchBookInfo({
        title: title,
        author: author,
        isbn: isbn
      });
    }

    /*no data found*/
    if(!bookData) {
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

    if(bookData.url && Array.isArray(bookData.url) && bookData.url.length) {
      url = bookData.url[0];
    } else if (bookData.link && Array.isArray(bookData.link) && bookData.link.length) {
      url = bookData.link[0];
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
      info[i].title_without_series && info[i].title_without_series[0] &&
      (
        info[i].isbn13 && info[i].isbn13[0]
        || info[i].isbn && info[i].isbn[0]
      ) &&
      info[i].authors
    ) {

      /*data in arrays*/
      books.push({
        title: info[i].title_without_series[0],
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

  async getAuthorID(authorName) {
    /*get author's goodreads ID*/
    let requestSettings = {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    },
    url = this.AUTHOR_ID_URL + authorName + '?key=' + this.KEY;
    /*fetch API*/
    /*response should be XML, so ask from text and convert it*/
    let response = await basicFunctions.doFetch(url , requestSettings, {timeout:5000, text:true});

    /*not found/error*/
    if(!response) {
      return null;
    }
    /*parse XML*/

    /*
    response example
    {GoodreadsResponse:{
    author:
    [{
    '$': { id: 'some id' },
    name: [ 'some name' ],
    link: [
    'some link'
  ]}]}}
  */
  try {
    response = await this.XML_PARSER.parseStringPromise(response);
    if(!response) {/*error from parser*/
      throw '';
    }
    if(!response['GoodreadsResponse']) {
      throw '';
    }
    response = response['GoodreadsResponse'];
    if(!response['author']) {
      throw 'no author in GoodreadsResponse';
    }
    response = response['author'];
    if(!Array.isArray(response)) {
      throw 'author is not array';
    }
    response = response[0];
    if(!response['$']) {
      throw 'no $ in author';
    }
    response = response['$'];
    if(!response['id']) {
      throw 'no id in $';
    }
    response = response['id'];
  } catch(err) {//error parsing xml
    return null;
  }
  return response;
}

async fetchBooksByAuthor(author, vars = {}) {
  /*
  fetch books by author
  first fetch author ID

  vars options:
  isId: if true, author is ID, and function getAuthorID will not be called
  page: option to add pagination to search
  includingSerieTitle: pass title without serie as well
  */
  let authorID = vars.isId ? author : await this.getAuthorID(author);

  /*no author ID found*/
  if(!authorID) {
    return null;
  }


  /*fetch books by author*/
  let requestSettings = {
    method:'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  url = this.AUTHOR_BOOKS_URL + '?key=' + this.KEY + '&id=' + authorID;

  if(vars.page) { /*add pagination*/
    url += '&page='  + vars.page;
  }

  /*fetch API*/
  /*response should be XML, so ask from text and convert it*/
  let response = await basicFunctions.doFetch(url , requestSettings, {timeout:5000, text:true});
  /*empty*/
  if(!response) {
    return null;
  }
  /*convert XML to json*/

  try {
    response = await this.XML_PARSER.parseStringPromise(response);
    if(!response) {/*error from parser*/
      throw '';
    }
    if(!response['GoodreadsResponse']) {
      throw '';
    }
    response = response['GoodreadsResponse'];

    if(!response['author']) {
      throw 'no author in GoodreadsResponse';
    }
    response = response['author'];
    if(!Array.isArray(response)) {
      throw 'author is not array';
    }
    response = response[0];
    if(!response['books']) {
      throw 'no books in author';
    }
    response = response['books'];
    if(!Array.isArray(response)) {
      throw 'books is not array';
    }
    response = response[0];
    if(!response['book']) {
      throw 'no book in books';
    }
    response = response['book'];
  } catch(err) {
    return null;
  }

  let books = [];

  /*iterate through response and save book elements*/
  /*
  after saving books into array,
  we are going to  check if books exists in one of our DB tables.
  in order to make it easier, add an unique ID to each book to indenity it by.
  */
  let uniqueId = 0, isbn = '';
  for(let i = 0, l = response.length ; i < l ; i ++ ) {
    isbn = '';//reset
    /*priority for isbn13*/
    isbn = response[i].isbn13 ? response[i].isbn13[0] : response[i].isbn10[0];

    if(typeof isbn !== 'string') {
      /*
      ISBN may be: ${nil:true}, ignore these
      */
      isbn = '';//reset
    }
    /*if all required data exist - save book*/
    if(
      response[i].title && response[i].title[0] &&
      isbn &&
      response[i].authors
    ) {

      /*isbn may be an object*/

      if (typeof isbn === 'object') {
        isbn = isbn['$'];
      }
      /*data in arrays*/
      books.push({
        titleSerie: vars.includingSerieTitle && response[i].title ? response[i].title[0] : null,
        title: response[i].title_without_series[0],
        isbn: isbn,
        author: response[i].authors[0].author.map(a => a.name).join(' and '), /*join all authors into 1 string*/
        cover: response[i].image_url && !/nophoto/.test(response[i].image_url[0]) ?/*ignore empty photos*/
        response[i].image_url[0] :
        response[i].small_image_url && !/nophoto/.test(response[i].small_image_url[0]) ?
        response[i].small_image_url[0] : null, /*priority for bigger pictures*/
        year: response[i].publication_year ? response[i].publication_year[0] : null,
        rating: response[i].average_rating ? response[i].average_rating[0] : null,
        rating_count: response[i].ratings_count ? response[i].ratings_count[0] : null,
        description: response[i].description ? response[i].description[0] : null,
        unique: (++uniqueId).toString()
      });

    }
  }

  /*
  Search for following additional data:
  * Check if books exists in DB
  * Search for covers (only books without covers)
  do all these in parallel (async actions)
  use google Api to search for covers
  */

  let dbCheck =  db.checkIfExistInDB(books); /*no await for now*/

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


    /*wait for db check to resolve*/
    dbCheck = await dbCheck;

    /*wait for all covers to resolve*/
    for(let i = 0 , l = books.length; i < l ; i ++ ) {
      if(basicFunctions.isPromise(books[i].cover)) { /*only if this is a promise*/
        books[i].cover = await books[i].cover;
      }
    }

    /*
    add DB data
    output example:
    {unique id 1: exists stamp 1, unique id 2, exists stamp 2 ...}
    */
    if(dbCheck) {
      for(let i = 0 , l = books.length ; i < l ; i ++ ) {/*iterate through books*/
        if(dbCheck[books[i].unique]) {//stamp exists
          books[i].exist = dbCheck[books[i].unique];
        }
      }
    }
    return books;
  }

  async getSeriesBook(author, serie, serieID) {
    /*find serie's books*/

    /*first, find author's ID*/
    let authorID = await this.getAuthorID(author);

    if(!authorID) { /*no author ID found*/
      return null;
    }

    /*
    fetch author's book using fetchBooksByAuthor
    use the pagination option until no more books arrive, or until MAX is reached
    */
    const MAX_PAGINATION = 3; /*max number of fetches*/
    let books = [], tmp;

    for(let i = 1 ; i <= MAX_PAGINATION ; i ++ ) {
      /*fetch data including title without serie, when title != title with no serie, this book is part of a serie*/
      tmp = await this.fetchBooksByAuthor(authorID, {
        isId: true,
        page: i,/*pagination*/
        includingSerieTitle: true /*pass title without serie as well*/
      });

      if(tmp && Array.isArray(tmp) && tmp.length) { /*more books received*/
        books.push(...tmp);//save books
      } else {//exit loop, no more books
        break;
      }
    }

    /*
    filter books, keep series books only
    when title != title with no serie, this book is part of a serie
    */
    for(let i = 0 , l = books.length ; i < l ; i ++ ) {
      if(books[i].title === books[i].titleSerie) {
        /*this is not a series book, remove it*/
        books.splice(i, 1);
        i--;
        l--;
      }
    }

    /*iterate through books, and find series name and number*/
    tmp = '';//reset tmp, defined above

    const bookLocationRGX = /\#[0-9\-\.]+/; //rgx to extract book location

    for(let i = 0 , l = books.length ; i < l ; i ++ ) {
      tmp = books[i].titleSerie.replace(books[i].title, '');//keep just the difference
      /*
      tmp example (series name, #location)
      */
      tmp = tmp.replace(/\(|\)/g,'');//remove ( and )
      try {
        books[i].serieLocation = tmp.match(bookLocationRGX)[0].replace('#','');
        books[i].series = tmp.replace(bookLocationRGX,'').replace(/\,\s+?$/,'').trim();
        books[i].serieID= serieID;
      } catch(err) {//no match , ignore this book
        books.splice(i, 1);
        i--;
        l--;
      }
    }

    /*remove books from different series*/

    /*ignore some words in serie names*/
    const blackListSeriesWord = [
      'trilogy',
      'series?', /*serie or series*/
      'the\\s', /*white space is on purpose*/
      'books\\sof'
    ];


    /*build a regexp with blackListSeriesWord words, it will help removing them from string*/
    const blackListRGX = new RegExp("\\b" + blackListSeriesWord.join('|') + "\\b","gi");

    for(let i = 0 , l = books.length ; i < l ; i ++ ) {
      if(
        books[i].series.
        toLowerCase().
        replace(/\s+/, ' '). //replace multiple whitespaces with one
        replace(blackListRGX, '').
        trim() !== serie.
        toLowerCase().
        replace(blackListRGX, '').
        trim()
      ) {//no series match
        books.splice(i, 1);
        i--;
        l--;
      }
    }

    return books;
  }


  async fetchAllBookData(vars = {}) {
    /*
    get all saved info in a book
    title, author, isbn, description, tags, publication year, number of pages
    */

    /*this self function does the actual fetch, it will check for "vars" validity so no need to check again here*/
    let info = await this.fetchBookInfo(vars);

    /*nothing found*/
    if(!info) {
      return null;
    }

    let output = {};

    //save relevant info in output

    if(info.title) {
      output.title = info.title[0];
    }

    /*priority to isbn 13*/
    if(info.isbn13) {
      output.isbn = info.isbn13[0];
    } else if (info.isbn) {
      output.isbn = info.isbn[0];
    }

    if(info.publication_year) {
      output.year = info.publication_year[0];
    }

    if(info.description) {
      output.description = info.description[0];
    }

    if(info.num_pages) {
      output.pages = info.num_pages[0];
    }

    if(info.format) {
      /*get format code*/

      switch(info.format[0].replace(/\s/g,'').toLowerCase()) {//remove whitespaces
        case 'paperback':
        case 'tradepaperback':
        output.format = 'P';
        break;
        case 'hardcover':
        output.format = 'H';
        break;
        case 'ebook':
        output.format = 'E';
        break;
        default:
        /*unknown - log it */
        logger.log({
          type: 'error',
          text: "Unknown book format - " + info.format[0]
        });
      }
    }

    if(info.authors && info.authors[0] && info.authors[0].author && info.authors[0].author[0] && info.authors[0].author[0].name) {
      output.author = info.authors[0].author[0].name[0];
    }

    if(info.work && info.work[0] && info.work[0].original_publication_year && info.work[0].original_publication_year[0] && info.work[0].original_publication_year[0]._) {
      output.original_year = info.work[0].original_publication_year[0]._;
    }

    /*
    in order to fetch tags, call the function fetchTags
    the function will call fetchBookInfo to get the book's url, but since we have called it already, we can pass is as a variable
    */

    vars.bookData = info;

    const tags = await this.fetchTags(vars);

    if(tags) {
      output.tags = tags;
    }

    return output;
  }
};
module.exports = new GoodReads();
