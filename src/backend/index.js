var express = require('express');
var app = express();
var path = require('path');
let db = require('./db/functions');
let fs = require('fs');
const config = require('./config.js');
const googleApi = require('./modules/googleApi.js');
const openLibraryApi = require('./modules/openLibrary.js');
const goodReadsAPI = require('./modules/goodReads.js');
const wikiApi = require('./modules/wikiApi.js');
const picDecoder = require('./modules/pictureDecoder.js');
const basic = require('./modules/basic.js');
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileupload());

app.get('/', async (req, res) =>  {
  res.redirect('books');
});


app.get('/books', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllBooks(filters);
  const books = request.rows;
  const total = request.count;
  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'books',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Books",
    route: 'books'
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

app.get('/wishlist', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllWishes(filters);
  const books = request.rows;
  const total = request.count;

  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'wishlist',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Wish List",
    route: 'wishlist'
  }));
});

app.get('/wishlist/next/:val', async (req, res) =>  {
  const nextVal =  req.params.val;
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = nextVal;
  let request = await db.fetchAllWishes(filters);
  res.send(JSON.stringify({
    books: request.rows,
    more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
  }));
});

app.get('/series', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllSeries(filters);
  const books = request.rows;
  const total = request.count;

  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'series',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Series",
    route: 'series'
  }));
});

app.get('/series/next/:val', async (req, res) =>  {
  const nextVal =  req.params.val;
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = nextVal;
  let request = await db.fetchAllSeries(filters);
  res.send(JSON.stringify({
    books: request.rows,
    more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
  }));
});


app.get('/stories', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllStories(filters);
  const books = request.rows;
  const total = request.count;

  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'stories',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Stories",
    route: 'stories'
  }));
});

app.get('/stories/next/:val', async (req, res) =>  {
  const nextVal =  req.params.val;
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = nextVal;
  let request = await db.fetchAllStories(filters);
  res.send(JSON.stringify({
    books: request.rows,
    more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
  }));
});

app.get('/reads', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllReads(filters);
  const books = request.rows;
  const total = request.count;

  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'books',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Read List",
    route: 'reads'
  }));
});


app.get('/reads/next/:val', async (req, res) =>  {
  const nextVal =  req.params.val;
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = nextVal;
  let request = await db.fetchAllReads(filters);
  res.send(JSON.stringify({
    books: request.rows,
    more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
  }));
});


app.get('/purchased', async (req, res) =>  {
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = 0;
  let request = await db.fetchAllPurchased(filters);
  const books = request.rows;
  const total = request.count;

  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'main.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: 'wishlist',
    totalCount: total,
    objects: books,
    urlParams: urlParams,
    title: "Purchased List",
    route: 'purchased'
  }));
});


app.get('/purchased/next/:val', async (req, res) =>  {
  const nextVal =  req.params.val;
  const urlParams = basic.getUrlParams(req.url);
  let filters = basic.getFilters(urlParams);
  filters.limit = config.IMAGES_NUM;
  filters.offset = nextVal;
  let request = await db.fetchAllPurchased(filters);
  res.send(JSON.stringify({
    books: request.rows,
    more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
  }));
});

app.get('/favicon.ico', function (req, res) {
  res.sendFile(path.join(__dirname, '..', '..', 'icons','logo.ico'));
});

app.get('/style', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'style', 'style.css'));
});

app.get('/frontend/display', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'code.js'));
});

app.get('/frontend/common', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'common.js'));
});

app.get('/frontend/insertBook', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'insertBook.js'));
});

app.get('/frontend/insertWish', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'insertWish.js'));
});

app.get('/pic/:picType/:picId', function (req, res) {
  let pictureId = req.params.picId, pictureType = req.params.picType;
  pictureType = basic.convertFolderType(pictureType);
  const picFullName = basic.getPictureMime(pictureType, pictureId);
  if(!picFullName) {//pic not exists
    res.sendStatus(404);
  } else {
    res.sendFile(path.join(__dirname, '..','..', pictureType, picFullName));
  }
});

app.get('/insert/book', async (req, res) => {
  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'insertBook.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: '',
    totalCount: '',
    objects: '',
    urlParams: '',
    title: '',
    route: ''
  }));
});

app.get('/insert/wish', async (req, res) => {
  let file = fs.readFileSync(path.join(__dirname, '..', 'html', 'insertWish.html'), 'UTF8');
  res.send(await basic.renderHtml({
    html: file,
    folder: '',
    totalCount: '',
    objects: '',
    urlParams: '',
    title: '',
    route: ''
  }));
});

