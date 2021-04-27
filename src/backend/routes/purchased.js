const basic = require('../modules/basic.js');
const config = require('../config.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {

  app.get('/purchased', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = 0;
    let request = await db.fetchAllPurchased(filters);
    const books = request.rows;
    const total = request.count;

    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'wishlist',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Purchased List",
      route: 'purchased',
      imageHref: '/purchased/'
    }));
  });

  app.get('/purchased/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    wishData = await db.fetchWishById(id, filters, 'purchase');

    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: wishData.name,
      folder: 'wishlist',
      id: id,
      displayer: entryDisplayer.build(wishData, 'wishlist', {received:true})
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

}
