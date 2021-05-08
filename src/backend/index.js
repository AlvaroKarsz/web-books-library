const express = require('express');
const app = express();
const fs = require("fs");
const path = require("path");
const settings = require('./settings.js');

const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileupload());

/*
require all routes in routes directory
*/
fs.readdirSync(settings.SOURCE_CODE_BACKEND_ROUTES_PATH).forEach((file) => {

  require(
    path.join(settings.SOURCE_CODE_BACKEND_ROUTES_PATH, file)
  )(app);

});


/*listen at current local IP address*/
app.listen(
  settings.APP_PORT,
  basic.getLocalIpAddress()
);
