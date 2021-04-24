var express = require('express');
var app = express();
const config = require('./config.js');
const basic = require('./modules/basic.js');
const bodyParser = require('body-parser');
const fileupload = require("express-fileupload");
const fs = require("fs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileupload());

/*
require all routes in routes directory
*/
fs.readdirSync('./routes').forEach((file) => {
  require(`./routes/${file}`)(app);
});


/*listen at current local IP address*/
app.listen(
  config.PORT,
  basic.getLocalIpAddress()
);
