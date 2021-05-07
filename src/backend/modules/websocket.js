const settings = require('../settings.js');
const WebSocket = require('ws');
const DriveBackup = require('./driveBackup.js');
/*
ONLY 1 WEBSOCKET CAN BE OPEN AT ANY GIVEN TIME!
*/

/*
CLASS TO HANDLE WESOCKET PROTOCOL SERVER END
*/
class Ws {
  constructor() {
    this.PORT = settings.WS_PORT; /*ws port*/
    this.isListening = false; /*flag to indicate if ws is up*/
    this.ws = null; /*pointer to hold websocket*/
    this.validMessages = [
      'all',
      'books',
      'wishlist',
      'series',
      'stories',
      'icons',
      'general',
      'backups',
      'e-books'
    ];
    this.stopMessage = 'stop';
    this.responseFormat = /^response\:/i;
  }

  getResponse(m) {
    return m.replace(this.responseFormat, '');
  }

  /*FUNCTION TO START SERVER*/
  init() {
    /*start websocket if not started yet*/
    if(this.isListening) {
      return 'busy';/*used*/
    }
    this.ws = new WebSocket.Server({
      port: this.PORT
    });

    /*INIT CALLBACK*/
    this.startCallbacks();

    this.isListening = true;

    /*return server port*/
    return this.PORT;
  }

  /*FUNCTION TO STOP WS SERVER*/
  kill() {
    if(this.isListening) {
      this.ws.close();
      this.isListening = false;
    }
  }

  reset() {
    this.kill();
    this.init();
  }

  /*add event handlers*/
  startCallbacks() {

    /*once client made connection set a on message handler*/
    this.ws.on('connection', (ws)  => {
      let isWorking = false; /*a flag to indicate if this ws is working - if so, ignore incomming messages from client*/

      ws.onclose = () => { /*send to backup class a sign when websocket is closed*/
        DriveBackup.closeEvent();
      }

      /*once client send message*/
      ws.on('message', async  (msg) =>  {
        if(msg === this.stopMessage) {/*stop backup*/
          isWorking = false;
          DriveBackup.stop();

          /*kill websocket*/
          this.kill();
        }

        if(this.responseFormat.test(msg)) {/*response to question*/
          DriveBackup.setResponse(
            this.getResponse(msg)
          );
        }


        if(isWorking) { /*ignore*/
          return;
        }
        isWorking = true;
        await DriveBackup.backup(ws, msg);
        isWorking = false;
        this.kill();
      });
    });


  }
};

module.exports = new Ws();
