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
  route to find book details based on ISBN or author and title
  the actual search is based on ISBN, so if author and title are received, an API is used to retrieve the ISBN based on these parameters
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

    /*
    the fetch is based on isbn
    so if isbn is not present, use title and author to retrieve isbn
    */
    if(!isbn) {
      /*get isbn using goodreads API*/
      isbn = await goodReadsAPI.fetchIsbnFromTitleAndAuthor(title, author || '');
      if(!isbn) {
        /*
        isbn not found - return empty object
        */

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error while searching for book details.\nISBN not received from user, so ISBN was searched based on title (${title}) and author (${author}).\nNo ISBN found.`
        });

        res.send(JSON.stringify({}));
        return;
      }
    }

    /*get data by isbn from openlibrary API + description & tags from goodreads*/
    let output = await Promise.all([
      openLibraryApi.getDataByISBN(isbn),
      goodReadsAPI.fetchDescription({
        isbn: isbn,
        title: title,
        author: author
      }),
      goodReadsAPI.fetchTags({
        isbn: isbn,
        title: title,
        author: author
      }),
    ]);

    let openLibraryOutput = output[0],
    goodReadsDescription = output[1],
    goodReadsTags = output[2];

    /*if title and author were found, search for asin based on these parameters*/
    let asin = '';
    if(openLibraryOutput && openLibraryOutput.title && openLibraryOutput.author) {
      asin = await googleSearcher.getAsin(openLibraryOutput.title, openLibraryOutput.author);
    }

    output = {};

    if(openLibraryOutput) {
      output = { ...output, ...openLibraryOutput }  ;
    }

    if(goodReadsDescription) {
      output.description = goodReadsDescription;
    }

    if(goodReadsTags) {
      output.tags = goodReadsTags.join(", ");
    }

    /*if asin found add it to output data*/
    if(asin) {
      output.asin = asin;
    }

    output = JSON.stringify(output);

    /*log action*/
    logger.log({
      text: `Book details were fetched.\nReceived ISBN: ${isbn}, Author: ${author}, Title: ${title}.\nOutput: ${output}`
    });

    /*send data to frontend*/
    res.send(output);
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
      goodReadsAPI.fetchDescription({
        title: title,
        author: author
      }),
      googleSearcher.getAsin(title, author)
    ]);


    let description = output[0],
    asin = output[1];

    output = JSON.stringify({
      asin: asin,
      description: description
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
