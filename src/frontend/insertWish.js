(async () => {
  let els = {
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    yearInp: document.getElementById('book-year'),
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
      year: els.yearInp
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

  els.saveBtn.onclick = () => {
    saveWish({
      values: {
        title: els.titleInp.value,
        author: els.authorInp.value,
        isbn: els.isbnInp.value,
        year: els.yearInp.value,
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
  await sleep(3000);
  location.reload();//reload in order to clear inputs
}
