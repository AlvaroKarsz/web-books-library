const basic = require('../modules/basic.js');
const settings = require('../settings.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');

module.exports = (app) => {


  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname,'..', '..', '..', 'icons','logo.ico'));
  });

  app.get('/style', function (req, res) {
    res.sendFile(path.join(__dirname,'..', '..', 'style', 'style.css'));
  });

  app.get('/frontend/display', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'code.js'));
  });

  app.get('/frontend/common', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'common.js'));
  });

  app.get('/frontend/insertBook', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'insertBook.js'));
  });

  app.get('/frontend/insertSerie', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'insertSerie.js'));
  });

  app.get('/frontend/insertStory', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'insertStory.js'));
  });

  app.get('/frontend/markBookAsRead', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'markBookAsRead.js'));
  });

  app.get('/frontend/listDisplayer', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'listDisplayer.js'));
  });

  app.get('/frontend/insertWish', (req, res) => {
    res.sendFile(path.join(__dirname,'..', '..', 'frontend', 'insertWish.js'));
  });

  app.get('/pic/:picType/:picId', function (req, res) {
    let pictureId = req.params.picId, pictureType = req.params.picType;
    pictureType = basic.convertFolderType(pictureType);
    const picFullName = basic.getPictureMime(pictureType, pictureId);
    if(!picFullName) {//pic not exists - send blank picture
      res.sendFile(settings.BLANK_PIC_PATH);
    } else {
      res.sendFile(path.join(__dirname, '..', '..','..', pictureType, picFullName));
    }
  });


}
