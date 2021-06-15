(async () => {
  let els = {
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    yearInp: document.getElementById('book-year'),
    descriptionInp: document.getElementById('book-description'),
    asinInp: document.getElementById('book-asin'),
    tagsInp: document.getElementById('book-tags'),
    coverHolder: document.getElementById('cover-element-holder'),
    seriesHolder: document.getElementById('series-holder'),
    autoFillHolder: document.getElementById('auto-fill'),
    saveBtn: document.getElementById('save')
  };

  let serieE = new Selector(els.seriesHolder, {
    additionalInputs: [{
      name: 'Number',
      type: 'number',
      returnName: 'number'
    }],
    withFilter: true,
    title: 'Part of Serie:',
    selectName: 'Serie',
    actionScript: '/serieList'
  }),

  coverEl = new CoverSelector(els.coverHolder, {
    getSearchCoverParamsCallback: () => {
      return {
        isbn: els.isbnInp.value,
        author: els.authorInp.value,
        title: els.titleInp.value
      };
    }
  }),

  autoFill = new AutoFill(els.autoFillHolder, {
    checkParamsCallback: () => {
      return els.isbnInp.value || (els.authorInp.value && els.titleInp.value)
    },
    getParamsCallback: () => {
      return {
        isbn: els.isbnInp.value,
        title: els.titleInp.value,
        author: els.authorInp.value
      };
    },
    actionScript: '/search/book/',
    checkParamsErrorMessage: 'Please fiil ISBN or Author and Title',
    inputsToFill: {
      isbn: els.isbnInp,
      title: els.titleInp,
      author: els.authorInp,
      year: els.yearInp,
      description: els.descriptionInp,
      asin: els.asinInp,
      tags: els.tagsInp
    }
  }),

  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Wish',
    messageClass: 'main-olay-message'
  });

  //check if pathname have an id, if so, user is trying to edit an existing wish, fetch current data
  let currentId = getIdFromUrl();

  if(currentId) {//fetch data
    let currentData = await doHttpRequest(`/get/wishlist/${currentId}`);
    if(currentData) {//enter current data into relevant inputs
      //start with standard data (normal inputs)
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.author, els.authorInp);
      addValueToInput(currentData.isbn, els.isbnInp);
      addValueToInput(currentData.asin, els.asinInp);
      addValueToInput(currentData.year, els.yearInp);
      addValueToInput(currentData.tags, els.tagsInp);
      addValueToInput(currentData.description, els.descriptionInp);

      //add serie if exists
      if(currentData.serie_id) {
        serieE.set({
          value: currentData.serie_id,
          number: currentData.serie_num
        });
      }
    }
    //add pic if exists
    coverEl.set(`/pic/wishlist/${currentData.id}`);
  }

  //check if this page received data from url, if so auto search it
  let params = getUrlParams();
  //isbn is required, title and author are not
  if(params.isbn) {//auto insert data
    addValueToInput(params.isbn, els.isbnInp);
    if(params.author) {
      addValueToInput(params.author, els.authorInp);
    }
    if(params.title) {
      addValueToInput(params.title, els.titleInp);
    }
    if(params.serie) {
      serieE.set({
        value: params.serie,
        number: params.location.match(/[0-9]+/)[0] || ''
      });
    }
    //trigger auto search
    autoFill.manualTrigger();
    //trigger cover search
    coverEl.search();
  }

  els.saveBtn.onclick = () => {
    saveWish({
      values: {
        id: currentId,
        title: els.titleInp.value,
        author: els.authorInp.value,
        isbn: els.isbnInp.value,
        year: els.yearInp.value,
        asin: els.asinInp.value,
        tags: els.tagsInp.value,
        description: els.descriptionInp.value.trim(),
        serie: serieE.get(),
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
  if(!validValue(opts.values.isbn)) {
    opts.messager.setError("Please fill ISBN Input");
    return;
  }
  if(!validValue(opts.values.year)) {
    opts.messager.setError("Please fill Year Input");
    return;
  }
  if(opts.values.serie) {
    if(!validValue(opts.values.serie.value)) {
      opts.messager.setError("Please select Serie");
      return;
    }
    if(!validValue(opts.values.serie.number)) {
      opts.messager.setError("Please select number in Serie");
      return;
    }
  }
  opts.saveButton.disabled = true;//disable until http request finish
  opts.loaderEl.show('Saving Wish');
  let response = await doHttpRequest('/save/wish', {
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
  opts.messager.setMessage("Wish Saved");
  await sleep(2000);
  //if redirect link was received, change location to it, if not just reload
  window.location = response.redirect || '/insert/wishlist';
}
