(async () => {
  let els = {
    typeDiv: document.getElementById('type-group'),
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    yearInp: document.getElementById('book-year'),
    coverHolder: document.getElementById('cover-element-holder'),
    collectionHolder: document.getElementById('collection-holder'),
    bookPagesInput: document.getElementById('book-pages'),
    nextBookHolder: document.getElementById('next-book-holder'),
    prevBookHolder: document.getElementById('prev-book-holder'),
    seriesHolder: document.getElementById('series-holder'),
    autoFillHolder: document.getElementById('auto-fill'),
    saveBtn: document.getElementById('save'),
    bookStoreInp: document.getElementById('book-store'),
    langInp: document.getElementById('book-lang'),
    langOrgInp: document.getElementById('book-lang-org')
  };

  let bookTypeE = new CheckboxGroup(els.typeDiv, {
    checkboxes: [
      {
        title: 'Hard Cover',
        code: 'H'
      },
      {
        title: 'Paper Back',
        code: 'P'
      },
      {
        title: 'Hard Cover no Dust Jacket',
        code: 'HN'
      }
    ]
  }),

  serieE = new Selector(els.seriesHolder, {
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

  nextEl = new Selector(els.nextBookHolder, {
    withFilter: true,
    title: 'Is Followed By:',
    selectName: 'Book',
    actionScript: '/bookList'
  }),

  prevEl = new Selector(els.prevBookHolder, {
    withFilter: true,
    title: 'Is Preceded By:',
    selectName: 'Book',
    actionScript: '/bookList'
  }),

  collectionEl = new StoriesCollection(els.collectionHolder, {
    pagesInput: els.bookPagesInput,
    mainAuthorInput: els.authorInp
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
    collectionPointer: collectionEl,
    checkParamsErrorMessage: 'Please fiil ISBN or Author and Title',
    inputsToFill: {
      isbn: els.isbnInp,
      title: els.titleInp,
      author: els.authorInp,
      pages: els.bookPagesInput,
      year: els.yearInp
    }
  }),

  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Book',
    messageClass: 'main-olay-message'
  });

  els.saveBtn.onclick = () => {
    saveBook({
      values: {
        title: els.titleInp.value,
        author: els.authorInp.value,
        isbn: els.isbnInp.value,
        year: els.yearInp.value,
        pages: els.bookPagesInput.value,
        store: els.bookStoreInp.value,
        lang: els.langInp.value,
        langOrg: els.langOrgInp.value,
        type: bookTypeE.get(),
        serie: serieE.get(),
        next: nextEl.get(),
        prev: prevEl.get(),
        cover: coverEl.getSelected(),
        collection: collectionEl.get()
      },
      messager: messager,
      loaderEl: loader,
      saveButton: els.saveBtn
    });
  };
})()

function saveBook(opts) {
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
  if(!validValue(opts.values.pages)) {
    opts.messager.setError("Please fill Pages Input");
    return;
  }
  if(!validValue(opts.values.store)) {
    opts.messager.setError("Please fill Store Input");
    return;
  }
  if(!validValue(opts.values.lang)) {
    opts.messager.setError("Please fill Language Input");
    return;
  }
  if(!validValue(opts.values.langOrg)) {
    opts.messager.setError("Please fill Original Language Input");
    return;
  }
  if(!validValue(opts.values.type)) {
    opts.messager.setError("Please select Type Format");
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
  if(opts.values.next !== null && !validValue(opts.values.next)) {
    opts.messager.setError("Please select Next book");
    return;
  }
  if(opts.values.prev !== null && !validValue(opts.values.prev)) {
    opts.messager.setError("Please select Previous book");
    return;
  }
  opts.saveButton.disabled = true;//disable until http request finish
  opts.loaderEl.show('Saving Book');
  doHttpRequest('/save/book', {
    method: 'POST',
    body: jsonToFormData(opts.values)
  }).then((response) => {
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
    opts.messager.setMessage("Book Saved");
    location.reload();//reload in order to clear inputs
  });
}


function buildFormData(formData, data, parentKey) {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
    });
  } else {
    const value = data == null ? '' : data;
    formData.append(parentKey, value);
  }
}

function jsonToFormData(data) {
  const formData = new FormData();
  buildFormData(formData, data);
  return formData;
}
