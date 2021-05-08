const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);
const imagesHandler = require(settings.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH);


module.exports = (app) => {

  app.get('/series', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;
    let request = await db.fetchAllSeries(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.SERIES_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      type: "Series",
      route: 'series',
      imageHref: '/series/'
    }));
  });

  app.get('/series/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;
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
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    serieData = await db.fetchSerieById(id, filters);

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.SERIES_FOLDER_NAME,
      displayer: entryDisplayer.build(serieData, settings.SERIES_FOLDER_NAME, {})
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
      pageTitle: id ? 'Edit Serie' : 'Enter New Serie' //if id exists - the page will load id's info
    }));
  });

  /*fetch serie data by serie id*/
  app.get('/get/serie/:id', async(req, res) => {
    let id = req.params.id;
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
      res.send(JSON.stringify({status:false, message:'A serie with this title by same author already exist.'}));
      return;
    }

    //save data in DB

    if(existingId) {
      /*existing serie - alter it*/
      await db.alterSerieById(existingId, requestBody);
    }  else {
      /*new serie to save*/
      await db.saveSerie(requestBody);
    }


    /*
    now save cover if any
    if a serie is been altered - the old picture may be overwrited
    */
    if(cover) {
      serieId = await db.getSerieIdFromTitleAndAuthor(requestBody.title, requestBody.author),/*get new id, received when serie saved in DB*/
      picPath = await imagesHandler.saveImage(cover, settings.SERIES_PATH, serieId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: serieId,
        folder: settings.SERIES_FOLDER_NAME,
        md5: imagesHandler.calculateMD5(picPath)
      });
    }
    res.send(JSON.stringify({status:true}));
  });

}
