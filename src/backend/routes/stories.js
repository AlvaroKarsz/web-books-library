const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);
const googleSearcher = require(settings.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_PATH);

module.exports = (app) => {

  app.get('/stories', async (req, res) =>  {
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

    let request = await db.fetchAllStories(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.STORIES_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      typeTitle: "My Stories",
      route: 'stories',
      imageHref: '/stories/',
      htmlTitle: 'My Stories'
    }));
  });

  app.get('/stories/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;

    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllStories(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });


  app.get('/stories/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*check if ID actually exists*/
    if(! await db.storyExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading story's page.\nStory ID does not exists in DB, ID: " + id
      });

      res.redirect(basic.buildRefererUrl('/stories/', "Story doesn't exist"));
      /*exit*/
      return;
    }
    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    storyData = await db.fetchStoryById(id, filters);

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.STORIES_FOLDER_NAME,
      htmlTitle: 'My Stories | ' + storyData.name,
      typeTitle: "My Stories",
      displayer: entryDisplayer.build(storyData, settings.STORIES_FOLDER_NAME, {
        storyRead: true,
        fetchCover: true,
        fetchRating: true,
        reddit: true,
        fetchAsin: true,
        fetchDescription: true,
        similarBooks: true,
        booksByAuthor: true
      })
    }));
  });

  app.get('/insert/stories/:id?', async (req, res) =>  {
    /*
    if id exists - the story already exists, and is been updated
    if id doesn't exists - this is a new story

    frontend will handle with this id and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;

    res.send(await htmlRender.render({
      typeTitle: "Insert Story",
      html: settings.SOURCE_CODE_HTML_INSERT_STORY_FILE_NAME,
      pageTitle: id ? 'Edit Story' : 'Enter New Story' //if id exists - the page will load id's info
    }));
  });

  /*fetch serie data by serie id*/
  app.get('/get/stories/:id', async(req, res) => {
    let id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.storyExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching story's info.\nStory ID does not exists in DB, ID: " + id
      });

      res.send(null);
      /*exit*/
      return;
    }
    res.send(
      await db.fetchStoryById(id)
    );
  });

  app.post('/save/story', async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)), /*request body*/
    /*save cover in another variable, and remove from requestBody*/
    cover = requestBody.cover;
    requestBody.cover = null;
    /*
    this route can be called in 2 different cases:
    1) insert a new story (default case).
    2) alter an existsing story, in this case requestBody.id will contain the existing book id

    notes:
    in case 2), some unique checks will fail, so pass the existing id as excluded
    */

    let existingStoryId = requestBody.id || null;

    //check book pages validity
    if( !basic.isValidInt(requestBody.pages) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Story.\nInvalid number of pages: ${requestBody.pages}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Pages'}));
      return;
    }

    /*make sure collection id is a valid integer*/
    if(!basic.isValidInt(requestBody.collectionId.value)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Story.\nInvalid Collection ID (Story's parent): ${requestBody.collectionId.value}`
      });

      res.send(JSON.stringify({status:false, message:'Invalid Collection'}));
      return;
    }

    /*make sure the Collection exists*/
    if(! await db.checkIsCollectionIdExists(requestBody.collectionId.value)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Story.\nCollection ID (Story's parent): ${requestBody.collectionId.value} Doesn't exists in DB`
      });

      res.send(JSON.stringify({status:false, message:'Collection not exist'}));
      return;
    }

    /*if this story is part of serie - check serie parameters*/
    if(requestBody.serie) {
      /*both serie value (serie's id) and seire pages should be a valid integer - validate it*/
      if(!basic.isValidInt(requestBody.serie.value)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new story.\nInvalid Serie ID: ${requestBody.serie.value}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Serie'}));
        return;
      }
      if(!basic.isValidInt(requestBody.serie.number)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new serie.\nInvalid Location in Serie\nSerie ID:${requestBody.serie.value}, Location: ${requestBody.serie.number}`
        });

        res.send(JSON.stringify({status:false, message:'Invalid Number in Serie'}));
        return;
      }
      /*make sure the serie ID actualy exist*/
      if(! await db.checkIsSerieIdExists(requestBody.serie.value)) {
        /*log error*/
        logger.log({
          type: 'error',
          text: `Error Saving new story.\nReceived Serie ID doesn't exists in DB.\nSerie ID: ${requestBody.serie.value}`
        });

        res.send(JSON.stringify({status:false, message:'Serie not exist'}));
        return;
      }
      /*check if the number in serie is already taken*/
      let serieNumFromDB = await db.serieNumExist(requestBody.serie.value, requestBody.serie.number);

      if(serieNumFromDB) {
        /*
        serie num exists, allow only in the following case:
        the spot is taken by this story (that is been altered)
        */

        if(! (serieNumFromDB.type && serieNumFromDB.type === 'story' && serieNumFromDB.id && serieNumFromDB.id === basic.toInt(existingStoryId))) {
          /*log error*/
          logger.log({
            type: 'error',
            text: `Error Saving new story.\nStory is a part of series, and location in serie is already taken\nSelected serie ID: ${requestBody.serie.value}\nLocation: ${requestBody.serie.number}`
          });

          res.send(JSON.stringify({status:false, message:'Number in serie is already taken'}));
          return;
        }
      }
    }



    /*
    Story author can be empty - in this case the author will be the same as collection author
    fetch collection author.
    if:
    * requestBody.author is empty
    * requestBody.author is equal to collection's author
    ignore story author
    */

    /*fetch collection author + number of collection pages(will be used to validate sotry pages)*/

    let collectionAuthorAndPages = await db.getAuthorAndPagesById(requestBody.collectionId.value);


    if(basic.insensitiveCompare(collectionAuthorAndPages.author,requestBody.author)) {
      requestBody.author = null;
      if(!requestBody.author) {
        requestBody.actualAuthor = collectionAuthorAndPages.author;//save param in main object - DB will use it while inserting the new story/updating the existing one
      } else {
        requestBody.actualAuthor = requestBody.author;
      }
    } else {
      requestBody.actualAuthor = requestBody.author;
    }

    /*make sure this author<->title<->pages combination is unique*/
    if(await db.checkIfStoryAuthorAndTitleAndPagesExistsInStoriesList(requestBody.title,requestBody.author, requestBody.pages, existingStoryId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Story.\nA story with same title (${requestBody.title}), by same author(${requestBody.author}) , wish same number of pages (${requestBody.pages}) already exists in DB.`
      });

      res.send(JSON.stringify({status:false, message:'A story with this title by same author already exist.'}));
      return;
    }

    /*
    now validate number of pages in relation to collection
    all stories pages should not be bigger than total number of collection pages
    */

    /*
    * get sum of stories pages (not including this one (if is been updated))
    * sum the pages sum with this story pages
    * make sure this number is not bigger than collection pages
    */

    if(basic.intSum(
      requestBody.pages ,
      await db.getStoriesPagesSumFromCollection(requestBody.collectionId.value , existingStoryId )
    ) > basic.toInt(collectionAuthorAndPages.pages) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Story.\nThe sum of all stories pages (including the new one inserted) exceeded collection total number of pages ${collectionAuthorAndPages.pages}.`
      });

      res.send(JSON.stringify({status:false, message:'Sum of stories pages exceeded collection number of pages.'}));
      return;
    }

    //save data in DB

    let newStoryId = '';//save here story id

    if(existingStoryId) {
      /*existing story - alter it*/
      await db.alterStoryById(existingStoryId, requestBody);

      newStoryId = existingStoryId;/*no new wish ID*/

      /*log action*/
      logger.log({
        text: `Story was altered.\nStory id: ${existingStoryId}`
      });

    }  else {
      /*new story to save*/
      await db.saveStory(requestBody);

      /*get new story ID from DB*/
      newStoryId = await db.getStoryIdFromDetails(requestBody);

      /*log action*/
      logger.log({
        text: `New story was saved.\nTitle: ${requestBody.title}\nAuthor: ${requestBody.author}\nCollection ID: ${requestBody.collectionId.value}`
      });

    }


    /*
    now save covers if any
    if a wish is been altered - the old picture may be overwrited
    */
    if(cover) {
      let picPath = await imagesHandler.saveImage(cover,settings.STORIES_PATH, newStoryId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: newStoryId,
        folder: settings.STORIES_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });
    }

    //return sucess message, and the new story's link
    res.send(JSON.stringify({status:true, redirect:`/stories/${newStoryId}`}));
  });

  app.post('/stories/read/:id', async (req, res) => {
    /*change story status to "read"*/

    /*get story id from url*/
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

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error marking story as Read\nInvalid read date.\nStory ID: ${id}`
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

    /*if story was not completed - check pages*/
    if(!completedFlag) {
      pages = pages.trim();//remove white spaces
      if(!basic.isValidInt(
        basic.toInt(pages)
      )) {/*invalid pages number*/

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error marking story as partly Read\nInvalid number of read pages.\nStory ID: ${id}\nRead pages: ${pages}`
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

      /*number of read pages is bigger than story total pages*/
      const storyPages = await db.getStoryPages(id);

      if( basic.isBiggerInt(pages, storyPages)) {

        /*log error*/
        logger.log({
          type: 'error',
          text: `Error marking story as partly Read\nNumber of read pages is bigger than story.\nStory ID: ${id}\nRead pages: ${pages}\nTotal story pages: ${storyPages}`
        });

        errorMessage += '=Number of Read Pages is Bigger than Total Story Pages';//add error
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
    await db.markStoryAsRead(id, date, pages);

    /*log action*/
    logger.log({
      text: `Story (ID: ${id}) was marked as Read.`
    });

    res.redirect(referer);
  });

  /*route to change rating*/
  app.get('/stories/rating/change/:id', async (req, res) => {
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
        text: `Error fetching new ratings for a story.\nInvalid Story ID: ${id}`
      });

      message += 'Could not fetch Rating, Invalid Story ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveStoryRating(id) ) {
      /*error finding new rating*/
      message += 'Could not fetch Rating, Generic Error';//add error

      /*saveStoryRating function will log the error*/
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/

      /*log action*/
      logger.log({
        text: `New ratings were fetched for Story ID ${id}`
      });

      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });

  /*route to change description*/
  app.post('/stories/description/change', async (req, res) => {
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
        text: `Error changing description for a story.\nMissing data in request body.\Story ID: ${id}.\nDescription ${desc}.`
      });

      res.send(JSON.stringify(false));
      return;
    }

    /*update DB*/
    await db.changeStoryDescription(id, desc);

    /*log action*/
    logger.log({
      text: `Story description was changed for Story ID ${id}.`
    });


    /*send success message*/
    res.send(JSON.stringify(true));
    return;
  });

  /*route to change picture*/
  app.post('/stories/:id/newPic', async (req, res) => {
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
          text: `Error changing story's cover, no picture received.\nStory ID ${id}`
        });

        res.send(
          JSON.stringify(false)
        );
        return;
      }
    }

    try {
      /*save the new picture*/
      let picPath = await imagesHandler.saveImage(pic,settings.STORIES_PATH , id, mime ? {/*save picture and get the full path (in order to get picture md5)*/
        noModification:true,
        mime: mime.split('/').pop() /*get last part, extension type*/
      } : {});
      /*now save md5 in DB*/
      await db.savePictureHashes({
        id: id,
        folder: settings.STORIES_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });

      /*log action*/
      logger.log({
        text: `Cover picture was changed for Story ID ${id}.\nNew cover path: ${picPath}`
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error changing story's cover, Error: ${err}.\nStory ID ${id}`
      });


      res.send(
        JSON.stringify(false)
      );
    }

  });

  /*route to change asin, fetch and change*/
  app.get('/stories/asin/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Story.\nInvalid Story ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch ASIN, Invalid Book ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch title and author for the asin search*/
    let data = await db.fetchStoryById(id);

    /*if story author exists, use it*/
    data.author = data.story_author ? data.story_author : data.author;
    /*invalid data*/
    if(!data.name || !data.author) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ASIN for a Story.\nInvalid Story Title/Author.\nStory ID: ${id}, Title: ${data.name}, Author: ${data.author}`
      });

      message += 'Could not fetch ASIN, Invalid Story Name/Author';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    /*fetch asin*/
    let asin = await googleSearcher.getAsin(data.name, data.author);

    /*save in DB - in case of errors asin will be null, and the DB will null the value in relevant table*/
    await db.saveAsin(asin, id, 'stories');

    /*log action*/
    logger.log({
      text: `New ASIN number (${asin}) was saved for Story ID :${id}`
    });

    /*return success*/
    message += 'New ASIN was saved';//add message
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

}
