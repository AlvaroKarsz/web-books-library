const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const config = require(settings.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH);
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

};
module.exports = new GoodReads();
