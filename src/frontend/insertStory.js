(async () => {
  let els = {
    titleInp: document.getElementById('story-title'),
    authorInp: document.getElementById('story-author'),
    pagesInp: document.getElementById('story-pages'),
    goodreadsInp: document.getElementById('book-goodreads'),
    coverHolder: document.getElementById('cover-element-holder'),
    collectionHolder: document.getElementById('collection-holder'),
    asinInp: document.getElementById('book-asin'),
    seriesHolder: document.getElementById('series-holder'),
    descriptionInp: document.getElementById('story-description'),
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

  collectionE = new Selector(els.collectionHolder, {
    withFilter: true,
    ignoreCheckBox: true,
    selectName: 'Collection',
    actionScript: '/collectionList'
  }),

  coverEl = new CoverSelector(els.coverHolder, {
    getSearchCoverParamsCallback: () => {
      return {
        author: els.authorInp.value,
        title: els.titleInp.value
      };
    }
  }),

  autoFill = new AutoFill(els.autoFillHolder, {
    checkParamsCallback: () => {
      return els.titleInp.value && (els.authorInp.value || collectionE.get().value)
    },
    getParamsCallback: () => {
      return {
        title: els.titleInp.value,
        author: els.authorInp.value,
        collection: collectionE.get().value
      };
    },
    actionScript: '/search/story/',
    checkParamsErrorMessage: 'Please fill Title and Author or Collection',
    inputsToFill: {
      description: els.descriptionInp,
      asin: els.asinInp,
      goodreads: els.goodreadsInp,
    },
    hooks: {
      before: () => {//trigger cover search when autosearch is clicked
        coverEl.search();
      }
    }
  }),

  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Story',
    messageClass: 'main-olay-message'
  });

  //check if pathname has an id, if so, user is trying to edit an existing story, fetch current data
  let currentId = getIdFromUrl();

  if(currentId) {//fetch data
    let currentData = await doHttpRequest(`/get/stories/${currentId}`);
    if(currentData) {//enter current data into relevant inputs
      //start with standard data (normal inputs)
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.description, els.descriptionInp);
      addValueToInput(currentData.asin, els.asinInp);
      addValueToInput(currentData.story_author ? currentData.story_author : currentData.author , els.authorInp);
      addValueToInput(currentData.pages, els.pagesInp);
      addValueToInput(currentData.goodreads_link, els.goodreadsInp);

      //add serie if exists
      if(currentData.serie_id) {
        serieE.set({
          value: currentData.serie_id,
          number: currentData.serie_num
        });
      }

      //add collection
      if(currentData.collection_id) {
        collectionE.set({
          value: currentData.collection_id
        });
      }
    }
    //add pic if exists
    coverEl.set(`/pic/stories/${currentData.id}`);
  }


  els.saveBtn.onclick = () => {
    saveStory({
      values: {
        id: currentId,
        title: els.titleInp.value,
        author: els.authorInp.value,
        pages: els.pagesInp.value,
        asin: els.asinInp.value,
        description: els.descriptionInp.value,
        goodReads: els.goodreadsInp.value,
        collectionId: collectionE.get(),
        serie: serieE.get(),
        cover: coverEl.getSelected()
      },
      messager: messager,
      loaderEl: loader,
      saveButton: els.saveBtn
    });
  };
})()

async function saveStory(opts) {
  if(!validValue(opts.values.title)) {
    opts.messager.setError("Please fill Title Input");
    return;
  }
  if(!validValue(opts.values.pages)) {
    opts.messager.setError("Please fill Pages Input");
    return;
  }
  if(!validValue(opts.values.collectionId.value)) {
    opts.messager.setError("Please select Collection");
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
  opts.loaderEl.show('Saving Story');
  let response = await doHttpRequest('/save/story', {
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
  opts.messager.setMessage("Story Saved");
  await sleep(2000);
  //if redirect link was received, change location to it, if not just reload
  window.location = response.redirect || '/insert/stories';
}
