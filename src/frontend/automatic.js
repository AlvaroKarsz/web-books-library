(async () => {
  /*general frontend functions that should be used in every page*/
  showOverlayOnexit();
  showUrlMessage();
  listenToAdvancedBackupMenu();
})()

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
