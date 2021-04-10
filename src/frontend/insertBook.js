(async () => {
  let els = {
    typeDiv: document.getElementById('type-group'),
    messageBox: document.getElementById('message'),
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    coverHolder: document.getElementById('cover-element-holder'),
    collectionHolder: document.getElementById('collection-holder'),
    bookPagesInput: document.getElementById('book-pages'),
    nextBookHolder: document.getElementById('next-book-holder'),
    prevBookHolder: document.getElementById('prev-book-holder'),
    seriesHolder: document.getElementById('series-holder')
  };

  handleCheckboxGroup({div:els.typeDiv});



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
  });


  //  handleSumbits(els.form, els.messageBox);
})()



function handleCheckboxGroup(params) {
  let checkBox = params.div ? [...params.div.getElementsByTagName('INPUT')].filter(x => x.type === 'checkbox') : (Array.isArray(params.elements) ? params.elements : [params.elements]);
  checkBox.forEach((a) => {
    a.onchange = (e) => {
      checkBox.forEach((c) => {
        c.checked = c === e.target ? true : false;
      });
    };
  });
}

function setRequired(e) {
  e.required = true;
}

function removeRequired(e) {
  e.required = false;
}

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
