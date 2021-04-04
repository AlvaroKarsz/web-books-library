(async () => {
  let els = {
    serieFilter: document.getElementById('serie-filter'),
    nextFilter: document.getElementById('next-filter'),
    prevFilter: document.getElementById('prev-filter'),
    serieObj: document.getElementById('serie-select'),
    serieObjNum: document.getElementById('serie-select-num'),
    nextObj: document.getElementById('next-select'),
    prevObj: document.getElementById('prev-select'),
    nextBook: document.getElementById('next-book-div'),
    nextBookC: document.getElementById('next-book-check'),
    prevBook: document.getElementById('prev-book-div'),
    prevBookC: document.getElementById('prev-book-check'),
    serieDiv: document.getElementById('serie-div'),
    serieC: document.getElementById('serie-check'),
    typeDiv: document.getElementById('type-group'),
    messageBox: document.getElementById('message'),
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    coverHolder: document.getElementById('cover-element-holder'),
    collectionHolder: document.getElementById('collection-holder')
  };

  doFilter(els.serieFilter, els.serieObj);
  doFilter(els.nextFilter, els.nextObj);
  doFilter(els.prevFilter, els.prevObj);
  toggleElement(els.serieC, els.serieDiv, {require:[els.serieObj, els.serieObjNum]});
  toggleElement(els.prevBookC, els.prevBook, {require: [els.prevObj]});
  toggleElement(els.nextBookC, els.nextBook, {require:[els.nextObj]});
  handleCheckboxGroup({div:els.typeDiv});

  new StoriesCollection(els.collectionHolder);
  new CoverSelector(els.coverHolder, {
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



function doFilter(filter, select) {
  let val = '', options = '';
  filter.onkeyup = () => {
    select.value = '';
    val = filter.value;
    options = [...select.getElementsByTagName('OPTION')];
    //hide non matches
    options.filter(a =>  !insensitiveInclude(a.innerText, val)).forEach(a => a.style.display = 'none');
    //show matched
    options.filter(a =>  insensitiveInclude(a.innerText, val)).forEach(a => a.style.display = 'block');
  };
}

function insensitiveInclude(str, needle) {
  return str.toUpperCase().includes(needle.toUpperCase());
}

function toggleElement(checkBox, element, options = {}) {
  const requireValueChange = options.require ? options.require : [];
  const elsToHide = options.hide ? options.hide : [];
  const listenToClick = options.listenToClick ? options.listenToClick : false;
  checkBox.addEventListener(listenToClick ? 'click' : 'change', async  (e) => {
    await runInSeperateThread();//so the other event listener on this element won't crash with this part
    element.style.display = checkBox.checked ? 'block' : 'none';
    requireValueChange.forEach((a) => {
      checkBox.checked && setRequired(a) || !checkBox.checked && removeRequired(a);
    });
    if(checkBox.checked) {
      elsToHide.forEach((a) => {
        a.style.display = 'none';
      });
    }
  });
}

function runInSeperateThread() {//set timeout to 0 sec, so it will not run in "main"
  return new Promise((res,rej) => {
    setTimeout(res, 0);
  });
}

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
