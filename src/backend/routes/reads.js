const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);

module.exports = (app) => {
  app.get('/reads', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;
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
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    readData = await db.fetchReadById(id, filters, 'read');

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.BOOKS_FOLDER_NAME,
      displayer: entryDisplayer.build(readData, settings.BOOKS_FOLDER_NAME, {})
    }));
  });



  app.get('/reads/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;
    let request = await db.fetchAllReads(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

}
