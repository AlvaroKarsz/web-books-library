const basic = require('../modules/basic.js');
const config = require('../config.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {

  app.get('/wishlist', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = 0;
    let request = await db.fetchAllWishes(filters);
    const books = request.rows;
    const total = request.count;

    let file = fs.readFileSync(path.join(__dirname,'..' , '..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'wishlist',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Wish List",
      route: 'wishlist',
      imageHref: '/wishlist/'
    }));
  });

  /*
  id is the wish list id
  open wish-displayer page
  */
  app.get('/wishlist/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    wishData = await db.fetchWishById(id, filters, 'wish');

    let file = fs.readFileSync(path.join(__dirname, '..' ,'..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: wishData.name,
      folder: 'wishlist',
      id: id,
      displayer: entryDisplayer.build(wishData, 'wishlist', {})
    }));
  });

  app.post('/wishlist/purchased/:id', async (req, res) =>  {
    /*get wish id from url*/
    const id = req.params.id;
    /*get store name from post body*/
    let store = req.body.store;


    /*invalid store - redirect to referer with error message*/

    if(!store || !store.trim()) {
      /*get full url referer*/
      let referer = req.headers.referer,
      /*create error message*/
      errorIndicator = 'err-msg=Invalid Store';
      /*add param to indicate - error message*/
      if(referer.indexOf('?') === -1) {//no query params, add the first one
        referer += '?' + errorIndicator;
      } else {//query params exists - add a new one
        referer += '&' + errorIndicator;
      }
      res.redirect(referer);
      return;
    }
    /*valid store - save in DB and redirect to wishlist main page*/
    await db.markWishAsPurchased(id,store);
    res.redirect('/wishlist');
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

  app.get('/insert/wish', async (req, res) => {
    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'insertWish.html'), 'UTF8');
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
      const imagesHandler = require('../modules/images.js'),
      wishId = await db.getWishIdFromISBN(requestBody.isbn),/*get new id, received when wish saved in DB*/
      picPath = await imagesHandler.saveImage(cover,path.join(__dirname,'..','..','..','wishlist'), wishId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: wishId,
        folder: 'wishlist',
        md5: imagesHandler.calculateMD5(picPath)
      });
    }
    res.send(JSON.stringify({status:true}));
  });


}
