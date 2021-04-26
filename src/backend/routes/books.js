const basic = require('../modules/basic.js');
const config = require('../config.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {

  app.get('/books', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = 0;
    let request = await db.fetchAllBooks(filters);
    const books = request.rows;
    const total = request.count;
    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'books',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Books",
      route: 'books',
      imageHref: '/books/'
    }));
  });

  app.get('/books/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    bookData = await db.fetchBookById(id, filters, 'book');
    let file = fs.readFileSync(path.join(__dirname,'..', '..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: bookData.name,
      folder: 'books',
      displayer: entryDisplayer.build(bookData, 'books', {})
    }));
  });

  app.get('/books/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = nextVal;
    let request = await db.fetchAllBooks(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
    }));
  });

  app.get('/insert/books/:id?', async (req, res) => {
    /*
    if id exists - the book already exists, and is been updated
    if id doesn't exists - this is a ney book
    frontend will handle with this id and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;
    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'insertBook.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: '',
      totalCount: '',
      objects: '',
      urlParams: '',
      title: '',
      route: '',
      pageTitle: id ? 'Edit Book' : 'Enter New Book' //if id exists - the page will load id's info
    }));
  });

  /*fetch book data by book id*/
  app.get('/get/book/:id', async(req, res) => {
    let id = req.params.id;
    res.send(
      await db.fetchBookById(id)
    );
  });

  app.post('/save/book', async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)); /*request body*/
    let covers = [];/*save here covers to save/download and save*/

    /*
    this route can be called in 3 different cases:
    1) insert a new book (default case).
    2) alter an existsing book, in this case requestBody.id will contain the existing book id
    3) convert wishlist to book, in this case requestBody.idFromWish will contain the existing wish id

    notes:
    in case 2), some unique checks will fail (unique ISBN for example, if wasn't modified), so pass the existing id as excluded
    */

    let existingBookId = requestBody.id || null;
    let existingWishId = requestBody.idFromWish || null;

    /*module to hanlde images*/
    const imagesHandler = require('../modules/images.js');


    /*get all covers and remove from requestBody*/
    /*main cover*/
    if(requestBody.cover) {
      covers.push( {
        cover: requestBody.cover,
        folder: 'books',
        type: 'book',
        isbn: requestBody.isbn
      } );
      /*remove main cover from request body*/
      requestBody.cover = '';
    }
    /*get story covers*/
    if(basic.isArray(requestBody.collection) && requestBody.collection.length) {
      for(let g = 0 , l = requestBody.collection.length ; g < l ; g ++ ) {
        if(requestBody.collection[g].cover) {
          covers.push( {
            cover: requestBody.collection[g].cover,
            folder: 'stories',
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
    if(! ['H','P','HN'].includes(requestBody.type)) {
      res.send(JSON.stringify({status:false, message:'Invalid Book Format.'}));
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
    } else if (existingWishId) {
      /*this is a wish, save book and delete wish*/
    } else {
      /*new book to save*/
      await db.saveBook(requestBody);
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
        cvr.path = await imagesHandler.saveImage(cvr.cover,path.join(__dirname,'..','..','..',cvr.folder), cvr.id);
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
            imagesHandler.deleteImage('stories', oldStoriesList[i].id);
          }
        }
      }
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

}
