(async () => {
  let els = {
    typeDiv: document.getElementById('type-group'),
    messageBox: document.getElementById('message'),
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
    autoFillHolder: document.getElementById('auto-fill')
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
  });

  //  handleSumbits(els.form, els.messageBox);
})()

function handleSumbits(form, messageBox) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    let object = getFormObject(form);
    let serverResponse = await doHttpRequest('/save/book', {
      method:'POST',
      body:JSON.stringify(object),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if(serverResponse.status) {
      //    showSuccessMessage(serverResponse.message);
    } else {
      showErrorMessage(messageBox, serverResponse.message);
    }
  };

}


function getFormObject(form) {
  let object = {};
  [...form.getElementsByTagName('INPUT'), ...form.getElementsByTagName('SELECT')].filter(a => a.getAttribute('name')).forEach((a) => {
    if(a.getAttribute('name').includes('[]')) {
      if(typeof object[a.getAttribute('name')] !== 'undefined') {
        object[a.getAttribute('name')].push(a.getAttribute('type') === 'checkbox' ? a.checked : a.value);
      } else {
        object[a.getAttribute('name')] = [a.getAttribute('type') === 'checkbox' ? a.checked : a.value];
      }
    } else {
      object[a.getAttribute('name')] = a.getAttribute('type') === 'checkbox' ? a.checked : a.value;
    }
  });
  return object;
}

function showErrorMessage(element,message) {
  element.style.display = 'block';
  element.getElementsByTagName('P')[0].innerHTML = message;
  setTimeout(() => {
    element.style.display = 'none';
  },3000);
}