app.post('/save/book', async (req, res) => {
  let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)); /*request body*/
  let covers = [];/*save here covers to save/download and save*/

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
    if(await db.bookFromSerieExists(requestBody.serie.value, requestBody.serie.number)) {
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

  if(await db.checkIfIsbnExists(requestBody.isbn)) {
    res.send(JSON.stringify({status:false, message:'ISBN already exist in DB.'}));
    return;
  }

  /*make sure this book has an unique title, author combination*/
  if(await db.checkIfBookAuthorAndTitleExists(requestBody.title,requestBody.author)) {
    res.send(JSON.stringify({status:false, message:'A book with this title by same author already exist.'}));
    return;
  }

  //save data in DB
  await db.saveBook(requestBody);

  //now save covers if any:
  if(covers.length) {
    const imagesHandler = require('./modules/images.js');
    covers = await Promise.all(covers.map(async (cvr) => {
      if(cvr.type === 'book') {//main cover for book
        cvr.id = await db.getBookIdFromISBN(cvr.isbn);
      } else { //cover for story
        cvr.id = await db.getStoryIdFromAuthorAndTitleAndParentISBN(cvr.title, cvr.author, requestBody.isbn);
      }
      cvr.path = await imagesHandler.saveImage(cvr.cover,path.join(__dirname,'..','..',cvr.folder), cvr.id);
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

  res.send(JSON.stringify({status:true}));
});

app.post('/save/wish', async (req, res) => {
  let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)), /*request body*/
  /*save cover in another variable, and remove from requestBody*/
  cover = requestBody.cover;
  requestBody.cover = null;
  /*check year validity*/
  if(basic.toInt(requestBody.year) > new Date().getFullYear() || ! basic.isValidInt(requestBody.year)) {
    res.send(JSON.stringify({status:false, message:'Invalid Year'}));
    return;
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
    if(await db.bookFromSerieExistsInWishList(requestBody.serie.value, requestBody.serie.number)) {
      res.send(JSON.stringify({status:false, message:'Number in serie is already taken'}));
      return;
    }
  }

  /*make sure isbn isn't taken*/
  if(await db.checkIfIsbnExistsInWishList(requestBody.isbn)) {
    res.send(JSON.stringify({status:false, message:'ISBN already exist in DB.'}));
    return;
  }

  /*make sure this book has an unique title, author combination*/
  if(await db.checkIfBookAuthorAndTitleAndYearExistsInWishList(requestBody.title,requestBody.author, requestBody.year)) {
    res.send(JSON.stringify({status:false, message:'A book with this title by same author already exist.'}));
    return;
  }

  //save data in DB
  await db.saveWish(requestBody);

  //now save cover (if any):
  if(cover) {
    const imagesHandler = require('./modules/images.js'),
    wishId = await db.getWishIdFromISBN(requestBody.isbn),/*get new id, received when wish saved in DB*/
    picPath = await imagesHandler.saveImage(cover,path.join(__dirname,'..','..','wishlist'), wishId);/*save picture and get the full path (in order to get picture md5)*/
    //now save md5 in DB
    await db.savePictureHashes({
      id: wishId,
      folder: 'wishlist',
      md5: imagesHandler.calculateMD5(picPath)
    });
  }
  res.send(JSON.stringify({status:true}));
});

app.post('/search/cover/', async (req, res) => {
  /*search book cover based on received ISBN*/
  const requestBody = basic.trimAllFormData(req.body); /*request body*/

  const isbn = requestBody.isbn || null,
  author = requestBody.author || null,
  title = requestBody.title || null;
  /*if one of params is empty, frontend will send "0" instead - filter these cases*/
  if(!isbn  && !author && !title) {
    res.send(JSON.stringify([]));//empty
    return;
  }
  /*fetch from APIs - depends on received data*/
  let covers = [];
  if(isbn) {
    covers.push(
      openLibraryApi.getCoverByIsbn(isbn),
      openLibraryApi.getCoverByIsbnBasedOnID(isbn)
    );
  }

  if(title) {
    covers.push(
      wikiApi.getCoverByTitle(title),
      googleApi.fetchCoversByTitleAndAuthor(title, (author || null))
    );
  }

  covers = await Promise.all(covers);
  /*flat array*/
  covers = covers.flat();
  /*remove nulls*/
  covers = covers.filter(r => r);
  /*send covers arr*/
  res.send(JSON.stringify(covers));
});

app.get('/display/settings', async (req, res) => {
  /*
  fetch display settings
  including: number of pictures per page
  including: number of pictures per row
  */
  res.send(JSON.stringify({
    perPage: config.IMAGES_NUM,
    perRow: config.BOOKS_PER_ROW
  }));
});


app.post('/search/book/', async (req, res) => {
  /*search for book info based on isbn or author and title*/
  const requestBody = basic.trimAllFormData(req.body); /*request body*/

  let isbn = requestBody.isbn || null,
  author = requestBody.author || null,
  title = requestBody.title || null;

  /*if one of params is empty, frontend will send "0" instead - filter these cases*/
  if(!isbn && !author && !title) {
    res.send(JSON.stringify({}));//empty
    return;
  }

  /*
  the fetch is based on isbn
  so if isbn is not present, use title and author to retrieve isbn
  */
  if(!isbn) {
    if(!title) {
      /*
      cant be done with author only
      */
      res.send(JSON.stringify({}));
      return;
    }
    /*get isbn using goodreads API*/
    isbn = await goodReadsAPI.fetchIsbnFromTitleAndAuthor(title, author || '');
    if(!isbn) {
      /*
      isbn not found
      */
      res.send(JSON.stringify({}));
      return;
    }
  }

  /*get data by isbn from openlibrary API*/
  const output = await openLibraryApi.getDataByISBN(isbn);
  if(!output) {
    /*
    data not found - or error
    */
    res.send(JSON.stringify({}));
    return;
  }

  /*send data*/
  res.send(JSON.stringify(output));
});


app.post('/decodePicture', async (req, res) => {
  let output = [];
  //no files  -  empty response
  if(!req.files || !req.files.file || !req.files.file.data) {
    res.send(JSON.stringify(output));
  }
  try {
    /*get file from request body*/
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
  } catch (e) {
    /*make sure this var is empty*/
    output = [];
  }
  /*clear files made during process*/
  picDecoder.clear();
  res.send(JSON.stringify(output));
});

app.get('/bookList', async (req, res) => {
  /*fetch all books from DB and send it to user*/
  res.send(
    JSON.stringify(
      await db.fetchBooksForHtml()
    )
  );
});

app.get('/serieList', async (req, res) => {
  /*fetch all series from DB and send it to user*/
  res.send(
    JSON.stringify(
      await db.fetchSeriesForHtml()
    )
  );
});

app.listen(config.PORT, '192.168.1.15');
