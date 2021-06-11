const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const googleSearcher = require(settings.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_PATH);
const goodReadsAPI = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);

module.exports = (app) => {

  app.get('/wishlist', async (req, res) =>  {
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

    let request = await db.fetchAllWishes(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.WISH_LIST_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      type: "Wish List",
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

    /*check if ID actually exists*/
    if(! await db.wishExists(id) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading wishlist's page.\Wish ID does not exists in DB, ID: " + id
      });

      /*return error message to main page*/
      res.redirect(basic.buildRefererUrl('/wishlist/', "Book doesn't exist"));
      /*exit*/
      return;
    }

    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    wishData = await db.fetchWishById(id, filters, 'wish');

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.WISH_LIST_FOLDER_NAME,
      displayer: entryDisplayer.build(wishData, settings.WISH_LIST_FOLDER_NAME, {
        buy:true,
        received:true,
        search:true,
        delete: true,
        fetchCover: true,
        fetchDescription: true,
        fetchRating: true,
        fetchAsin: true,
        fetchTags: true,
        similarBooks: true,
        booksByAuthor: true
      })
    }));
  });

  app.post('/wishlist/purchased/:id', async (req, res) =>  {
    /*get wish id from url*/
    const id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.wishExists(id) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Marking wishlist as purchased.\nWish ID doesn't exists in DB, ID: " + id
      });

      /*return error message to main page*/
      res.redirect(basic.buildRefererUrl('/wishlist/', "Wish doesn't exist"));
      /*exit*/
      return;
    }

    /*get store name from post body*/
    let store = req.body.store;


    /*invalid store - redirect to referer with error message*/

    if(!store || !store.trim()) {

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Marking wishlist as purchased.\nInvalid store name: " + store
      });

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

    /*log action*/
    logger.log({
      text: "Wishlist was Marked as Purchased.\nWish ID: "  + id + ", store: " + store
    });

    res.redirect('/wishlist');
  });

  app.get('/wishlist/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;

    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllWishes(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  app.get('/insert/wishlist/:id?', async (req, res) => {
    /*
    if id exists - the wish already exists, and is been updated
    if id doesn't exists - this is a new wish
    frontend will handle with this id and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_INSERT_WISH_FILE_NAME,
      pageTitle: id ? 'Edit Wish' : 'Enter New Wish' //if id exists - the page will load id's info
    }));
  });

  app.post('/save/wish', async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)), /*request body*/
    /*save cover in another variable, and remove from requestBody*/
    cover = requestBody.cover;
    requestBody.cover = null;
    /*
    this route can be called in 2 different cases:
    1) insert a new wish (default case).
    2) alter an existsing wish, in this case requestBody.id will contain the existing book id

    notes:
    in case 2), some unique checks will fail (unique ISBN for example, if wasn't modified), so pass the existing id as excluded
    */
    let existingWishId = requestBody.id || null;

    /*check year validity*/
    if(basic.toInt(requestBody.year) > new Date().getFullYear() || ! basic.isValidInt(requestBody.year)) {
      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new wishlist.\nInvalid Year: ${requestBody.year}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Year'}));
      return;
    }
    /*if this book is part of serie - check serie parameters*/
    if(requestBody.serie) {
      /*both serie value (serie's id) and seire pages should be a valid integer - validate it*/
      if(!basic.isValidInt(requestBody.serie.value)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new wishlist.\nInvalid Serie ID: ${requestBody.serie.value}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Serie'}));
        return;
      }
      if(!basic.isValidInt(requestBody.serie.number)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new wishlist.\nInvalid Location in Serie\nSerie ID:${requestBody.serie.value}, Location: ${requestBody.serie.number}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Number in Serie'}));
        return;
      }
      /*make sure the serie ID actualy exist*/
      if(! await db.checkIsSerieIdExists(requestBody.serie.value)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new wishlist.\nReceived Serie ID doesn't exists in DB.\nSerie ID: ${requestBody.serie.value}`
        });

        res.send(JSON.stringify({status:false, message:'Serie not exist'}));
        return;
      }
      /*check if the number in serie is already taken*/
      if(await db.bookFromSerieExistsInWishList(requestBody.serie.value, requestBody.serie.number, existingWishId)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new wishlist.\Wishlist is a part of series, and location in serie is already taken\nSelected serie ID: ${requestBody.serie.value}\nLocation: ${requestBody.serie.number}`
        });

        res.send(JSON.stringify({status:false, message:'Number in serie is already taken'}));
        return;
      }
    }

    /*make sure isbn isn't taken*/
    if(await db.checkIfIsbnExistsInWishList(requestBody.isbn, existingWishId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new wishlist.\nISBN already exists in DB and should be unique.\nISBN: ${requestBody.isbn}`
      });

      res.send(JSON.stringify({status:false, message:'ISBN already exist in DB.'}));
      return;
    }

    /*make sure this book has an unique title, author combination*/
    if(await db.checkIfBookAuthorAndTitleAndYearExistsInWishList(requestBody.title,requestBody.author, requestBody.year, existingWishId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new wishlist.\nWishlist's Title + Author combination already exists.\nThis combination must be unique.\nTitle: ${requestBody.title}.\nAuthor: ${requestBody.author}`
      });

      res.send(JSON.stringify({status:false, message:'A book with this title by same author already exist.'}));
      return;
    }

    //save data in DB

    if(existingWishId) {
      /*existing book - alter it*/
      await db.alterWishById(existingWishId, requestBody);

      /*log action*/
      logger.log({
        text: `Wishlist was altered.\nWishlist id: ${existingWishId}`
      });

    }  else {
      /*new wish to save*/
      await db.saveWish(requestBody);

      /*log action*/
      logger.log({
        text: `New wishlist was saved.\nTitle: ${requestBody.title}\nAuthor: ${requestBody.author}\nISBN: ${requestBody.isbn}`
      });

    }


    /*
    now save covers if any
    if a wish is been altered - the old picture may be overwrited
    */
    if(cover) {
      wishId = await db.getWishIdFromISBN(requestBody.isbn),/*get new id, received when wish saved in DB*/
      picPath = await imagesHandler.saveImage(cover,settings.WISH_LIST_PATH , wishId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: wishId,
        folder: settings.WISH_LIST_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });
    }
    res.send(JSON.stringify({status:true}));
  });

  /*fetch book data by book id*/
  app.get('/get/wishlist/:id', async(req, res) => {
    let id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.wishExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching wishlist's data.\nWishlist ID does not exists in DB, ID: " + id
      });
      /*ret

      res.send(null);
      /*exit*/
      return;
    }
    res.send(
      await db.fetchWishById(id)
    );
  });

  app.get('/wishlist/delete/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';


    /*delete md5sum from cache*/
    await db.deleteMD5(settings.WISH_LIST_FOLDER_NAME,id);
    /*delete wish*/
    await db.deleteWish(id);
    /*delete picture*/
    await imagesHandler.deleteImage(settings.WISH_LIST_FOLDER_NAME,id);


    /*log action*/
    logger.log({
      text: "Wishlist ID " + id + " was deleted."
    });


    /*redirect with success message*/
    message += 'Wish was Deleted';
    /*redirect to main page, the wish no longer exist, no point redirecting to it*/
    res.redirect(basic.buildRefererUrl('/wishlist/', message, false));
    return;

  });

  /*route to change description*/
  app.post('/wishlist/description/change', async (req, res) => {
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
        text: `Error changing description for a wishlist.\nMissing data in request body.\nWishlist ID: ${id}.\nDescription ${desc}.`
      });

      res.send(JSON.stringify(false));
      return;
    }

    /*update DB*/
    await db.changeWishDescription(id, desc);

    /*log action*/
    logger.log({
      text: `Wishlist description was changed for wishlist ID ${id}.`
    });

    /*send success message*/
    res.send(JSON.stringify(true));
    return;
  });


  /*route to change rating*/
  app.get('/wishlist/rating/change/:id', async (req, res) => {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {
      /*send error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ratings for a wishlist.\nInvalid Wishlist ID: ${id}`
      });


      message += 'Could not fetch Rating, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveWishRating(id) ) {
      /*error finding new rating*/

      /*saveWishRating function will log the error*/
      message += 'Could not fetch Rating, Generic Error';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/

      /*log action*/
      logger.log({
        text: `New ratings were fetched for Wishlist ID ${id}`
      });

      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });

  /*route to change picture*/
  app.post('/wishlist/:id/newPic', async (req, res) => {
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
          text: `Error changing wishlist's cover, no picture received.\nWishlist ID ${id}`
        });

        res.send(
          JSON.stringify(false)
        );
        return;
      }
    }

    try {
      /*save the new picture*/
      let picPath = await imagesHandler.saveImage(pic,settings.WISH_LIST_PATH , id, mime ? {/*save picture and get the full path (in order to get picture md5)*/
        noModification:true,
        mime: mime.split('/').pop() /*get last part, extension type*/
      } : {});
      /*now save md5 in DB*/
      await db.savePictureHashes({
        id: id,
        folder: settings.WISH_LIST_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });

      /*log action*/
      logger.log({
        text: `Cover picture was changed for Wishlist ID ${id}.\nNew cover path: ${picPath}`
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error changing wishlist's cover, Error: ${err}.\nWishlist ID ${id}`
      });

      res.send(
        JSON.stringify(false)
      );
    }

  });

  /*route to change asin, fetch and change*/
  app.get('/wishlist/asin/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {
      /*send error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Wishlist.\nInvalid Wishlist ID: ${id}`
      });

      message += 'Could not fetch ASIN, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch title and author for the asin search*/
    let data = await db.fetchWishById(id);

    /*invalid data*/
    if(!data.name || !data.author) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Wishlist.\nInvalid Wishlist Title/Author.\nWishlist ID: ${id}, Title: ${data.name}, Author: ${data.author}`
      });


      message += 'Could not fetch ASIN, Invalid Book Name/Author';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch asin*/
    let asin = await googleSearcher.getAsin(data.name, data.author);

    /*save in DB - in case of errors asin will be null, and the DB will null the value in relevant table*/
    await db.saveAsin(asin, id, 'wish_list');

    /*log action*/
    logger.log({
      text: `New ASIN number (${asin}) was saved for Wishlist ID :${id}`
    });

    /*return success*/
    message += 'New ASIN was saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

  /*route to change tags, fetch and change*/
  app.get('/wishlist/tags/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {
      /*send error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new Tags for a Wishlist.\nInvalid Wishlist ID: ${id}`
      });

      message += 'Could not fetch Tags, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch title, author and ISBN for the tags search*/
    let data = await db.fetchWishById(id);

    /*invalid data*/
    if((!data.name && !data.author) || !data.isbn) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new Tags for a Wishlist.\nInvalid Wishlist Title/Author or Invalid ISBN.\nWishlist ID: ${id}, Title: ${data.name}, Author: ${data.author}, ISBN ${data.isbn}`
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
    await db.saveTags(tags, id, 'wish_list');

    /*log action*/
    logger.log({
      text: `New tags were fetched for a Wishlist.\nWishlist ID: ${id}.\nNew tags: ${tags}`
    });

    /*return success*/
    message += 'New Tags were saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

};
