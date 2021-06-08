const settings = require('../settings.js');
const logger = require(settings.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH);
const Ws = require(settings.SOURCE_CODE_BACKEND_WEBSOCKET_MODULE_FILE_PATH);

/*
THIS IS NOT THE ACTUAL WEBSOCKET
THIS ROUTE WILL CREATE A WEBSOCKET SERVER.


FLOW:

CLIENT CALLS THIS ENDPOINT
BACKEND CREATES A WABSOCKET SERVER AND SENDS AN OK MESSAGE TO CLIENT WITH WEBSOCKET SERVER PORT  (OR ERROR MESSAGE)
CLIENT KNOWS THAT THE WEBSOCKET SERVER IS LISTENING, SO HE INITIALIZES THE WEBSOCKET COMMUNICATION
WHEN WEBSOCKET SERVER FINISHED THE WANTED ACTION (UPLOAD FILES TO GOOGLE DRIVE), SERVER WILL CLOSE WEBSOCKET.
CLIENT WILL LISTEN TO CLOSE EVENT, AND CLIENT WILL KNOW THAT THE ACTION ENDED

*/

module.exports = (app) => {

  /*route to start ws*/
  app.get('/websocket/init', (req, res) =>  {
    /*
    send init request to class
    function will response with the server port or with null in case of errors
    */
    const response = Ws.init();

    /*log action*/
    logger.log({
      text: "WebSocket server was initialized for a backup process.\nServer is listening in port " + response
    });
    /*send port/error to client*/
    res.send(
      JSON.stringify(response)
    );
    return;
  });

}
