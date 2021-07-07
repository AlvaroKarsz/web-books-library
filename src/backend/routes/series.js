const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);


module.exports = (app) => {

  app.get('/series', async (req, res) =>  {
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

    let request = await db.fetchAllSeries(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.SERIES_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      typeTitle: "My Series",
      route: 'series',
      imageHref: '/series/',
      htmlTitle: 'My Series'
    }));
  });

  app.get('/series/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;

    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllSeries(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  app.get('/serieList', async (req, res) => {
    /*fetch all series from DB and send it to user*/
    res.send(
      JSON.stringify(
        await db.fetchSeriesForHtml()
      )
    );
  });


  app.get('/series/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*check if ID actually exists*/
    if(! await db.serieExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading seire page.\nSerie ID does not exists in DB, ID: " + id
      });


      res.redirect(basic.buildRefererUrl('/series/', "Serie doesn't exist"));
      /*exit*/
      return;
    }

    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    serieData = await db.fetchSerieById(id, filters);

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.SERIES_FOLDER_NAME,
      htmlTitle: 'My Series | ' + serieData.name,
      typeTitle: "My Series",
      displayer: entryDisplayer.build(serieData, settings.SERIES_FOLDER_NAME, {
        fetchCover: true,
        fetchRating: true,
        fetchTags: true,
        delete: true,
        reddit: true,
        findFromSerie:true
      })
    }));
  });

  app.get('/insert/series/:id?', async (req, res) =>  {
    /*
    if id exists - the serie already exists, and is been updated
    if id doesn't exists - this is a new serie

    frontend will handle with this id and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_INSERT_SERIE_FILE_NAME,
      typeTitle: "Insert Serie",
      pageTitle: id ? 'Edit Serie' : 'Enter New Serie' //if id exists - the page will load id's info
    }));
  });

  /*fetch serie data by serie id*/
  app.get('/get/series/:id', async(req, res) => {
    let id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.serieExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching seire info.\nSerie ID does not exists in DB, ID: " + id
      });

      res.send(null);
      /*exit*/
      return;
    }
    res.send(
      await db.fetchSerieById(id)
    );
  });


  app.post('/save/serie', async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)), /*request body*/
    /*save cover in another variable, and remove from requestBody*/
    cover = requestBody.cover;
    requestBody.cover = null;
    /*
    this route can be called in 2 different cases:
    1) insert a new serie (default case).
    2) alter an existsing serie, in this case requestBody.id will contain the existing serie id

    notes:
    in case 2), some unique checks will fail, so pass the existing id as excluded
    */
    let existingId = requestBody.id || null;

    /*make sure this serie has an unique title<->author combination*/
    if(await db.checkIfSerieAuthorAndTitleExistsInSeriesList(requestBody.title,requestBody.author, existingId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Serie.\nSerie with same title ${requestBody.title}, by same author ${requestBody.author} already exists in DB.`
      });

      res.send(JSON.stringify({status:false, message:'A serie with this title by same author already exist.'}));
      return;
    }

    //save data in DB
    let newSerieId = '';//save here serie id

    if(existingId) {
      /*existing serie - alter it*/
      await db.alterSerieById(existingId, requestBody);

      newSerieId = existingId;/*no new book ID*/

      /*log action*/
      logger.log({
        text: `Serie info was altered.\Serie id: ${existingId}`
      });

    }  else {
      /*new serie to save*/
      await db.saveSerie(requestBody);

      /*get new serie ID from DB*/
      newSerieId = await db.getSerieIdFromTitleAndAuthor(requestBody.title, requestBody.author);

      /*log action*/
      logger.log({
        text: `New serie was saved.\nTitle: ${requestBody.title}\nAuthor: ${requestBody.author}`
      });

    }


    /*
    now save cover if any
    if a serie is been altered - the old picture may be overwrited
    */
    if(cover) {
      let picPath = await imagesHandler.saveImage(cover, settings.SERIES_PATH, newSerieId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: newSerieId,
        folder: settings.SERIES_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });
    }

    //return sucess message, and the new serie's link
    res.send(JSON.stringify({status:true, redirect:`/series/${newSerieId}`}));
  });

  /*route to change picture*/
  app.post('/series/:id/newPic', async (req, res) => {
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
          text: "Error Changing cover picture for serie ID " + id + ".\nNo cover received"
        });

        res.send(
          JSON.stringify(false)
        );
        return;
      }
    }

    try {
      /*save the new picture*/
      let picPath = await imagesHandler.saveImage(pic,settings.SERIES_PATH , id, mime ? {/*save picture and get the full path (in order to get picture md5)*/
        noModification:true,
        mime: mime.split('/').pop() /*get last part, extension type*/
      } : {});
      /*now save md5 in DB*/
      await db.savePictureHashes({
        id: id,
        folder: settings.SERIES_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });

      /*log action*/
      logger.log({
        text: "Cover was changed for serie ID " + id
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Changing cover picture for serie ID " + id + ".\nError - " + err
      });

      res.send(
        JSON.stringify(false)
      );
    }

  });

  /*check if this serie is not linked to anything then delete it*/
  app.get('/series/delete/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    /*make sure serie has no books or wishes linked to it*/
    if( basic.toInt( await db.getBooksCountFromSerie(id) ) || basic.toInt( await db.getWishesCountFromSerie(id) ) ) {
      /*send error*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Deleting serie from DB\nBooks/Wishlists are linked to this serie\nThese links must be removed before deleting this serie"
      });

      message += 'Books/Wishes are linked to this serie, delete them and try again';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*delete md5sum from cache*/
    await db.deleteMD5(settings.SERIES_FOLDER_NAME,id);
    /*delete wish*/
    await db.deleteSerie(id);
    /*delete picture*/
    await imagesHandler.deleteImage(settings.SERIES_FOLDER_NAME,id);


    /*log action*/
    logger.log({
      text: "Serie ID " + id + " was deleted."
    });

    /*redirect with success message*/
    message += 'Serie was Deleted';
    /*redirect to main page, the serie no longer exist, no point redirecting to it*/
    res.redirect(basic.buildRefererUrl('/series/', message, false));
    return;
  });


  /*route to change rating*/
  app.get('/series/rating/change/:id', async (req, res) => {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ratings for a book Series.\nInvalid Serie ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch Rating, Invalid Serie ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveSerieRating(id) ) {
      /*error finding new rating*/

      /*saveBookRating function will log the error*/
      message += 'Could not fetch Rating, Generic Error';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/

      /*log action*/
      logger.log({
        text: `New ratings were fetched for Serie ID ${id}`
      });

      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });

  /*route to save tags*/
  app.get('/series/tags/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new Tags for a Serie.\nInvalid Serie ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch Tags, Invalid Serie ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch & save tags*/
    await db.saveSerieTags(id);

    /*log action*/
    logger.log({
      text: `New tags were fetched for a Serie.\nSerie ID: ${id}.`
    });

    /*return success*/
    message += 'New Tags were saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

}
