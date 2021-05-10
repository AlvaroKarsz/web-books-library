const settings = require('../settings.js');
const db = require(settings.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const entryDisplayer = require(settings.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH);
const htmlRender = require(settings.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH);


module.exports = (app) => {

  app.get('/purchased', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;
    let request = await db.fetchAllPurchased(filters);
    const books = request.rows;
    const total = request.count;

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_MAIN_FILE_NAME,
      folder: settings.WISH_LIST_FOLDER_NAME,
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      type: "Purchased List",
      route: 'purchased',
      imageHref: '/purchased/'
    }));
  });

  app.get('/purchased/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    wishData = await db.fetchWishById(id, filters, 'purchase');

    res.send(await htmlRender.render({
      html: settings.SOURCE_CODE_HTML_DISPLAY_FILE_NAME,
      folder: settings.WISH_LIST_FOLDER_NAME,
      displayer: entryDisplayer.build(wishData, settings.WISH_LIST_FOLDER_NAME, {received:true, cancelPurchase: true})
    }));
  });


  app.get('/purchased/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = nextVal;
    let request = await db.fetchAllPurchased(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, settings.IMAGES_NUM_PER_PAGE)
    }));
  });

  /*route to cancel wish purchased mark*/
  app.get('/purchased/read/cancel/:id', async (req, res) =>  {
    const id =  req.params.id;
    await db.cancelPurchaseMark(id);
    res.redirect('/wishlist/' + id);
  });

}
