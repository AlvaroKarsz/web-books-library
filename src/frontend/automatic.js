(() => {
  /*general frontend functions that should be used in every page*/
  showOverlayOnexit();
  showUrlMessage();
  handleTopNavOptions();
  listenToAdvancedBackupMenu();
  listenToDescriptionReFetchAction();
  listenToCoverChange();
  listenToMarkBookAsReadButNotCompleted();
  listenToSimilarBooksSearch();
  listenToBooksByAuthorSearch();
  listenToBooksFromSerieSearch();
  listenToCheapestSearch();
  listenToMemberAdd();
  listenToMainKeyboardShortcuts();
})()

function listenToMainKeyboardShortcuts() {

  let deleteForm = document.getElementById('delete-listing-form'),
  searchOnlineForm  = document.getElementById('web-stores-holder'),
  leftArrow = document.getElementById('redirector-main-arrow-left'),
  rightArrow = document.getElementById('redirector-main-arrow-right'),
  fetchRating = document.getElementById('fetch-rating-a'),
  dbBackup = document.getElementById('db-backup-a'),
  fetchTags = document.getElementById('fetch-tags-a'),
  fetchAsin = document.getElementById('fetch-asin-a'),

  lastPressedArr = [],
  timer = null,
  inAction = false;

  document.body.onkeydown = (k) => {
    if(inAction) {
      return;
    }

    /**********************************************************
    save letters
    *************************************************************/
    if(k.keyCode >= 64 &&  k.keyCode <= 90) {
      lastPressedArr.push(k.key.toUpperCase()); //save letter
      //stop timer and restart it
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastPressedArr.length = 0;
      }, 1000);
    }

    /**********************************************************
    delete option - delete key
    *************************************************************/
    if(deleteForm) {
      if(k.keyCode === 46) {
        if(confirm("Are you sure you wish to delete this listing?")) {
          deleteForm.submit();
          inAction = true;
        }
        return;
      }
    }
    /**********************************************************
    search online option - shift + ?
    *************************************************************/
    if(searchOnlineForm) {
      if(k.keyCode === 191 && k.shiftKey) {
        [...searchOnlineForm.getElementsByTagName('A')]
        .forEach(a => a.click());
        inAction = true;
        return;
      }
    }
    /**********************************************************
    navigate left - left key
    *************************************************************/
    if(leftArrow) {
      if(k.keyCode === 37) {
        leftArrow.click();
        inAction = true;
        return;
      }
    }
    /**********************************************************
    navigate right - right key
    *************************************************************/
    if(rightArrow) {
      if(k.keyCode === 39) {
        rightArrow.click();
        inAction = true;
        return;
      }
    }
    /**********************************************************
    backup DB - 'db' letters
    *************************************************************/
    if(dbBackup) {
      if(lastPressedArr.join('').endsWith('DB')) {
        dbBackup.click();
        inAction = true;
        clearTimeout(timer);//clear timer
        lastPressedArr.length = 0;//clear arr
        return;
      }
    }
    /**********************************************************
    fetch ratings - 'ratings' letters
    *************************************************************/
    if(fetchRating) {
      if(lastPressedArr.join('').endsWith('RATINGS')) {
        fetchRating.click();
        inAction = true;
        clearTimeout(timer);//clear timer
        lastPressedArr.length = 0;//clear arr
        return;
      }
    }
    /**********************************************************
    fetch tags - 'tags' letters
    *************************************************************/
    if(fetchTags) {
      if(lastPressedArr.join('').endsWith('TAGS')) {
        fetchTags.click();
        inAction = true;
        clearTimeout(timer);//clear timer
        lastPressedArr.length = 0;//clear arr
        return;
      }
    }
    /**********************************************************
    fetch asin - 'asin' letters
    *************************************************************/
    if(fetchAsin) {
      if(lastPressedArr.join('').endsWith('ASIN')) {
        fetchAsin.click();
        inAction = true;
        clearTimeout(timer);//clear timer
        lastPressedArr.length = 0;//clear arr
        return;
      }
    }
  };
}


