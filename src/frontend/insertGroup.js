(async () => {
  let els = {
    titleInp: document.getElementById('group-title'),
    coverHolder: document.getElementById('cover-element-holder'),
    descriptionInp: document.getElementById('group-description'),
    saveBtn: document.getElementById('save')
  };

  let coverEl = new CoverSelector(els.coverHolder, {
    noSearch: true
  });


  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Group',
    messageClass: 'main-olay-message'
  });

  //check if pathname has an id, if so, user is trying to edit an existing serie, fetch current data
  let currentId = getIdFromUrl();

  if(currentId) {//fetch data
    let currentData = await doHttpRequest(`/get/groups/${currentId}`);
    if(currentData) {//enter current data into relevant inputs
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.description, els.descriptionInp);
    }
    //add pic if exists
    coverEl.set(`/pic/groups/${currentData.id}`);
  }


  els.saveBtn.onclick = () => {
    saveGroup({
      values: {
        id: currentId,
        title: els.titleInp.value,
        description: els.descriptionInp.value.trim(),
        cover: coverEl.getSelected()
      },
      messager: messager,
      loaderEl: loader,
      saveButton: els.saveBtn
    });
  };
})()

async function saveGroup(opts) {
  if(!validValue(opts.values.title)) {
    opts.messager.setError("Please fill Title Input");
    return;
  }

  opts.saveButton.disabled = true;//disable until http request finish
  opts.loaderEl.show('Saving Group');
  let response = await doHttpRequest('/save/group', {
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
  opts.messager.setMessage("Group Saved");
  await sleep(2000);
  //if redirect link was received, change location to it, if not just reload
  window.location = response.redirect || '/insert/group';
}
