const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);
const openLibraryApi = require(settings.SOURCE_CODE_BACKEND_OPEN_LIBRARY_MODULE_FILE_PATH);
const picDecoder = require(settings.SOURCE_CODE_BACKEND_PICTURE_DECODER_MODULE_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const wikiApi = require(settings.SOURCE_CODE_BACKEND_WIKI_MODULE_FILE_PATH);
const goodReadsAPI = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);
const googleSearcher = require(settings.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_PATH);
const webStoreSearcher = require(settings.SOURCE_CODE_BACKEND_WEB_STORE_SEARCHER_MODULE_FILE_PATH);

const fs = require('fs');



module.exports = (app) => {

  /*
  route to find a cover to wanted book.
  the search is based on ISBN or author and title.
  */
  app.post('/search/cover/', async (req, res) => {
    /*get request body*/
    const requestBody = basic.trimAllFormData(req.body);

    const isbn = requestBody.isbn || null,
    author = requestBody.author || null,
    title = requestBody.title || null;


    /*invalid data received - return empty object*/
    if(!isbn  && !author && !title) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for a cover picture.\nMore data is needed.\nReceived ISBN: ${isbn}, Author: ${author}, Title: ${title}`
      });

      res.send(JSON.stringify([]));//empty
      return;
    }

    /*fetch from APIs - depends on received data*/

    let covers = [];

    /*if ISBN received*/
    if(isbn) {
      covers.push(
        openLibraryApi.getCoverByIsbn(isbn),
        openLibraryApi.getCoverByIsbnBasedOnID(isbn)
      );
    }

    /*if title received*/
    if(title) {
      covers.push(
        wikiApi.getCoverByTitle(title),
        googleApi.fetchCoversByTitleAndAuthor(title, (author || null))
      );
    }

    /*all methods return type is promise, so wait until all promises resolve*/
    covers = await Promise.all(covers);
    /*flat array*/
    covers = covers.flat();
    /*remove nulls*/
    covers = covers.filter(r => r);

    /*log action*/
    logger.log({
      text: `Cover were fetched for:\nISBN: ${isbn}, Author: ${author}, Title: ${title}.\n ${covers.length} Covers found`
    });

    /*send covers arr*/
    res.send(JSON.stringify(covers));
  });

  /*
  route to find book page in GoodReads
  search is based on isbn or author and title
  reoute receives type and id, then fetches isbn/author/title
  */
  app.post('/search/goodreadslink/', async (req, res) => {
    const requestBody = basic.trimAllFormData(req.body);

    let type = requestBody.type || null,
    id = requestBody.id || null;

    /*missing data*/
    if(!type || !id) {
      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for book link in Goodreads.\nMore data is needed.\nReceived Type: ${type}, ID: ${id}`
      });
      res.send(JSON.stringify(false));
      return;
    }

    let dbInfo = '';

    switch(type) {
      case 'books':

      dbInfo = await db.fetchBookById(id);

      break;
      case 'wishlist':

      dbInfo = await db.fetchWishById(id);

      break;

      case 'stories':

      dbInfo = await db.fetchStoryById(id);
      dbInfo.author = dbInfo.story_author ? dbInfo.story_author : dbInfo.author;/*use story author if exist*/

      break;

      default:
      /*unexpected - return empty string*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for book link in Goodreads.\nUnknown type (${type}) received.\nAllowed types: books/wishlist/stories`
      });

      res.send(JSON.stringify(false));
      return;
    }

    /*use goodreads module to fetch link*/
    let link = await goodReadsAPI.fetchGoodReadsLink({
      title: dbInfo.name,
      author: dbInfo.author,
      isbn: dbInfo.isbn
    });

    /*no link found*/
    if(!link) {
      logger.log({
        type: 'error',
        text: `Error while searching for book link in Goodreads.\nNothing found using Goodreads API`
      });
      res.send(JSON.stringify(false));
      return;
    }

    /*save link in DB*/
    await db.saveGoodreadsLink(type, id, link);

    /*log action*/
    logger.log({
      text: `Book link in Goodreads was fetched.\n: ID ${id}, type: ${type}.\nLink: ${link}`
    });

    res.send(JSON.stringify(true));
    return;
  });


  /*
  route to find book details based on ISBN or author and title
  ISBN or Title are required, just author won't be enough
  */
  app.post('/search/book/', async (req, res) => {
    /*get request body*/
    const requestBody = basic.trimAllFormData(req.body);

    let isbn = requestBody.isbn || null,
    author = requestBody.author || null,
    title = requestBody.title || null;

    /*
    the fetch is based on isbn
    so if isbn is not present, use title and author to retrieve isbn
    */
    if(!isbn && !title) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for book details.\nMore data is needed.\nReceived ISBN: ${isbn}, Author: ${author}, Title: ${title}`
      });

      res.send(JSON.stringify({}));
      return;
    }

    /*fetch book info from goodreads API*/
    let info = await goodReadsAPI.fetchAllBookData({
      isbn: isbn,
      author: author,
      title: title
    });

    /*if nothing found, make an empty object to insert data*/
    if(!info) {
      info = {};
    }


    /*if title and author were found, search for asin based on these parameters*/
    let asin = '';
    if(info.title && info.author) {
      asin = await googleSearcher.getAsin(info.title, info.author);
    }


    /*if asin found add it to output data*/
    if(asin) {
      info.asin = asin;
    }

    info = JSON.stringify(info);

    /*log action*/
    logger.log({
      text: `Book details were fetched.\nReceived ISBN: ${isbn}, Author: ${author}, Title: ${title}.\nOutput: ${info}`
    });

    /*send data to frontend*/
    res.send(info);
  });

  /*
  route to find story details based on title and (author or collection)
  */
  app.post('/search/story/', async (req, res) => {
    /*get request body*/
    const requestBody = basic.trimAllFormData(req.body);

    let collection = requestBody.collection || null,
    author = requestBody.author || null,
    title = requestBody.title || null;

    /*invalid data received - return empty object*/
    if(!title || (!author && !collection)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for story details.\nMore data is needed.\nReceived Author: ${author}, Title: ${title}, Collection ID ${collection}`
      });

      res.send(JSON.stringify({}));
      return;
    }

    /*if author is empty, get author from collection*/
    if(!author) {
      author = await db.getAuthorAndPagesById(collection);
      author = author.author;
    }

    /*returned data should be asin and description*/
    let output = await Promise.all([
      goodReadsAPI.fetchAllBookData({
        title: title,
        author: author
      }),
      googleSearcher.getAsin(title, author)
    ]);


    let allData = output[0],
    asin = output[1];

    output = JSON.stringify({
      asin: asin,
      description: allData.description,
      goodreads: allData.goodreads
    });

    /*log action*/
    logger.log({
      text: `Story details were fetched.\nReceived Author: ${author}, Title: ${title}, Collection ID: ${collection}.\nOutput: ${output}`
    });

    /*send data to frontend*/
    res.send(output);
  });


  /*
  route to decode text from received picture
  */
  app.post('/decodePicture', async (req, res) => {
    let output = [];
    /*no files  -  empty response*/
    if(!req.files || !req.files.file || !req.files.file.data) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while Decoding text from picture.\nNo picture received.`
      });

      res.send(JSON.stringify(output));
      return;
    }

    /*all maps and filters may cause unexpected errors, so wrap the code in try catch block*/
    try {
      /*try to decode picture using picDecoder class*/
      output = await picDecoder.decode(req.files.file.data);
      output = output.split("\n");//split to lines
      output = output.filter(a => a && a.trim());//remove empty lines
      output = output.map(a => a.replace(/\s+/g, ' ').trim());//replace multiple space with one space and trim
      output = output.map(a => a.replace(/^["'_.;]/,'').replace(/["'_.;]$/,'').trim());//remove weird chars from str in location 0, remote weird chars from last char and trim again
      output = output.map(a => a.split(" "));//split by white spaces
      output = output.filter(a => a.length > 1);//remove elements with 1 elements and lower - should include at least 2 - title and page
      output = output.filter(a => basic.isDigits(a[a.length - 1]));//last element should be a number - number of pages - remove these without page
      output = output.map((a) => {//convert elements to object
        return {
          name:a.slice(0, -1).join(" "),
          page: a[a.length - 1]
        };
      });

      /*log action*/
      logger.log({
        text: `Text was decoded from received picture.\nText found: ${output}`
      });

    } catch (e) {
      /*error while decoding picture or handling output*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while Decoding text from picture.\nError - ${e}`
      });

      output = [];
    }
    /*
    picDecoder will create files while decoding pictures, delete these files (if exists)
    */
    picDecoder.clear();
    res.send(JSON.stringify(output));
  });


  /*route to search for books from same series*/
  app.post('/search/sameSerie/', async (req, res) => {
    /*
    get request body
    should include author name
    */
    const requestBody = basic.trimAllFormData(req.body);

    const serie = requestBody.serie;

    /*if not present return empty response*/
    if(!serie) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for books from same series.\nMore data is needed.\nReceived serie: ${serie}`
      });

      res.send(JSON.stringify(''));
      return;
    }

    /*find serie name and author in DB*/
    const serieInfo = await db.fetchSerieById(serie);

    if(!serieInfo || !serieInfo.author || !serieInfo.name) {/*unknown serie ID*/
      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for books from same series.\nNo serie with Received ID was found in DB.\nReceived serie: ${serie}`
      });

      res.send(JSON.stringify(''));
      return;
    }

    /*use goodreads module to fetch books*/
    const output = JSON.stringify(
      await goodReadsAPI.getSeriesBook(serieInfo.author, serieInfo.name, serie)
    );

    /*log action*/
    logger.log({
      text: `Books from same serie were fetched for author: ${serieInfo.author}, serie name: ${serieInfo.name}.\nOutput: ${output}`
    });

    res.send(output);
  });



  /*route to search for books from same author*/
  app.post('/search/sameAuthor/', async (req, res) => {
    /*
    get request body
    should include author name
    */
    const requestBody = basic.trimAllFormData(req.body);

    const author = requestBody.author;

    /*if not present return empty response*/
    if(!author) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for books from same author.\nMore data is needed.\nReceived Author: ${author}`
      });

      res.send(JSON.stringify(''));
      return;
    }

    /*use goodreads module to fetch books*/
    const output = JSON.stringify(
      await goodReadsAPI.fetchBooksByAuthor(author)
    );

    /*log action*/
    logger.log({
      text: `Books by same author were fetched for author: ${author}.\nOutput: ${output}`
    });

    res.send(output);
  });



  /*route to search for similar books*/
  app.post('/search/similar/', async (req, res) => {
    /*
    get request body
    should include id and type (book/wish/etc..)
    */
    const requestBody = basic.trimAllFormData(req.body);

    const id = requestBody.id,
    type = requestBody.type;
    /*if not present return empty response*/
    if(!id || !type) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for similar books.\nMore data is needed.\nReceived ID: ${id}, type: ${type}`
      });

      res.send(JSON.stringify(''));
      return;
    }
    /*
    needed data to get similar books:
    ISBN
    TITLE
    AUTHOR

    fetch data from DB based on type and ID
    */

    let dbInfo = '';

    switch(type) {
      case 'books':

      dbInfo = await db.fetchBookById(id);

      break;
      case 'wishlist':

      dbInfo = await db.fetchWishById(id);

      break;

      case 'stories':

      dbInfo = await db.fetchStoryById(id);
      dbInfo.author = dbInfo.story_author ? dbInfo.story_author : dbInfo.author;/*use story author if exist*/

      break;

      default:
      /*unexpected - return empty string*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for similar books.\nUnknown type (${type}) received.\nAllowed types: books/wishlist/stories`
      });

      res.send(JSON.stringify(''));
      return;
    }

    /*use goodreads module to fetch similar books*/
    const output = JSON.stringify(
      await goodReadsAPI.fetchSimilarBooks({
        title: dbInfo.name,
        author: dbInfo.author,
        isbn: dbInfo.isbn
      })
    );

    /*log action*/
    logger.log({
      text: `Similar books were fetched for data: ID ${id}, type: ${type}.\nOutput: ${output}`
    });

    res.send(output);
  });




  /*route to search for a description*/
  app.get('/search/cheap/:isbn', async (req, res) => {
    const isbn =  req.params.isbn;

    if(!isbn) {/*no isbn received - exit*/
      logger.log({
        type: 'error',
        text: "Error searching for book prices in web, no ISBN received"
      });
      res.send(JSON.stringify(''));
      return;
    }

    /*get author & title from ISBN*/
    let dbData = await db.getAuthorAndTitleFromISBN(isbn);

    if(!dbData) {/*nothing found in DB*/
      logger.log({
        type: 'error',
        text: "Error searching for book prices in web, ISBN (" + isbn + ") not found in DB"
      });
      res.send(JSON.stringify(''));
      return;
    }

    /*search for prices*/
    let prices = JSON.stringify(
      await webStoreSearcher.findPrices(dbData.name, dbData.author)
    );

    /*log action*/
    logger.log({
      text: `Book prices search result:\nISBN: ${isbn}\nPrices: ${prices}`
    });

    /*echo response*/
    res.send(prices);

  });

  /*route to search for a description*/
  app.post('/search/description/', async (req, res) => {
    /*
    get request body
    should include id and type (book/wish/etc..)
    or isbn, title and author
    if includes id and type, fetch isbn title and author from DB
    */
    const requestBody = basic.trimAllFormData(req.body);

    let id = requestBody.id,
    type = requestBody.type,
    isbn = requestBody.isbn,
    title = requestBody.title,
    author = requestBody.author;
    /*if not present return empty response*/
    if( (!id || !type) && (!isbn || !title) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error while searching for book/story description.\nMore data is needed.\nReceived ID: ${id}, type: ${type}, isbn: ${isbn}, title: ${title}, author: ${author}.`
      });

      res.send(JSON.stringify(''));
      return;
    }

    //no data, fetch from DB
    if(!isbn) {
      /*
      needed data to get description:
      ISBN
      TITLE
      AUTHOR

      (TITLE AND AUTHOR FOR STORIES)
      fetch data from DB based on type and ID
      */

      let dbInfo = '';

      switch(type) {
        case 'books':

        dbInfo = await db.fetchBookById(id);

        break;
        case 'wishlist':

        dbInfo = await db.fetchWishById(id);

        break;

        case 'stories':

        dbInfo = await db.fetchStoryById(id);
        dbInfo.author = dbInfo.story_author ? dbInfo.story_author : dbInfo.author;/*use story author if exist*/

        break;

        default:
        /*unexpected - return empty string*/

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error while searching for book/story description.\nUnknown type (${type}) received.\nAllowed types: books/wishlist/stories`
        });

        res.send(JSON.stringify(''));
        return;
      }
      isbn = dbInfo.isbn;
      title = dbInfo.name;
      author = dbInfo.author;
    }
    /*use goodreads module to fetch description*/

    const output = JSON.stringify(
      await goodReadsAPI.fetchDescription({
        title: title,
        author: author,
        isbn: isbn
      })
    );

    /*log action*/
    logger.log({
      text: `Description was fetched for data: ID ${id}, type: ${type}, isbn: ${isbn}, title: ${title}, author: ${author}.\nOutput: ${output}`
    });

    res.send(output);

  });

}
