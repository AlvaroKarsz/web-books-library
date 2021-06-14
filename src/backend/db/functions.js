const settings = require('../settings.js');
const fs = require("fs");
const path = require("path");

/*
CREATE AN EMPTY CLASS, THEN REQUIRE ALL DB PROTOTYPES FILES
THESE FILES RECEIVE A CLASS NAME, AND ADD TO IT PROTORYPES
*/

/*EMPTY CLASS*/
class DBFunctions {}

/*NOW REQUIRE ALL DB PROTOTYPES FILES AND PASS THE CLASS NAME*/


fs.readdirSync(settings.SOURCE_CODE_BACKEND_DATABASE_PROTOTYPES_PATH).forEach((file) => {

  require(
    path.join(settings.SOURCE_CODE_BACKEND_DATABASE_PROTOTYPES_PATH, file)
  )(DBFunctions);

});

/*NOW EXPORT CLASS WITH ALL PROTOTYPES*/
module.exports = new DBFunctions();
