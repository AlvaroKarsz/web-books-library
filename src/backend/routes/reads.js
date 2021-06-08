const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);

module.exports = (app) => {
  app.get('/reads', async (req, res) =>  {
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

    let request = await db.fetchAllReads(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      type: "Read List",
      route: 'reads',
      imageHref: '/reads/'
    }));
  });

  app.get('/reads/:id', async (req, res) =>  {
    const id =  req.params.id;

    /*check if ID actually exists*/
    if(! await db.bookExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error loading read book page.\nBook ID does not exists in DB, ID: " + id
      });

      res.redirect(basic.buildRefererUrl('/reads/', "Book doesn't exist"));
      /*exit*/
      return;
    }

    /*use pagination seed*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    readData = await db.fetchReadById(id, filters, 'read');

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      displayer: entryDisplayer.build(readData, settings.BOOKS_FOLDER_NAME, {
        fetchRating: true,
        fetchCover: true,
        fetchDescription: true,
        fetchAsin: true,
        fetchTags: true
      })
    }));
  });

  /*send details by ID*/
  app.get('/get/reads/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*check if ID actually exists*/
    if(! await db.bookExists(id) ) {
      /*return error message to main page*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error fetching read book info.\nBook ID does not exists in DB, ID: " + id
      });

      res.send(null);
      /*exit*/
      return;
    }
    res.send(
      await db.fetchReadById(id)
    );
  });


  app.get('/reads/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;

    /*set the seed before the pagination, if not the "next" values will be random and repeated*/
    await db.setSeed(basic.getGlobalParam(settings.POSTGRESQL_SEED_PARAMETER_NAME));

    let request = await db.fetchAllReads(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  /*route to change picture*/
  app.post('/reads/:id/newPic', async (req, res) => {
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
          text: "Error Changing cover picture for read book ID " + id + ".\nNo cover received"
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
        text: "Cover was changed for read book ID " + id
      });

      res.send(
        JSON.stringify(true)
      );
    } catch(err) {
      /*error saving picture*/

      /*log error*/
      logger.log({
        type: 'error',
        text: "Error Changing cover picture for read book ID " + id + ".\nError - " + err
      });

      res.send(
        JSON.stringify(false)
      );
    }

  });


}
