const settings = require('../settings.js');
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const path = require('path');

module.exports = (app) => {


  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(settings.ICONS_PATH ,'logo.ico'));
  });

  app.get('/style', function (req, res) {
    res.sendFile(settings.SOURCE_CODE_STYLE_FILE_PATH);
  });

  app.get('/frontend/display', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_MAIN_FILE_PATH);
  });

  app.get('/frontend/common', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_COMMON_FILE_PATH);
  });

  app.get('/frontend/automatic', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_AUTOMATIC_FILE_PATH);
  });

  app.get('/frontend/insertBook', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_INSERT_BOOK_FILE_PATH);
  });

  app.get('/frontend/insertSerie', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_INSERT_SERIE_FILE_PATH);
  });

  app.get('/frontend/insertStory', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_INSERT_STORY_FILE_PATH);
  });

  app.get('/frontend/insertWish', (req, res) => {
    res.sendFile(settings.SOURCE_CODE_FRONTEND_INSERT_WISH_FILE_PATH);
  });

  app.get('/pic/:picType/:picId', function (req, res) {
    let pictureId = req.params.picId, pictureType = req.params.picType;
    pictureType = basic.convertFolderType(pictureType);
    const picFullName = basic.getPictureMime(pictureType, pictureId);
    if(!picFullName) {//pic not exists - send blank picture
      res.sendFile(settings.BLANK_PIC_PATH);
    } else {
      res.sendFile(path.join(settings.ROOT_PATH, pictureType, picFullName));
    }
  });

  app.get('/ebook/:id', function (req, res) {
    let eBookId = req.params.id;
      res.sendFile(path.join(settings.E_BOOKS_PATH , eBookId + '.pdf'));
  });

}
