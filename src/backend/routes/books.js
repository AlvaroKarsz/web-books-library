const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const googleSearcher = require(settings.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const goodReadsAPI = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const path = require('path');


module.exports = (app) => {

  app.get('/books', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;

    /*
    IN CASES OF DEFAULT SORT - THIS APP USES A RANDOM ONE.
    THIS APPROACH CREATES A PROBLEM - PAGINATION
    WHEN THE USER SCROLLS DOWN, THE APP WILL ASK FOR MORE DATA, BUT IT WILL BE RANDOM, SO THE SAME LISTING MAY (AND PROBABLY WILL) BE SENT AGAIN
    FIX IT BY USING A POSTGRES SEED BEFORE CALLING RANDOM FUNCTION
    USE THE SEED BEFORE EVERY PAGINATION FETCH, SO THE ORDER WILL BE SAVED, AND THE QUERY'S OFFSER & LIMIT WILL NOT BE MEANINGLESS
    */
    const seed = basic.generateSeedForPostgreSql();

    /*save the seed as a global parameter, and use it before pagination*/
    basic.setGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME, seed);

    /*set the seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllBooks(filters);
    const books = request.rows;
    const total = request.count;
    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      type: "Books",
      route: 'books',
      imageHref: '/books/'
    }));
  });

  app.get('/books/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/


    /*check if ID actually exists*/
    if(! await db.bookExists(id) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading book's page.\nBook ID does not exists in DB, ID: " + id
      });
      /*return error message to main page*/
      res.redirect(basic.buildRefererUrl('/books/', "Book doesn't exist"));
      /*exit*/
      return;
    }

    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let filters = basic.getFilters(basic.getUrlParams(req.url)),
    bookData = await db.fetchBookById(id, filters, 'book');
    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      displayer: entryDisplayer.build(bookData, settings.BOOKS_FOLDER_NAME, {
        bookRead:true,
        openPdf:true,
        fetchDescription: true,
        fetchRating: true,
        fetchCover: true,
        Ebookmark: true,
        fetchAsin: true,
        fetchTags: true,
        similarBooks: true
      })
    }));
  });

  app.get('/books/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;


    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllBooks(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  app.get('/insert/books/:id?', async (req, res) => {
    /*
    id cases:
    not exists -> insert a new book
    id is an intiger -> edit an existing book
    id follows format wish[0-9]+ -> a wish is converted to book

    frontend will handle with id parameter and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_INSERT_BOOK_FILE_NAME,
      pageTitle: id ? (basic.isValidInt(id) ? 'Edit Book' : 'Save Book From Wish' ) : 'Enter New Book' //if id exists - the page will load id's info
    }));
  });

  /*fetch book data by book id*/
  app.get('/get/books/:id', async(req, res) => {
    let id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.bookExists(id) ) {
      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching book's data.\nBook ID does not exists in DB, ID: " + id
      });
      /*return error message to main page*/
      res.send(null);
      /*exit*/
      return;
    }

    res.send(
      await db.fetchBookById(id)
    );
  });


  app.post('/save/book' , async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)); /*request body*/
    let covers = [];/*save here covers to save/download and save*/

    /*save E-Book in different variable (if exist)*/
    let eBook = req.files && req.files.eBook && req.files.eBook.data ? req.files.eBook.data : null;

    /*
    this route can be called in 3 different cases:
    1) insert a new book (default case).
    2) alter an existsing book, in this case requestBody.id will contain the existing book id
    3) convert wishlist to book, in this case requestBody.idFromWish will contain the existing wish id

    notes:
    in case 2), some unique checks will fail (unique ISBN for example, if wasn't modified), so pass the existing id as excluded
    */


    /*
    EMPTY ISBN IS ALLOWED ONLY FOR EBOOKS (SOME JUST DOESN'T HAVE ONE)
    IN THESE CASES, CALCULATE UNIQUE ID AND SAVE AS ISBN.
    IN ORDER TO MAKE SURE THE ISBN IS UNIQUE TO OTHER BOOKS AND EBOOKS, THE CALCULATION IS:
    (AUTHOR NAME + BOOK TITLE -> CONVERT EVERY CHAR TO ASCII AND CONCATENATE THE INTEGERS AS STRINGS) PAD WITH ZEROS (RIGHT) IF SIZE IS SMALLER THAN 14
    SO EVERY EBOOK SHOULD HAVE UNIQUE AUTHOR NAME + TITLE COMBINATION.
    THE OUTPUT IS LARGER THAN 13 DIGITS, SO NO OVERLAP WITH NORMAL ISBNS
    */
    if(eBook && !requestBody.isbn && requestBody.type === 'E') {

      (
        requestBody.isbn = (requestBody.title + requestBody.author)
        .split('')
        .map(a => a.charCodeAt(0))
        .join('')
      ).length < 14 ?
      requestBody.isbn += '0'
      .repeat(14 - requestBody.isbn.length)
      : '';

    }

    let existingBookId = requestBody.id || null;
    let existingWishId = requestBody.idFromWish || null;

    /*
    flag indicates that user passed a cover picture
    this flag is useful for cases when existingWishId exists.
    using this flag we know if we need to delete wish cover or just move it to the books folder
    */
    let mainCoverReceivedFromUser = false;

    /*get all covers and remove from requestBody*/
    /*main cover*/
    if(requestBody.cover) {
      covers.push( {
        cover: requestBody.cover,
        folder: settings.BOOKS_FOLDER_NAME,
        type: 'book',
        isbn: requestBody.isbn
      } );
      /*remove main cover from request body*/
      requestBody.cover = '';
      //toggle flag
      mainCoverReceivedFromUser = true;
    }
    /*get story covers*/
    if(basic.isArray(requestBody.collection) && requestBody.collection.length) {
      for(let g = 0 , l = requestBody.collection.length ; g < l ; g ++ ) {
        if(requestBody.collection[g].cover) {
          covers.push( {
            cover: requestBody.collection[g].cover,
            folder: settings.STORIES_FOLDER_NAME,
            type: 'story',
            title: requestBody.collection[g].title,
            /*is story has different author take it, else use book author*/
            author: requestBody.collection[g].author ? requestBody.collection[g].author : requestBody.author
          } );
          /*remove story's cover from request body*/
          requestBody.collection[g].cover = '';
        }
      }
    }

    /*check arrival date validity, if empty, set the default one - today's date*/
    if(requestBody.arrivalDate) {
      /*compart epoch time with tomorrow at 00:00 - should be equal or smaller*/
      if( +new Date(requestBody.arrivalDate) > basic.getTomorrowsEpoch() )  {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook Arrival date Timestamp (${+new Date(requestBody.arrivalDate)}) is bigger then tomorrows Timestamp ${basic.getTomorrowsEpoch()}.`
        });
        res.send(JSON.stringify({status:false, message:'Invalid Arrival Time'}));
        return;
      }
    } else {
      requestBody.arrivalDate = basic.getYYYYMMDDcurrentDate();
    }

    /*check year validity*/
    if(basic.toInt(requestBody.year) > new Date().getFullYear() || ! basic.isValidInt(requestBody.year)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nInvalid publication year ${requestBody.year}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Year'}));
      return;
    }

    //check book pages validity
    if( !basic.isValidInt(requestBody.pages) ) {
      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nInvalid number of pages ${requestBody.pages}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Pages'}));
      return;
    }

    /*
    if this is a collection (not empty)- validate the stories data
    */
    if(basic.isArray(requestBody.collection) && requestBody.collection.length) {

      /*make sure there are no empty names*/
      if(requestBody.collection.map(a => a.title).filter(a => a === '').length) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a collection and has stories without names`
        });

        res.send(JSON.stringify({status:false, message:'Empty Story Name'}));
        return;
      }

      /*make sure all sotory pages are valid ints*/
      if(requestBody.collection.map(a => a.pages).filter(a => !basic.isValidInt(a)).length) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a collection and has stories with invalid number of pages`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Story Pages'}));
        return;
      }

      /*make sure the number of story pages is not bigger than total book pages*/
      if(requestBody.collection.map(a => basic.toInt(a.pages)).reduce((a, b) => a + b ) > basic.toInt(requestBody.pages)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a collection, and total number of stories pages is bigger than total number of collection pages.`
        });

        res.send(JSON.stringify({status:false, message:'Story pages are bigger than the actual book length'}));
        return;
      }

      /*validate author if any*/
      if(requestBody.collection.map(a => a.author).filter(a => a !== false).filter(a => a === '').length) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a collection and has stories with invalid author names`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Story Author'}));
        return;
      }

      /* make sure all story names-author combination are unique.*/
      let tmp, titlesArr = requestBody.collection.map(a => a.title);
      for(let o = 0 , l = requestBody.collection.length ; o < l ; o ++ ) {
        /*get all indexes where this story title appears*/
        tmp = basic.findAllIndexes(titlesArr, requestBody.collection[o].title, true);
        /*iterate result and check if author name is the same*/
        for(let p = 0 , s = tmp.length ; p < s ; p ++ ) {
          if(basic.insensitiveCompare(requestBody.collection[o].author || requestBody.author, requestBody.collection[tmp[p]].author || requestBody.author)) {
            if(tmp[p] !== o) {/*to avoid cases when a book is found duplicated with itself*/

              /*log error*/
              logger.log({
                type: 'error',
                text: `Error Saving new book.\nBook is a collection and has a duplicated stories.\nTitle: ${requestBody.collection[o].name}.\nAuthor: ${requestBody.collection[o].author || requestBody.author}`
              });

              res.send(JSON.stringify({status:false, message:'Duplicated story'}));
              return;
            }
          }
        }
      }
    }
    /*if this book is part of serie - check serie parameters*/
    if(requestBody.serie) {
      /*both serie value (serie's id) and seire pages should be a valid integer - validate it*/
      if(!basic.isValidInt(requestBody.serie.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a part of series, and selected serie ID is invalid.\nSelected serie ID: ${requestBody.serie.value}.`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Serie'}));
        return;
      }
      if(!basic.isValidInt(requestBody.serie.number)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a part of series, and location in serie is invalid.\nSelected serie ID: ${requestBody.serie.value}\nLocation: ${requestBody.serie.number}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Number in Serie'}));
        return;
      }
      /*make sure the serie ID actualy exist*/
      if(! await db.checkIsSerieIdExists(requestBody.serie.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a part of series, and selected serie doesn't exists in DB.\nSelected serie ID: ${requestBody.serie.value}.`
        });

        res.send(JSON.stringify({status:false, message:'Serie not exist'}));
        return;
      }
      /*check if the number in serie is already taken*/
      if(await db.bookFromSerieExists(requestBody.serie.value, requestBody.serie.number, existingBookId)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is a part of series, and location in serie is already taken\nSelected serie ID: ${requestBody.serie.value}\nLocation: ${requestBody.serie.number}`
        });

        res.send(JSON.stringify({status:false, message:'Number in serie is already taken'}));
        return;
      }
    }

    /*if this book is followed - make sure the following book id is valid and exist*/
    if(requestBody.next) {
      if(!basic.isValidInt(requestBody.next.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is followed by another book, but the next book ID is invalid.\nNext book ID: ${requestBody.next.value}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid following book ID.'}));
        return;
      }
      if(!await db.checkIfBookIdExists(requestBody.next.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is followed by another book, but the next book ID doesn't exists in DB.\nNext book ID: ${requestBody.next.value}`
        });

        res.send(JSON.stringify({status:false, message:'Following book does not exist.'}));
        return;
      }
      /*
      change format from
      requestBody.next = {value:id}
      to
      requestBody.next = id
      */
      requestBody.next = requestBody.next.value;
    }

    /*if this book is preceded - make sure the preceded book id is valid and exist*/
    if(requestBody.prev) {
      if(!basic.isValidInt(requestBody.prev.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is preceded by another book, but the prev. book ID is invalid.\nPrev. book ID: ${requestBody.prev.value}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Preceding book ID.'}));
        return;
      }

      if(!await db.checkIfBookIdExists(requestBody.prev.value)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new book.\nBook is preceded by another book, but the prev. book ID doesn't exists in DB.\nPrev. book ID: ${requestBody.prev.value}`
        });

        res.send(JSON.stringify({status:false, message:'Preceding book does not exist.'}));
        return;
      }
      /*
      change format from
      requestBody.prev = {value:id}
      to
      requestBody.prev = id
      */
      requestBody.prev = requestBody.prev.value;
    }

    /*validate book type*/
    if(! ['H','P','HN', 'E'].includes(requestBody.type)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nUnknown book type.\nAllowed types:\nH: HardCover\nP: PaperBack\nE: E-book\nHN: HardCover without Dust Jacket\nReceived: ${requestBody.type}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Book Format.'}));
      return;
    }

    /*if this is a ebook, make sure a ebook file received (if a new book is been inserted)*/
    if( requestBody.type === 'E' && !eBook && !existingBookId) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nBook type is E-book, but no E-book was received.`
      });

      res.send(JSON.stringify({status:false, message:'Upload E-Book.'}));
      return;
    }


    /*make sure isbn isn't taken*/
    if(await db.checkIfIsbnExists(requestBody.isbn, existingBookId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nISBN already exists in DB and should be unique.\nISBN: ${requestBody.isbn}`
      });

      res.send(JSON.stringify({status:false, message:'ISBN already exist in DB.'}));
      return;
    }

    /*make sure this book has an unique title, author combination*/
    if(await db.checkIfBookAuthorAndTitleExists(requestBody.title,requestBody.author, existingBookId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new book.\nBook's Title + Author combination already exists.\nThis combination must be unique.\nTitle: ${requestBody.title}.\nAuthor: ${requestBody.author}`
      });

      res.send(JSON.stringify({status:false, message:'A book with this title by same author already exist.'}));
      return;
    }

    //save data in DB

    /*
    if this is a book that was modified, save the stories list (relevant only for collection).
    in this case, we need to delete pictures from old stories that were deleted.
    so fetch stories list
    */
    let oldStoriesList = [];
    if(existingBookId) {
      oldStoriesList = await db.fetchCollectionStories(existingBookId);
      /*existing book - alter it*/
      await db.alterBookById(existingBookId, requestBody);

      /*log action*/
      logger.log({
        text: `Book was altered.\nBook id: ${existingBookId}`
      });

    } else { /* existingWishId or normal case*/
      /*new book to save*/
      await db.saveBook(requestBody);

      /*log action*/
      logger.log({
        text: `New book was saved.\nTitle: ${requestBody.title}\nAuthor: ${requestBody.author}\nISBN: ${requestBody.isbn}`
      });
    }


    /*
    if this book is a "converted wish" - the following steps should be done:
    * delete wish entry in wish_list table
    * delete rating information in ratings table
    * delete md5sum hash from cache table
    * move picture to books folder (if used uses the same picture, if not just delete the picture)
    */
    if(existingWishId) {
      /*delete entry from wish_list*/
      await db.deleteWish(existingWishId);
      /*delete md5sum hash from cache table*/
      await db.deleteMD5(settings.WISH_LIST_FOLDER_NAME, existingWishId);

      /*log action*/
      logger.log({
        text: `Book from WishList was registered as a owned book.\nWishlist was deleted from DB.\nWishlist ID: ${existingWishId}`
      });

      /*user used another cover, delete this one*/
      if (mainCoverReceivedFromUser) {
        imagesHandler.deleteImage(settings.WISH_LIST_FOLDER_NAME, existingWishId);

        /*log action*/
        logger.log({
          text: `Book from WishList was registered as a owned book.\nWishlist Picture was not used for book's picture.\nWishlist picture was deleted\nWishlist ID: ${existingWishId}`
        });

      } else { /*user is using wish cover as book cover, move the picture and save the md5sum in DB*/
        /*get inserted book ID*/
        let newInsertedBookId = await db.getBookIdFromISBN(requestBody.isbn);

        /*move picture*/
        imagesHandler.moveImage({
          folder: settings.WISH_LIST_FOLDER_NAME,
          id: existingWishId
        }, {
          folder: settings.BOOKS_FOLDER_NAME,
          id: newInsertedBookId
        });

        /*log action*/
        logger.log({
          text: `Book from WishList was registered as a owned book.\nWishlist picture was used as book's picture.\nWishlist ID: ${existingWishId}.\nNew book ID :${newInsertedBookId}`
        });

        /*save md5hash*/
        await db.savePictureHashes({
          id: newInsertedBookId,
          folder: settings.BOOKS_FOLDER_NAME,
          md5: imagesHandler.calculateMD5(
            imagesHandler.getFullPath(settings.BOOKS_FOLDER_NAME, newInsertedBookId)
          )
        });

      }
    }


    /*
    now save covers if any
    if a book is been altered - the old picture may be overwrited
    */
    if(covers.length) {
      covers = await Promise.all(covers.map(async (cvr) => {
        if(cvr.type === 'book') {//main cover for book
          cvr.id = await db.getBookIdFromISBN(cvr.isbn);
        } else { //cover for story
          cvr.id = await db.getStoryIdFromAuthorAndTitleAndParentISBN(cvr.title, cvr.author, requestBody.isbn);
        }
        cvr.path = await imagesHandler.saveImage(cvr.cover,path.join(settings.ROOT_PATH ,cvr.folder), cvr.id);
        return cvr;
      }));

      //now save files md5 hash in DB
      await db.savePictureHashes(covers.map((c) => {
        return {
          id: c.id,
          folder: c.folder,
          md5: imagesHandler.calculateMD5(c.path)
        };
      }));
    }

    /*
    if this is a book that was modified, and if this book was a collection
    a story may have been deleted.
    in these cases, the md5sum hash will be deleted from DB in alterBookById function, but the actual picture should be deleted from file system
    so in these cases, delete old stories pictures
    */
    if(existingBookId) {//if a book was modified
      if(oldStoriesList.length) {//if this book had stories before the modification (and maybe still does)
        /*fetch current stories and check if any story was deleted*/
        let newStoriesList = await db.fetchCollectionStories(existingBookId);
        let storyFoundFlag = false;//default value
        /*iterate all old stories list, and delete deleted stories*/
        for(let i = 0 , d = oldStoriesList.length ; i < d ; i ++ ) {
          storyFoundFlag = false;//reset
          for(let j = 0 , v = newStoriesList.length ; j < v ; j ++ ) {
            if(oldStoriesList[i].id.toString() === newStoriesList[j].id.toString()) {//match - story still exists, no need to delete this picture
              storyFoundFlag = true;
              break;
            }
          }
          if(!storyFoundFlag) {//story has beed deleted - delete the picture (if any)
            imagesHandler.deleteImage(settings.STORIES_FOLDER_NAME, oldStoriesList[i].id);

            /*log action*/
            logger.log({
              text: `Book that is a collection was altered.\nStory was removed.\nBook ID :${existingBookId}\nStory ID: ${oldStoriesList[i].id}\nStory Title: ${oldStoriesList[i].name}`
            });

          }
        }
      }
    }


    /*if this is a E-Book, save ebook in relevant folder and save ebook hash in cache table*/
    if(eBook) {
      /*get book ID*/
      const bookID = existingBookId ? existingBookId : await db.getBookIdFromISBN(requestBody.isbn);
      /*save E-Book*/
      const eBookFullPath = await imagesHandler.saveImage(eBook,settings.E_BOOKS_PATH , bookID, {noModification:true, mime: 'pdf'});
      /*save md5sum hash*/
      await db.savePictureHashes([{
        id: bookID,
        folder: settings.E_BOOKS_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(eBookFullPath)
      }]);

      /*log action*/
      logger.log({
        text: `New E-book file was received\nBook ID ${bookID}`
      });

    }

    //return sucess message
    res.send(JSON.stringify({status:true}));
  });

  app.get('/bookList', async (req, res) => {
    /*fetch all books from DB and send it to user*/
    res.send(
      JSON.stringify(
        await db.fetchBooksForHtml()
      )
    );
  });

  app.get('/collectionList', async (req, res) => {
    /*fetch all collections from DB and send it to user*/
    res.send(
      JSON.stringify(
        await db.fetchCollectionsForHtml()
      )
    );
  });

  app.post('/books/read/:id', async (req, res) => {
    /*change book status to "read"*/

    /*get book id from url*/
    const id = req.params.id;

    /*
    get post data:
    date: read date
    completed: checkbox so may no be present, and may be on - indicates if book was completed
    pages: number of pages read - relevant only if completed is not on
    */
    let data = req.body,
    date = data.date,
    completedFlag = data.completed && data.completed === 'on',
    pages = completedFlag ? null : data.pages;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    errorMessage = 'err-msg';
    /*validate date format and beautify it*/
    date = basic.readDateForDB(date);


    /*check if ID actually exists*/
    if(! await db.bookExists(id) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error marking book as Read\nBook ID (${id}) doesn't exists in DB`
      });

      /*return error message to main page*/
      res.redirect(basic.buildRefererUrl('/books/', "Book doesn't exist"));
      /*exit*/
      return;
    }

    /*invalid date format*/
    if(!date) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error marking book as Read\nInvalid read date.\nBook ID: ${id}`
      });

      errorMessage += '=Invalid Date';//add error
      if(referer.indexOf('?') === -1) {//no query params, add the first one
        referer += '?' + errorMessage;
      } else {//query params exists - add a new one
        referer += '&' + errorIndicator;
      }
      res.redirect(referer);
      return;
    }

    /*if book was not completed - check pages*/
    if(!completedFlag) {
      pages = pages.trim();//remove white spaces
      if(!basic.isValidInt(
        basic.toInt(pages)
      )) {/*invalid pages number*/

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error marking book as partly Read\nInvalid number of read pages.\nBook ID: ${id}\nRead pages: ${pages}`
        });

        errorMessage += '=Invalid Number of Pages';//add error
        if(referer.indexOf('?') === -1) {//no query params, add the first one
          referer += '?' + errorMessage;
        } else {//query params exists - add a new one
          referer += '&' + errorIndicator;
        }
        res.redirect(referer);
        return;
      }

      /*number of read pages is bigger than book total pages*/
      const bookPages = await db.getBookPages(id);
      if( basic.isBiggerInt(pages, bookPages) ) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error marking book as partly Read\nNumber of read pages is bigger than book.\nBook ID: ${id}\nRead pages: ${pages}\nTotal Book pages: ${bookPages}`
        });

        errorMessage += '=Number of Read Pages is Bigger than Total Book Pages';//add error
        if(referer.indexOf('?') === -1) {//no query params, add the first one
          referer += '?' + errorMessage;
        } else {//query params exists - add a new one
          referer += '&' + errorIndicator;
        }
        res.redirect(referer);
        return;
      }

    }

    /*valid data - update DB*/
    await db.markBookAsRead(id, date, pages);

    /*log action*/
    logger.log({
      text: `Book (ID: ${id}) was marked as Read.`
    });

    res.redirect(referer);
  });



  /*route to change description*/
  app.post('/books/description/change', async (req, res) => {
    /*
    get request body
    should include id and description
    */
    const requestBody = basic.trimAllFormData(req.body);

    const id = requestBody.id,
    desc = requestBody.desc;
    /*if not present return error*/
    if(!id || !desc) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error changing description for a book.\nMissing data in request body.\nBook ID: ${id}.\nDescription ${desc}.`
      });

      res.send(JSON.stringify(false));
      return;
    }

    /*update DB*/
    await db.changeBookDescription(id, desc);

    /*log action*/
    logger.log({
      text: `Book description was changed for Book ID ${id}.`
    });


    /*send success message*/
    res.send(JSON.stringify(true));
    return;
  });

  /*route to change rating*/
  app.get('/books/rating/change/:id', async (req, res) => {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ratings for a book.\nInvalid Book ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch Rating, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveBookRating(id) ) {
      /*error finding new rating*/

      /*saveBookRating function will log the error*/
      message += 'Could not fetch Rating, Generic Error';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/

      /*log action*/
      logger.log({
        text: `New ratings were fetched for Book ID ${id}`
      });

      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });


  /*route to move bookmark - relevant only for ebooks that were not completed!!*/
  app.post('/books/bookmark/:id', async (req, res) => {
    /*
    get request body
    should include current page
    */
    const requestBody = basic.trimAllFormData(req.body),
    page = requestBody.page.trim();

    /*get id from url*/
    const id =  req.params.id;


    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';


    /*validate input data*/

    /*check if book id exists, and this is an uncompleted ebook*/
    if( ! await db.checkIfEbookNotCompleted(id) ) {
      /*send error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error seting a bookmark for an E-book.\nBook is not an E-book, or Book is a completed E-book.\nBook ID: ${id}`
      });

      message += 'Bookmarks can be used on non-completed E-Books only.';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*validate page number - should be integer*/
    if(!basic.isDigits(page)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error seting a bookmark for an E-book.\nInvalid page to bookmark.\nBook ID: ${id}, Page: ${page}`
      });

      message += 'Invalid number of pages.';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*validate pages - should not be bigger than total number of pages*/
    const totalNumberOfPages = await db.getBookPages(id);
    if( basic.isBiggerInt(page, totalNumberOfPages) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error seting a bookmark for an E-book.\nPage to bookmark is bigger than Number of book's pages.\nBook ID: ${id}\nWanted bookmark page: ${page}, Number of pages in book: ${totalNumberOfPages}`
      });

      message += 'Page exceeded total number of pages in E-Book.';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*save page*/
    await db.moveBookMark(id, page);

    /*log action*/
    logger.log({
      text: `Bookmark was set in page ${page} for E-book ID: ${id}`
    });

    /*return sucess msg*/
    message += 'Bookmark Saved.';
    res.redirect(basic.buildRefererUrl(referer, message, false));
    return;
  });

  /*route to change picture*/
  app.post('/books/:id/newPic', async (req, res) => {
    const id =  req.params.id;

    let pic = req.files && req.files.cover && req.files.cover.data ? req.files.cover.data : null;
    let mime = req.files && req.files.cover && req.files.cover.mimetype ? req.files.cover.mimetype : null;
    /*no picture*/
    if(!pic || !mime) {
      /*check if a url was received*/
      pic = basic.trimAllFormData(req.body);
      if(pic.cover) {
        pic = pic.cover;
      } else {
        /*nothing recevied*/

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error changing book's cover, no picture received.\nBook ID ${id}`
        });

        res.send(
          JSON.stringify(false)
        );
        return;
      }
    }

    try {
      /*save the new picture*/
      /*if url received, just pass the url, if a binary file recevied, pass the mime and noModification flag*/
      let picPath = await imagesHandler.saveImage(pic,settings.BOOKS_PATH , id, mime ? {/*save picture and get the full path (in order to get picture md5)*/
        noModification:true,
        mime: mime.split('/').pop() /*get last part, extension type*/
      } : {});
      /*now save md5 in DB*/
      await db.savePictureHashes({
        id: id,
        folder: settings.BOOKS_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });

      /*log action*/
      logger.log({
        text: `Cover picture was changed for Book ID ${id}.\nNew cover path: ${picPath}`
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error changing book's cover, Error: ${err}.\nBook ID ${id}`
      });

      res.send(
        JSON.stringify(false)
      );
    }

  });

  /*route to change asin, fetch and change*/
  app.get('/books/asin/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {
      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Book.\nInvalid Book ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch ASIN, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch title and author for the asin search*/
    let data = await db.fetchBookById(id);

    /*invalid data*/
    if(!data.name || !data.author) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Book.\nInvalid Book Title/Author.\nBook ID: ${id}, Title: ${data.name}, Author: ${data.author}`
      });

      message += 'Could not fetch ASIN, Invalid Book Name/Author';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch asin*/
    let asin = await googleSearcher.getAsin(data.name, data.author);

    /*save in DB - in case of errors asin will be null, and the DB will null the value in relevant table*/
    await db.saveAsin(asin, id, 'my_books');

    /*log action*/
    logger.log({
      text: `New ASIN number (${asin}) was saved for Book ID :${id}`
    });

    /*return success*/
    message += 'New ASIN was saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

  /*route to change tags, fetch and change*/
  app.get('/books/tags/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new Tags for a Book.\nInvalid Book ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch Tags, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch title, author and ISBN for the tags search*/
    let data = await db.fetchBookById(id);

    /*invalid data*/
    if((!data.name && !data.author) || !data.isbn) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new Tags for a Book.\nInvalid Book Title/Author or Invalid ISBN.\nBook ID: ${id}, Title: ${data.name}, Author: ${data.author}, ISBN ${data.isbn}`
      });

      message += 'Could not fetch Tags, Invalid Book Name/Author/ISBN';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch tags*/
    let tags = await goodReadsAPI.fetchTags({title: data.name,
      author: data.author,
      isbn: data.isbn
    });

    /*save in DB*/
    await db.saveTags(tags, id, 'my_books');

    /*log action*/
    logger.log({
      text: `New tags were fetched for a Book.\nBook ID: ${id}.\nNew tags: ${tags}`
    });

    /*return success*/
    message += 'New Tags were saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

}
