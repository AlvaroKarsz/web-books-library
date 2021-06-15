(async () => {
  let els = {
    titleInp: document.getElementById('serie-title'),
    authorInp: document.getElementById('serie-author'),
    coverHolder: document.getElementById('cover-element-holder'),
    saveBtn: document.getElementById('save')
  };

  let coverEl = new CoverSelector(els.coverHolder, {
    getSearchCoverParamsCallback: () => {
      return {
        author: els.authorInp.value,
        title: els.titleInp.value
      };
    }
  });


  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Serie',
    messageClass: 'main-olay-message'
  });

  //check if pathname has an id, if so, user is trying to edit an existing serie, fetch current data
  let currentId = getIdFromUrl();

  if(currentId) {//fetch data
    let currentData = await doHttpRequest(`/get/series/${currentId}`);
    if(currentData) {//enter current data into relevant inputs
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.author, els.authorInp);
    }
    //add pic if exists
    coverEl.set(`/pic/series/${currentData.id}`);
  }


  els.saveBtn.onclick = () => {
    saveWish({
      values: {
        id: currentId,
        title: els.titleInp.value,
        author: els.authorInp.value,
        cover: coverEl.getSelected()
      },
      messager: messager,
      loaderEl: loader,
      saveButton: els.saveBtn
    });
  };
})()

async function saveWish(opts) {
  if(!validValue(opts.values.title)) {
    opts.messager.setError("Please fill Title Input");
    return;
  }
  if(!validValue(opts.values.author)) {
    opts.messager.setError("Please fill Author Input");
    return;
  }
  opts.saveButton.disabled = true;//disable until http request finish
  opts.loaderEl.show('Saving Serie');
  let response = await doHttpRequest('/save/serie', {
    method: 'POST',
    body: jsonToFormData(opts.values)
  });
  opts.loaderEl.hide();
  opts.saveButton.disabled = false;
  if(!response) {
    opts.messager.setError("Error from Server, Please try again");
    return;
  }
  if(response.status !== true) {
    opts.messager.setError(response.message);
    return;
  }
  opts.messager.setMessage("Serie Saved");
  await sleep(2000);
  //if redirect link was received, change location to it, if not just reload
  window.location = response.redirect || '/insert/series';
}
