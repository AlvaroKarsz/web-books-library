const basic = require('../modules/basic.js');
const settings = require('../settings.js');
const db = require('../db/functions');
const fs = require('fs');
const path = require('path');

module.exports = (app) => {

  /*if a request was made to root dir - redirect to books route*/
  app.get('/', async (req, res) =>  {
    res.redirect('books');
  });


  /*
    route to get display settings - number of covers per row, and number of covers per page
  */
  app.get('/display/settings', async (req, res) => {
    /*
    fetch display settings
    including: number of pictures per page
    including: number of pictures per row
    */
    res.send(JSON.stringify({
      perPage: settings.IMAGES_NUM_PER_PAGE,
      perRow: settings.BOOKS_PER_ROW
    }));
  });

}
