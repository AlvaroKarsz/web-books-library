const basic = require('../modules/basic.js');
const config = require('../config.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');
const entryDisplayer = require('../gui/displayer.js');

module.exports = (app) => {

  app.get('/stories', async (req, res) =>  {
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = 0;
    let request = await db.fetchAllStories(filters);
    const books = request.rows;
    const total = request.count;

    let file = fs.readFileSync(path.join(__dirname, '..','..', 'html', 'main.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: 'stories',
      totalCount: total,
      objects: books,
      urlParams: urlParams,
      title: "Stories",
      route: 'stories',
      imageHref: '/stories/'
    }));
  });

  app.get('/stories/next/:val', async (req, res) =>  {
    const nextVal =  req.params.val;
    const urlParams = basic.getUrlParams(req.url);
    let filters = basic.getFilters(urlParams);
    filters.limit = config.IMAGES_NUM;
    filters.offset = nextVal;
    let request = await db.fetchAllStories(filters);
    res.send(JSON.stringify({
      books: request.rows,
      more: request.count > basic.intSum(nextVal, config.IMAGES_NUM)
    }));
  });


  app.get('/stories/:id', async (req, res) =>  {
    const id =  req.params.id;
    /*fetch from DB the wish info - pass to DB function filter in order to get the next and prev. id in this sort type(if any)*/
    let filters = basic.getFilters(basic.getUrlParams(req.url)),

    storyData = await db.fetchStoryById(id, filters);

    let file = fs.readFileSync(path.join(__dirname, '..' ,'..', 'html', 'display.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      title: storyData.name,
      folder: 'stories',
      id: id,
      displayer: entryDisplayer.build(storyData, 'stories', {})
    }));
  });


}
