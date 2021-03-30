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
const basic = require('./modules/basic.js');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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

app.post('/save/book', async (req, res) => {
  let requestBody = basic.trimAllFormData(req.body); /*request body*/
  let dataObject = {};//save here all data
  const currentYear = new Date().getFullYear(); /*current year*/
  requestBody.year = basic.toInt(requestBody.year);
  requestBody.pages = basic.toInt(requestBody.pages);

  //check book year validity
  if(requestBody.year > currentYear || ! basic.isValidInt(requestBody.year)) {
    res.send(JSON.stringify({status:false, message:'Invalid Year'}));
    return;
  }
  dataObject.year = requestBody.year;

  //check book pages validity
  if( !basic.isValidInt(requestBody.pages) ) {
    res.send(JSON.stringify({status:false, message:'Invalid Pages'}));
    return;
  }
  dataObject.pages = requestBody.pages;

  /*
  if this is a collection - validate the stories data
  */
  if(basic.isArray(requestBody['story_pages[]']) && basic.isArray(requestBody['story_name[]'])) {
    //convert all story pages to int
    requestBody['story_pages[]'] = requestBody['story_pages[]'].map(a => basic.toInt(a));

    //check story pages validity
    if (requestBody['story_pages[]'].filter(a => !basic.isValidInt(a)).length > 0 ) {
      res.send(JSON.stringify({status:false, message:'Some story has invalid pages number'}));
      return;
    }

    // make sure all story names are unique.
    if (requestBody['story_name[]'].map(a => a.toLowerCase()).filter((element, index) => requestBody['story_name[]'].indexOf(element) === index).length !== requestBody['story_name[]'].length) {
      res.send(JSON.stringify({status:false, message:'Duplicated story name'}));
      return;
    }

    //make sure the number of story pages is not bigger than total book pages
    if( requestBody['story_pages[]'].reduce( (a, b) => a + b ) > requestBody.pages) {
      res.send(JSON.stringify({status:false, message:'Story pages are bigger than the actual book length'}));
      return;
    }
    //insert stories to data object
    dataObject.collection = [];
    for (let i = 0, l = requestBody['story_pages[]'].length; i < l; i++) {
      dataObject.collection.push({
        name:requestBody['story_name[]'][i],
        pages:requestBody['story_pages[]'][i]
      });
    }
  } else {
    dataObject.collection = false;
  }

  //handle serie
  if(requestBody.serie_flag) {
    requestBody.serie_id = basic.toInt(requestBody.serie_id);
    requestBody.serie_num = basic.toInt(requestBody.serie_num);
    //invalid serie id or serie number
    if(!basic.isValidInt(requestBody.serie_id) || !basic.isValidInt(requestBody.serie_num)) {
      res.send(JSON.stringify({status:false, message:'Invalid Serie Parameters'}));
      return;
    }
    //check if serie id exists in DB
    if(! await db.checkIsSerieIdExists(requestBody.serie_id)) {
      res.send(JSON.stringify({status:false, message:'Serie not exists'}));
      return;
    }
    //check if a book in t his index exists in this serie
    if(await db.bookFromSerieExists(requestBody.serie_id, requestBody.serie_num)) {
      res.send(JSON.stringify({status:false, message:'A Book already exists in this serie index'}));
      return;
    }
    dataObject.serie = requestBody.serie_id;
    dataObject.serie_number = requestBody.serie_num;
  } else {
    dataObject.serie = false;
    dataObject.serie_number = false;
  }

  //handle followed book
  if(requestBody.followed_book_flag) {
    requestBody.followed_book = basic.toInt(requestBody.followed_book);
    if(!basic.isValidInt(requestBody.followed_book)) {
      res.send(JSON.stringify({status:false, message:'Invalid follow book ID.'}));
      return;
    }
    if(!await db.checkIfBookIdExists(requestBody.followed_book)) {
      res.send(JSON.stringify({status:false, message:'Follow book does not exists.'}));
      return;
    }
    dataObject.followed = requestBody.followed_book;
  } else {
    dataObject.followed = false;
  }

  //handle preceded book
  if(requestBody.prev_book_flag) {
    requestBody.prev_book = basic.toInt(requestBody.prev_book);
    if(!basic.isValidInt(requestBody.prev_book)) {
      res.send(JSON.stringify({status:false, message:'Invalid previous book ID.'}));
      return;
    }
    if(!await db.checkIfBookIdExists(requestBody.prev_book)) {
      res.send(JSON.stringify({status:false, message:'Previous book does not exists.'}));
      return;
    }
    dataObject.preceded = requestBody.prev_book;
  } else {
    dataObject.preceded = false;
  }
  //get book type
  dataObject.type = requestBody.hardcover_no_dustjacket ? 'HN' : (requestBody.paperback ? 'P' : 'H');

  //make sure isbn not exists
  if(await db.checkIfIsbnExists(requestBody.isbn)) {
    res.send(JSON.stringify({status:false, message:'ISBN already exists in DB.'}));
    return;
  }
  dataObject.isbn = requestBody.isbn;

  //make sure the title and author combination not exists in DB
  if(await db.checkIfBookAuthorAndTitleExists(requestBody.title,requestBody.author)) {
    res.send(JSON.stringify({status:false, message:'A book with this title by same author already exists.'}));
    return;
  }
  dataObject.name = requestBody.title;
  dataObject.author = requestBody.author;

  //save all data left, no need to check
  dataObject.store = requestBody.store;
  dataObject.oriLan = requestBody.original_language;
  dataObject.lang = requestBody.language;


  //save data in DB
  await db.saveBook(dataObject);

  res.send(JSON.stringify({status:true, message:'Got it, thanks'}));
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

  const isbn = requestBody.isbn || null,
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

app.listen(config.PORT);
