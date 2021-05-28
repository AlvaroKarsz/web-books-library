(() => {
  /*general frontend functions that should be used in every page*/
  showOverlayOnexit();
  showUrlMessage();
  listenToAdvancedBackupMenu();
  listenToDescriptionReFetchAction();
  listenToCoverChange();
  listenToMarkBookAsReadButNotCompleted();
})()

function listenToMarkBookAsReadButNotCompleted() {
  let cbox = document.getElementById('mark-book-as-completed'),
  inp = document.getElementById('input-number-read-pages-book');
  if(cbox && inp) {
    cbox.onchange = () => {
      inp.style.display = cbox.checked ? 'none' : 'block';
    };
  }
}

function listenToCoverChange() {
  let div = document.getElementById('refresh-cover');
  if(!div) {
    return;
  }

  let  coverChanger = new CoverChanger({
    fetchScript: `/get${document.location.pathname}`,
    pic: `/pic${document.location.pathname}`,
    saveScript: `${document.location.pathname}/newPic`,
    messager: new Messager(),
    loader: new Loader(document.body, {
      autoPost: true,
      withOverlay: true,
      overlayClass: 'main-overlay',
      cssForceLoader: {
        margin: '0',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1.8)'
      }
    })
  });

  div.onclick = () => {
    coverChanger.show();
  };
}


function listenToDescriptionReFetchAction() {
  /*if page has refresh-description element, listen to clicks*/
  let div = document.getElementById('refresh-description');
  if(!div) {
    return;
  }

  //get ID and type
  let id = div.getAttribute('param-id'),
  type = div.getAttribute('param-type');

  if(!id || !type) {
    return;
  }

  //build messager class & loader class & confirm class to show error messages and ask questions and show loading status

  let loder = new Loader(document.body, {
    autoPost: true,
    withOverlay: true,
    overlayClass: 'main-overlay',
    cssForceLoader: {
      margin: '0',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(1.8)'
    }
  }),

  messager =  new Messager(),

  confirmer = new Confirm();


  div.onclick = async () => {
    //show loader
    loder.show();
    //make http request to server with type and book
    let req = await doHttpRequest('/search/description/', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id:id,
        type:type
      })
    });
    //remove loader
    loder.hide();
    //error/nothing found - show msg and return
    if(!req) {
      messager.setError('Nothing Found...');
      return;
    }

    //ask user if the new description should be saved
    if( await confirmer.ask({
      ok: 'Yes',
      cancel: 'No',
      content: req,
      subject: 'Would you like to save this description?'
    }) ) {
      //save

      //show loader
      loder.show();

      //make http request to server - change description
      req = await doHttpRequest(`/${type}/description/change`, {
        method:'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id:id,
          desc: req
        })
      });

      loder.hide();
      //error - show msg and return
      if(!req) {
        messager.setError('Could not save new Description');
        return;
      }

      //reload - shoulf load new description
      this.location.reload();
    }
  };
}


function listenToAdvancedBackupMenu() {
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

}

function showUrlMessage() {
  //search for messages to display
  let urlParams = getUrlParams();
  let messager = new Messager();
  if(urlParams['err-msg']) {//error message exists
    messager.setError(urlParams['err-msg']);
    removeUrlParam('err-msg');
  } else if (urlParams['suc-msg']) {//sucess message exists
    messager.setMessage(urlParams['suc-msg']);
    removeUrlParam('suc-msg');
  }
}

function showOverlayOnexit() {
  //on before window close show loader
  window.onbeforeunload = () => {
    let loder = new Loader(document.body, {
      autoShow: true,
      withOverlay: true,
      overlayClass: 'main-overlay',
      cssForceLoader: {
        margin: '0',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1.8)'
      }
    });
  };
}

function openEbook(url, title) {//function to open a new window with title
  let win = window.open(url);
  win.document.body.onload = () => {
    sleep(1000).then(() => {//wait for default title to load then change it
      win.document.title = title;
    });
  };
}
