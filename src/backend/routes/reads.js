const basic = require('../modules/basic.js');
const settings = require('../settings.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {
  app.get('/reads', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = settings.IMAGES_NUM_PER_PAGE;
    filters.offset = 0;
    let request = await db.fetchAllReads(filters);
    const books = request.rows;
    const total = request.count;

    let file = fs.readFileSync(path.join(__dirname, '..','..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'books',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Read List",
      route: 'reads',
      imageHref: '/reads/'
    }));
  });

  app.get('/reads/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    readData = await db.fetchReadById(id, filters, 'read');

    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: readData.name,
      folder: 'books',
      id: id,
      displayer: entryDisplayer.build(readData, 'books', {})
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
