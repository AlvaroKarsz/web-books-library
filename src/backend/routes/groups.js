const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);


module.exports = (app) => {

  app.get('/groups', async (req, res) =>  {
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

    let request = await db.fetchAllGroups(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.GROUPS_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      typeTitle: "My Groups",
      route: 'groups',
      imageHref: '/groups/',
      htmlTitle: 'My Groups'
    }));
  });

  app.get('/insert/groups/:id?', async (req, res) => {
    /*
    id cases:
    not exists -> insert a new group
    id is an intiger -> edit an existing group

    frontend will handle with id parameter and fetch relevant data
    use this param in order to set the html page title
    */
    const id = req.params.id;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_INSERT_GROUP_FILE_NAME,
      typeTitle: 'Insert Group',
      pageTitle: id ? 'Edit Group' : 'Enter New Group' //if id exists - the page will load id's info
    }));
  });

  //save a new group / edit an existing one
  app.post('/save/group', async (req, res) => {
    let requestBody = basic.formDataToJson(basic.trimAllFormData(req.body)), /*request body*/
    /*save cover in another variable, and remove from requestBody*/
    cover = requestBody.cover;
    requestBody.cover = null;
    /*
    this route can be called in 2 different cases:
    1) insert a new group (default case).
    2) alter an existsing group, in this case requestBody.id will contain the existing group id

    notes:
    in case 2), some unique checks will fail, so pass the existing id as excluded
    */
    let existingId = requestBody.id || null;

    /*make sure group name in unique*/
    if(await db.checkIfGroupNameExist(requestBody.title, existingId)) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error Saving new Group.\nGroup with same title ${requestBody.title} already exists in DB.`
      });

      res.send(JSON.stringify({status:false, message:'A group with this title already exist.'}));
      return;
    }

    //save data in DB
    let newGroupId = '';//save here serie id

    if(existingId) {
      /*existing group - alter it*/
      await db.alterGroupById(existingId, requestBody);

      newGroupId = existingId;/*no new book ID*/

      /*log action*/
      logger.log({
        text: `Group info was altered.\nGroup id: ${existingId}`
      });

    }  else {
      /*new group to save*/
      await db.saveGroup(requestBody);

      /*get new group ID from DB*/
      newGroupId = await db.getGroupdFromTitle(requestBody.title);

      /*log action*/
      logger.log({
        text: `New group was saved.\nTitle: ${requestBody.title}`
      });

    }


    /*
    now save cover if any
    if a group is been altered - the old picture may be overwriten
    */
    if(cover) {
      let picPath = await imagesHandler.saveImage(cover, settings.GROUPS_PATH, newGroupId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: newGroupId,
        folder: settings.GROUPS_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });
    }

    //return sucess message, and the new group's link
    res.send(JSON.stringify({status:true, redirect:`/groups/${newGroupId}`}));
  });


  app.get('/groups/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*check if ID actually exists*/
    if(! await db.groupExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading group page.\nGroup ID does not exists in DB, ID: " + id
      });


      res.redirect(basic.buildRefererUrl('/groups/', "Group doesn't exist"));
      /*exit*/
      return;
    }

    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    /*fetch from DB the group info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    groupData = await db.fetchGroupById(id, filters);

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.GROUPS_FOLDER_NAME,
      htmlTitle: 'My Groups | ' + groupData.name,
      typeTitle: "My Groups",
      displayer: entryDisplayer.build(groupData, settings.GROUPS_FOLDER_NAME, {
        fetchCover: true,
        fetchRating: true,
        delete: true,
        addMembers: true
      })
    }));
  });

  app.get('/groups/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;

    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllGroups(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  /*delete this group and remove from all group arrays*/
  app.get('/groups/delete/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    /*delete md5sum from cache*/
    await db.deleteMD5(settings.GROUPS_FOLDER_NAME,id);

    /*clear group*/
    await db.clearGroup(id);
    /*delete group*/
    await db.deleteGroup(id);
    /*delete picture*/
    await imagesHandler.deleteImage(settings.GROUPS_FOLDER_NAME,id);


    /*log action*/
    logger.log({
      text: "Group ID " + id + " was deleted."
    });

    /*redirect with success message*/
    message += 'Group was Deleted';
    /*redirect to main page, the serie no longer exist, no point redirecting to it*/
    res.redirect(basic.buildRefererUrl('/groups/', message, false));
    return;
  });

  /*route to change rating*/
  app.get('/groups/rating/change/:id', async (req, res) => {
    const id =  req.params.id;

    /*incoming URL*/
    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';

    if(!id) {

      /*log error*/
      logger.log({
        type: 'error',
        text: `Error fetching new ratings for a Group.\nInvalid Group ID: ${id}`
      });

      /*send error*/
      message += 'Could not fetch Rating, Invalid Group ID';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }
    /*fetch new rating and save in DB*/
    if(! await db.saveGroupRating(id) ) {
      /*error finding new rating*/

      /*saveBookRating function will log the error*/
      message += 'Could not fetch Rating, Generic Error';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    } else {
      /*success*/

      /*log action*/
      logger.log({
        text: `New ratings were fetched for Group ID ${id}`
      });

      message += 'New Rating was saved';//add message
      res.redirect(basic.buildRefererUrl(referer, message, false));
    }
  });

  /*fetch group data by group id*/
  app.get('/get/groups/:id', async(req, res) => {
    let id = req.params.id;

    /*check if ID actually exists*/
    if(! await db.groupExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching seire info.\nGroup ID does not exists in DB, ID: " + id
      });

      res.send(null);
      /*exit*/
      return;
    }
    res.send(
      await db.fetchGroupById(id)
    );
  });

  /*insert boot to group*/
  app.post('/groups/memberAdd', async(req, res) => {
    let requestBody = basic.formDataToJson(req.body);

    let referer = req.headers.referer,
    /*get param to indicate error*/
    message = '';



    //validate data
    let groupID = requestBody.group,
    bookID = requestBody.id,
    bookType = requestBody.type;


    if(! await db.groupExists(groupID) ) {

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error adding a book to a group.\nGroup ID does not exists in DB, ID: " + groupID
      });

      /*send error*/
      message += 'Could not add book to group, unknown group.';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;
    }

    switch(bookType) {
      case 'books':
      if(! await db.bookExists(bookID) ){
        /*log error*/
        logger.log({
          type: 'error',
          text: "Error adding a book to a group.\nUnknown book ID: " + bookID
        });

        /*send error*/
        message += 'Could not add book to group, unknown book.';//add error
        res.redirect(basic.buildRefererUrl(referer, message));
        return;
      }
      break;

      case 'wishlist':
      if(! await db.wishExists(bookID) ){
        /*log error*/
        logger.log({
          type: 'error',
          text: "Error adding a book to a group.\nUnknown wish ID: " + bookID
        });

        /*send error*/
        message += 'Could not add book to group, unknown book.';//add error
        res.redirect(basic.buildRefererUrl(referer, message));
        return;
      }

      break;

      case 'stories':
      if(! await db.storyExists(bookID) ){
        /*log error*/
        logger.log({
          type: 'error',
          text: "Error adding a book to a group.\nUnknown story ID: " + bookID
        });

        /*send error*/
        message += 'Could not add book to group, unknown book.';//add error
        res.redirect(basic.buildRefererUrl(referer, message));
        return;
      }

      break;

      default:

      logger.log({
        type: 'error',
        text: "Error adding a book to a group.\nUnknown book type: " + bookType
      });

      /*send error*/
      message += 'Could not add book to group, unknown book type.';//add error
      res.redirect(basic.buildRefererUrl(referer, message));
      return;

      break;
    }

    //add book to group
    await db.insertToGroup(bookType, bookID, groupID);

    //log and exit
    logger.log({
      type: 'message',
      text: `Book ${bookID} (${bookType}) was added to group ${groupID}`
    });

    message += 'Book added to group';
    res.redirect(basic.buildRefererUrl(referer, message, false));
  });

  /*route to change picture*/
  app.post('/groups/:id/newPic', async (req, res) => {
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
          text: "Error Changing cover picture for Group ID " + id + ".\nNo cover received"
        });

        res.send(
          JSON.stringify(false)
        );
        return;
      }
    }

    try {
      /*save the new picture*/
      let picPath = await imagesHandler.saveImage(pic,settings.GROUPS_PATH , id, mime ? {/*save picture and get the full path (in order to get picture md5)*/
        noModification:true,
        mime: mime.split('/').pop() /*get last part, extension type*/
      } : {});
      /*now save md5 in DB*/
      await db.savePictureHashes({
        id: id,
        folder: settings.GROUPS_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });

      /*log action*/
      logger.log({
        text: "Cover was changed for Group ID " + id
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Changing cover picture for group ID " + id + ".\nError - " + err
      });

      res.send(
        JSON.stringify(false)
      );
    }

  });

}
