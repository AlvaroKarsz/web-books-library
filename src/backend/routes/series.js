const basic = require('../modules/basic.js');
const config = require('../config.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {

  app.get('/series', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = 0;
    let request = await db.fetchAllSeries(filters);
    const books = request.rows;
    const total = request.count;

    let file = fs.readFileSync(path.join(__dirname, '..','..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'series',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Series",
      route: 'series',
      imageHref: '/series/'
    }));
  });

  app.get('/series/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = nextVal;
    let request = await db.fetchAllSeries(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
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
    let file = fs.readFileSync(path.join(__dirname, '..' ,'..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: serieData.name,
      folder: 'series',
      id: id,
      displayer: entryDisplayer.build(serieData, 'series', {})
    }));
  });


}
