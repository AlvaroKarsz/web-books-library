const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const path = require('path');


module.exports = (app) => {

  app.get('/books', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;
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
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    bookData = await db.fetchBookById(id, filters, 'book');
    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      displayer: entryDisplayer.build(bookData, settings.BOOKS_FOLDER_NAME, {
        bookRead:true,
        openPdf:true,
        fetchDescription: true,
        fetchRating: true
      })
    }));
  });

  app.get('/books/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;
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
  app.get('/get/book/:id', async(req, res) => {
    let id = req.params.id;
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
      /*compart epoch time with today - should be equal or smaller*/
      if( +new Date(requestBody.arrivalDate) > basic.getTodaysEpoch() )  {
        res.send(JSON.stringify({status:false, message:'Invalid Arrival Time'}));
        return;
      }
    } else {
      requestBody.arrivalDate = basic.getYYYYMMDDcurrentDate();
    }

    /*check year validity*/
    if(basic.toInt(requestBody.year) > new Date().getFullYear() || ! basic.isValidInt(requestBody.year)) {
      res.send(JSON.stringify({status:false, message:'Invalid Year'}));
      return;
    }

    //check book pages validity
    if( !basic.isValidInt(requestBody.pages) ) {
      res.send(JSON.stringify({status:false, message:'Invalid Pages'}));
      return;
    }

    /*
    if this is a collection (not empty)- validate the stories data
    */
    if(basic.isArray(requestBody.collection) && requestBody.collection.length) {

      /*make sure there are no empty names*/
      if(requestBody.collection.map(a => a.title).filter(a => a === '').length) {
        res.send(JSON.stringify({status:false, message:'Empty Story Name'}));
        return;
      }

      /*make sure all sotory pages are valid ints*/
      if(requestBody.collection.map(a => a.pages).filter(a => !basic.isValidInt(a)).length) {
        res.send(JSON.stringify({status:false, message:'Invalid Story Pages'}));
        return;
      }

      /*make sure the number of story pages is not bigger than total book pages*/
      if(requestBody.collection.map(a => basic.toInt(a.pages)).reduce((a, b) => a + b ) > basic.toInt(requestBody.pages)) {
        res.send(JSON.stringify({status:false, message:'Story pages are bigger than the actual book length'}));
        return;
      }

      /*validate author if any*/
      if(requestBody.collection.map(a => a.author).filter(a => a !== false).filter(a => a === '').length) {
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
        res.send(JSON.stringify({status:false, message:'Invalid Serie'}));
        return;
      }
      if(!basic.isValidInt(requestBody.serie.number)) {
        res.send(JSON.stringify({status:false, message:'Invalid Number in Serie'}));
        return;
      }
      /*make sure the serie ID actualy exist*/
      if(! await db.checkIsSerieIdExists(requestBody.serie.value)) {
        res.send(JSON.stringify({status:false, message:'Serie not exist'}));
        return;
      }
      /*check if the number in serie is already taken*/
      if(await db.bookFromSerieExists(requestBody.serie.value, requestBody.serie.number, existingBookId)) {
        res.send(JSON.stringify({status:false, message:'Number in serie is already taken'}));
        return;
      }
    }

    /*if this book is followed - make sure the following book id is valid and exist*/
    if(requestBody.next) {
      if(!basic.isValidInt(requestBody.next.value)) {
        res.send(JSON.stringify({status:false, message:'Invalid following book ID.'}));
        return;
      }
      if(!await db.checkIfBookIdExists(requestBody.next.value)) {
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
        res.send(JSON.stringify({status:false, message:'Invalid Preceding book ID.'}));
        return;
      }
      if(!await db.checkIfBookIdExists(requestBody.prev.value)) {
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
      res.send(JSON.stringify({status:false, message:'Invalid Book Format.'}));
      return;
    }

    /*if this is a ebook, make sure a ebook file received (if a new book is been inserted)*/
    if( requestBody.type === 'E' && !eBook && !existingBookId) {
      res.send(JSON.stringify({status:false, message:'Upload E-Book.'}));
      return;
    }


    /*make sure isbn isn't taken*/

    if(await db.checkIfIsbnExists(requestBody.isbn, existingBookId)) {
      res.send(JSON.stringify({status:false, message:'ISBN already exist in DB.'}));
      return;
    }

    /*make sure this book has an unique title, author combination*/
    if(await db.checkIfBookAuthorAndTitleExists(requestBody.title,requestBody.author, existingBookId)) {
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
    } else { /* existingWishId or normal case*/
      /*new book to save*/
      await db.saveBook(requestBody);
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

      /*user used another cover, delete this one*/
      if (mainCoverReceivedFromUser) {
        imagesHandler.deleteImage(settings.WISH_LIST_FOLDER_NAME, existingWishId);
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

    /*invalid date format*/
    if(!date) {
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
      if( basic.isBiggerInt(pages, await db.getBookPages(id) )) {

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
      res.send(JSON.stringify(false));
      return;
    }

    /*update DB*/
    await db.changeBookDescription(id, desc);

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
      /*send error*/
      message += 'Could not fetch Rating, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveBookRating(id) ) {
      /*error finding new rating*/
      message += 'Could not fetch Rating, Generic Error';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/
      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });

}
