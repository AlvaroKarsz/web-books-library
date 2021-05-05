(() => {
  let a = document.getElementById('backup-files-a'),
  menu = document.getElementById('backup-files-menu');
  if(!a || !menu) {
    return;
  }
  /*handle side menu*/
  a.onmouseover = () => {
    menu.style.display = "block";
  };

  menu.onmouseover = () => {
    menu.style.display = "block";
  };

  menu.onmouseleave = () => {
    menu.style.display = "none";
  };

  a.onmouseleave = () => {
    menu.style.display = "none";
  };

})();


async function doBackUp(folder) {
  /*open dialog box*/
  let dialog = new BackupDialog({title:folder.toUpperCase()});
  dialog.build();
  dialog.addLine("Sending request to bring up the Websocket Server");

  /*init the websocket server and get the server's port*/
  let port = await doHttpRequest('/websocket/init');
  if(!port) {
    dialog.addLine("Error - Could not get Websocket Server port from Web Server", {type:'error'});
    return;
  }

  if(port === 'busy') {
    dialog.addLine("Error - Websocket server is busy, try again later", {type:'error'});
    return;
  }

  /*create ws client*/
  let ws = await createWebSocketClient(`ws://${window.location.hostname}:${port}`);
    /*send ws pointer to dialog (if needs to send a stop command)*/
    dialog.setWS(ws);
    /*send to ws the wanted folder*/
    ws.send(folder);
    /*on message show it in dialog*/
    ws.onmessage = async (msg) => {
      msg = JSON.parse(msg.data);
      /*error*/
      if(msg.error) {
        dialog.addLine(msg.error, {type:'error'});
      } else if(msg.message){/*normal*/
        dialog.addLine(msg.message);
      } else if (msg.bold) {/*bold message*/
        dialog.addLine(msg.bold, {type:'bold'});
      } else if (msg.prompt) {/*promprt question to user*/
        ws.send(
          `response:${await dialog.addLine(msg.prompt, {type:'prompt'})}`
        );
      } else if (msg.link) { /*make a tag to user*/
        dialog.addLine(msg.link, {type:'link'});
      }

    };
  }

  async function createWebSocketClient(url) {
    return new Promise((resolve) => {
      let ws = new WebSocket(url);
      ws.onopen = () => {
        resolve(ws);
      };
    });
  }


  class BackupDialog {
    constructor(ops = {}) {
      this.MAX_ELEMENTS = 500;
      this.title = ops.title || '';
      this.ws = ops.ws || null;
    }

    setWS(ws) {
      this.ws = ws;
    }

    build() {
      this.overlay = document.createElement('DIV');
      this.overlay.className = 'main-overlay';
      this.dialog = document.createElement('DIV');
      this.dialog.className = 'backup-dialog';
      this.dialogTitle = document.createElement('DIV');
      this.dialogTitle.className = 'backup-dialog-title';
      this.dialogTitle.innerHTML = 'Backup Process -' + this.title;
      this.dialogClose = document.createElement('BUTTON');
      this.dialogClose.className = 'backup-dialog-close-button';
      this.dialogClose.innerHTML = 'X';
      this.dialogBody = document.createElement('DIV');
      this.dialogBody.className = 'backup-dialog-body';
      this.dialog.appendChild(this.dialogClose);
      this.dialog.appendChild(this.dialogTitle);
      this.dialog.appendChild(this.dialogBody);
      this.overlay.appendChild(this.dialog);
      document.body.appendChild(this.overlay);
      this.activateCloseButton();
    }

    activateCloseButton() {
      this.dialogClose.onclick = () => {
        this.kill();
        this.stopWS();/*send stop command to websocket*/
      };
    }

    stopWS() {
      if(this.ws) {
        if(this.ws.readyState === 1) {//open
          this.ws.send('stop');
        }
      }
    }

    kill() {
      this.overlay.remove();
    }

    addLine(line, ops = {}) {

      let div = document.createElement('DIV');
      div.innerHTML = line;

      if(ops.type && ops.type === 'error') {/*error message*/
        div.style.color = 'rgba(255,0,0,0.8)';
      }

      if(ops.type && ops.type === 'bold') {/*bold message*/
        div.style.fontWeight = 'bolder';
        div.style.fontSize = '22px';
      }

      if(ops.type && ops.type === 'link') {/*a tag*/
        let a = document.createElement('A');
        a.href = line;
        a.target = 'blank';
        a.innerHTML = line;
        div.innerHTML = '';//clear line, will be displayed in a tag
        div.appendChild(a);
      }

      this.dialogBody.appendChild(div);

      if(this.dialogBody.childElementCount > this.MAX_ELEMENTS) {
        this.dialogBody.removeChild(this.dialogBody.children[0]);
      }
      this.scrollBottom();

      if(ops.type && ops.type === 'prompt') {/*pormpt message*/
        let inp = document.createElement('INPUT');
        inp.setAttribute("autocomplete","off");
        inp.setAttribute("autocorrect","off");
        inp.setAttribute("autocapitalize","off");
        inp.setAttribute("spellcheck","false");

        div.appendChild(inp);
        inp.focus();
        return new Promise((resolve) => {
          inp.onkeyup = (k) => {
            if(k.keyCode !== 13) {
              return;
            }
            /*convert input to inactive and remove listener*/
            inp.disabled = true;
            inp.onkeyup = null;
            resolve(inp.value);
          };
        });

      }

    }

    scrollBottom() {
      this.dialogBody.scrollTop = this.dialogBody.scrollHeight - this.dialogBody.clientHeight;
    }
  }
