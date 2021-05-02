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
      displayer: entryDisplayer.build(storyData, 'stories', {storyRead: true})
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
    let file = fs.readFileSync(path.join(__dirname, '..', '..', 'html', 'insertStory.html'), 'UTF8');
    res.send(await basic.renderHtml({
      html: file,
      folder: '',
      totalCount: '',
      objects: '',
      urlParams: '',
      title: '',
      route: '',
      pageTitle: id ? 'Edit Story' : 'Enter New Story' //if id exists - the page will load id's info
    }));
  });

  /*fetch serie data by serie id*/
  app.get('/get/story/:id', async(req, res) => {
    let id = req.params.id;
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
      res.send(JSON.stringify({status:false, message:'Invalid Pages'}));
      return;
    }

    /*make sure collection id is a valid integer*/
    if(!basic.isValidInt(requestBody.collectionId.value)) {
      res.send(JSON.stringify({status:false, message:'Invalid Collection'}));
      return;
    }

    /*make sure the Collection exists*/
    if(! await db.checkIsCollectionIdExists(requestBody.collectionId.value)) {
      res.send(JSON.stringify({status:false, message:'Collection not exist'}));
      return;
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
      res.send(JSON.stringify({status:false, message:'Sum of stories pages exceeded collection number of pages.'}));
      return;
    }

    //save data in DB
    if(existingStoryId) {
      /*existing story - alter it*/
      await db.alterStoryById(existingStoryId, requestBody);
    }  else {
      /*new story to save*/
      await db.saveStory(requestBody);
    }


    /*
    now save covers if any
    if a wish is been altered - the old picture may be overwrited
    */
    if(cover) {
      const imagesHandler = require('../modules/images.js'),
      storyId = await db.getStoryIdFromDetails(requestBody),/*get new id, received when story saved in DB*/
      picPath = await imagesHandler.saveImage(cover,path.join(__dirname,'..','..','..','stories'), storyId);/*save picture and get the full path (in order to get picture md5)*/
      //now save md5 in DB
      await db.savePictureHashes({
        id: storyId,
        folder: 'stories',
        md5: imagesHandler.calculateMD5(picPath)
      });
    }
    res.send(JSON.stringify({status:true}));
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
      if( basic.isBiggerInt(pages, await db.getStoryPages(id) )) {

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
    res.redirect(referer);
  });

}