function listenToMemberAdd() {
  let div = document.getElementById('add-members');
  if(!div) {
    return;
  }

  let id = div.getAttribute('param-id');
  if(!id) {
    return;
  }

  let memberAdder = new MembersAdd({
    groupId: id
  });

  div.onclick = () => {
    memberAdder.show();
  }
}


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

function listenToCheapestSearch() {
  /*if page has books-cheapest-search element, listen to clicks*/
  let div = document.getElementById("books-cheapest-search");
  if(!div) {
    return;
  }
  //get isbn
  let isbn = div.getAttribute('param-isbn');
  if(!isbn) {
    return;
  }

  let loader = new Loader(document.body, {
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

  messager =  new Messager();

  div.onclick = async () => {
    loader.show();
    let req = await doHttpRequest('/search/cheap/' + isbn, {
      method:'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    loader.hide();
    //error/nothing found - show msg and return
    if(!req) {
      messager.setError('Error while searching for prices...');
      return;
    }

    //build html string from prices
    let htmlStr = '<div class = "prices-display">';

    for(let store in req) {
      htmlStr += `<div class = "prices-display-element">` +
      `<div tp='topnav'>`;

      if(req[store].icon) {
        htmlStr += `<img src="${req[store].icon}" tp='icon'>`;
      }
      htmlStr +=`<p tp='title'>${store}</p>` +
      `</div>` +
      `<p>Price: <b>${req[store].price}</b></p>`;
      if(req[store].shipping) {
        htmlStr += `<p>Shipping: <b>${req[store].shipping}</b></p>`;
      }
      if(req[store].link) {
        htmlStr +=`<p><a href="${req[store].link}" target="blank">Go to Book</a></p>`;
      }
      htmlStr += `</div>`;
    }

    //show result
    new PopUp({
      html: true,
      title: 'Prices',
      body: htmlStr
    });

  };
}

function listenToBooksFromSerieSearch() {
  /*if page has books-from-same-series element, listen to clicks*/
  let div = document.getElementById("books-from-same-series");
  if(!div) {
    return;
  }

  //get serie id
  let serie = div.getAttribute('param-serie');

  if(!serie) {
    return;
  }

  let loader = new Loader(document.body, {
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

  booksDisplyer = new BooksDisplayer({
    title: 'Books from Series'
  });

  div.onclick = async () => {
    loader.show();
    let req = await doHttpRequest('/search/sameSerie/', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serie: serie
      })
    });
    loader.hide();

    //error/nothing found - show msg and return
    if(!req || (Array.isArray(req) && !req.length)) {
      messager.setError('Nothing Found...');
      return;
    }
    /*show books*/
    booksDisplyer.display(req)
  };

}

function listenToBooksByAuthorSearch() {
  /*if page has books-by-author-search element, listen to clicks*/
  let div = document.getElementById("books-by-author-search");
  if(!div) {
    return;
  }

  //get author
  let author = div.getAttribute('param-author');

  if(!author) {
    return;
  }

  let loader = new Loader(document.body, {
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

  booksDisplyer = new BooksDisplayer({
    title: 'Books by Same Author'
  });

  div.onclick = async () => {
    loader.show();
    let req = await doHttpRequest('/search/sameAuthor/', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author: author
      })
    });
    loader.hide();

    //error/nothing found - show msg and return
    if(!req || (Array.isArray(req) && !req.length)) {
      messager.setError('Nothing Found...');
      return;
    }
    /*show books*/
    booksDisplyer.display(req)
  };
}

function listenToSimilarBooksSearch() {
  /*if page has similar-books-search element, listen to clicks*/
  let div = document.getElementById("similar-books-search");
  if(!div) {
    return;
  }
  //get ID and type
  let id = div.getAttribute('param-id'),
  type = div.getAttribute('param-type');

  if(!id || !type) {
    return;
  }

  let loader = new Loader(document.body, {
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

  booksDisplyer = new BooksDisplayer({
    title: 'Similar Books'
  });


  div.onclick = async () => {
    loader.show();
    let req = await doHttpRequest('/search/similar/', {
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id:id,
        type:type
      })
    });
    loader.hide();

    //error/nothing found - show msg and return
    if(!req || (Array.isArray(req) && !req.length)) {
      messager.setError('Nothing Found...');
      return;
    }
    /*show books*/
    booksDisplyer.display(req)
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

function handleTopNavOptions() {//function to handle filter operations & sort
  /**********************************************************
  show/hide menus
  *************************************************************/
  let filterMainCheckbox = document.getElementById('filter-toggle-option'),
  sortMainCheckbox = document.getElementById('filter-toggle-sort'),
  filterMenu = document.getElementById('filter-menu'),
  sortMenu = document.getElementById('sort-menu');
  /**********************************************************
  get main form
  *************************************************************/
  let form = document.getElementById('filter-form');
  if(!form) {//no form
    return;
  }

  if(filterMainCheckbox && sortMainCheckbox && sortMenu && filterMenu) {
    let titleMenu = [...form.getElementsByTagName('INPUT')]
    .filter(a => a.getAttribute("name") === "title")[0];

    filterMainCheckbox.onchange = () => {//if on - show filter and hide sort
      if(filterMainCheckbox.checked) {
        filterMenu.style.display = 'block';
        sortMenu.style.display = 'none';
        sortMainCheckbox.checked = false;
        /**********************************************************
        focus on title input
        *************************************************************/
        if(titleMenu) {
          titleMenu.focus();
        }
      } else {//hide filter menu
        filterMenu.style.display = 'none';
      }
    };
    sortMainCheckbox.onchange = () => {//if on - show sort and hide filter
      if(sortMainCheckbox.checked) {
        sortMenu.style.display = 'block';
        filterMenu.style.display = 'none';
        filterMainCheckbox.checked = false;
      } else {//hide sort menu
        sortMenu.style.display = 'none';
      }
    };
  }
  /**********************************************************
  handle sort submit
  *************************************************************/
  let sortSelectBox = document.getElementById('sort-select-box');
  if(sortSelectBox) {
    let selectBoxForm = sortSelectBox.form;
    if(selectBoxForm) {
      sortSelectBox.onchange = () => {
        let urlParams = getUrlParams();
        if(sortSelectBox.value) {
          urlParams[sortSelectBox.name] = sortSelectBox.value;
        } else {
          delete urlParams[sortSelectBox.name];
        }
        setUrlParams(urlParams)
      };
    }
  }
  /**********************************************************
  handle filters clear
  *************************************************************/
  let clearFiltersBtn = document.getElementById('clear-filters-main');
  if(clearFiltersBtn) {
    clearFiltersBtn.onclick = () => {
      removeUrlParamsAndRedirect();
    };
  }
  /**********************************************************
  handle more/less options clicks
  *************************************************************/
  let moreButton = document.getElementById('filter-more-options-button'),
  lessButton = document.getElementById('filter-less-options-button'),
  moreOptionsBody = document.getElementById('filter-more-options-body');

  if(moreButton && lessButton && moreOptionsBody) {
    moreButton.onclick = () => {
      moreOptionsBody.style.display = 'block';//show more options
      moreButton.style.display = 'none';//hide more button
      lessButton.style.display = 'block';//show less button
    };

    lessButton.onclick = () => {
      moreOptionsBody.style.display = 'none';//hide more options
      lessButton.style.display = 'none';//hide less button
      moreButton.style.display = 'block';//show more button
    };
  }
  /**********************************************************
  handle form submit & redirections
  *************************************************************/
  let formElements = [...form.elements],
  pageSelectorDOM = document.getElementById('filter-page-selector'), //take page from this element
  formObj = {};
  if(pageSelectorDOM) {
    //build page selector options
    let pageSelectorOptions = {};
    pageSelectorDOM = [...pageSelectorDOM.getElementsByTagName('INPUT')]
    .filter(a => a.getAttribute('type') === 'checkbox')
    .filter(a => a.getAttribute('trgt'));

    //function to retrieve page selected
    let buildUrlFromSelectedPageName = () => {
      for(let i = 0 , l = pageSelectorDOM.length ; i < l ; i ++ ) {
        if(pageSelectorDOM[i].checked) {
          return window.location.origin + '/' + pageSelectorDOM[i].getAttribute('trgt');
        }
      }
    };

    form.onsubmit = (evt) => {
      /*
      on form submit, stop the default submit, this will add empty elements to URL
      get elements from form and assemble the URL
      */
      evt.preventDefault();

      for(let i = 0, l = formElements.length ; i < l ; i ++ ) {
        if(!formElements[i].value || !formElements[i].name) {//empty value or no name
          continue;
        }
        if(formElements[i].getAttribute('default-value') === formElements[i].value) {//default value, ignore
          continue;
        }
        if(formElements[i].type === 'checkbox' && !formElements[i].checked) {//non selected checkbox
          continue;
        }
        formObj[formElements[i].name] = formElements[i].value;
      }
      //build url & redirect
      setUrlParams(formObj, buildUrlFromSelectedPageName());
    }
  }
  /**********************************************************
  handle checkbox groups where only one checkbox can be checked
  *************************************************************/
  let checkboxGroups = [...form.getElementsByClassName('filter-options-cbox-group')].filter(a => a.getAttribute('only-one-allowed') === 't');

  if(checkboxGroups.length) {//form has checkbox groups
    checkboxGroups.forEach((grp) => {
      let cboxs = [];
      /*if DOM has checkbox-sticky='t' attribute, it means that at least one checkbox must be ON*/
      let isSticky = grp.getAttribute('checkbox-sticky') === 't';

      cboxs = [...grp.getElementsByTagName('INPUT')].filter(a => a.getAttribute('type') === 'checkbox');
      if(cboxs.length) {//group has checkboxes
        for(let i = 0 , l = cboxs.length ; i < l ; i ++ ) {//iterate all checkboxes and add onchange listener
          cboxs[i].onchange = (e) => {
            for(let j = 0 , s = cboxs.length ; j < s ; j ++ ) {//go over all checkboxes
              if(cboxs[j] === e.target) {//this is the clicked one
                if(isSticky) { /*sticky - can't turn off a checkbox*/
                cboxs[j].checked = true;
              }
            } else {//not the clicked one - turn off
              cboxs[j].checked = false;
            }
          }
        };
      }
    }
  });
}
/**********************************************************
add event listeners to all input ranges - show current value
*************************************************************/
let ranges = moreOptionsBody.getElementsByClassName('filter-options-range-wrap');
if(ranges.length) {//no input ranges
  ranges = [...ranges];//to array

  let newNum = '',//hold new number
  newPos = '',//hold new position
  setNewValue = (inpPointer, valElement) => {//function to set new value
    newNum = Number( (inpPointer.value - inpPointer.min) * 100 / (inpPointer.max - inpPointer.min) ),
    newPos = 10 - (newNum * 0.2);
    valElement.innerHTML = `<span>${inpPointer.value}</span>`;
    valElement.style.left = `calc(${newNum}% + (${newPos}px))`;
  };

  ranges.forEach((rng) => {//add listener to all ranges
    let inpPointer = [...rng.getElementsByTagName('INPUT')].filter(a => a.getAttribute('type') === 'range')[0],
    valElement = rng.getElementsByClassName('filter-options-range-value')[0];
    if(inpPointer  && valElement) {
      //run one time to set the initial value
      setNewValue(inpPointer, valElement);
      //and call the function every change
      inpPointer.oninput = () => {
        setNewValue(inpPointer, valElement);
      };
    }
  });
}
}
