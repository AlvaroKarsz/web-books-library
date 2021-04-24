(async () => {
  let settings = {
    elements: {
      sort: document.getElementById('sort'),
      filter: document.getElementById('filter'),
      clear: document.getElementById('clear'),
      filterLoader: document.getElementById('filter-ldr'),
      imagesHolder: document.getElementById('imgs'),
      mainLoader: document.getElementById('main-ldr')
    },
    vars: {
      ratioForFetch: 0.97
    },
    scripts: {
      fetchNext: `${this.location.href.split('?')[0].replace(/\/$/,'')}/next/`,
      pageSettings: `/display/settings`
    }
  };
  handleSortSubmit(settings.elements.sort);
  handleFilterSubmit(settings.elements.filter, settings.elements.filterLoader);
  handleClear(settings.elements.clear, settings.elements.filterLoader);
  loadBooksOnBottomReach(settings.vars.ratioForFetch, settings.scripts.fetchNext, settings.scripts.pageSettings, settings.elements.imagesHolder, settings.elements.mainLoader);
})()


function handleSortSubmit(selectBox) {
  selectBox.onchange = (e) => {
    let form = selectBox.form,
    loader = [...form.getElementsByTagName("DIV")].filter(a => a.getAttribute('loader') === 'true')[0];
    loader.style.display = 'inline-block';
    let urlParams = getUrlParams();
    if(selectBox.value) {
      urlParams[selectBox.name] = selectBox.value;
    } else {
      delete urlParams[selectBox.name];
    }
    setUrlParams(urlParams)
  };
}

function setUrlParams(params) {
  let url = window.location.href.split('?')[0] + '?';
  for(let val in params) {
    url += val + '=' + params[val] + '&';
  }
  url = url.replace(/([&]|[?])$/,'');//remove last & or ?
  window.location.href = url;
}

function handleFilterSubmit(filter, loader) {
  filter.onsubmit = (e) => {
    loader.style.display = 'inline-block';
    e.preventDefault();
    //get form params
    let objects = {};
    [...filter.elements].filter(a => a.nodeName === 'INPUT' && a.getAttribute('TYPE') === 'text').forEach(a => objects[a.name] = a.value);
    //add params to already existing params
    let params = getUrlParams();
    for(let a in objects) {
      if(objects[a] !== '') {
        params[a] = objects[a];
      } else {
        delete params[a];
      }
    }
    setUrlParams(params);
  };
}

function handleClear(button, loader) {
  button.onclick = () => {
    loader.style.display = 'inline-block';
    clearUrl();
  };
}

function clearUrl() {
  window.location.href = window.location.href.split('?')[0];
}

async function loadBooksOnBottomReach(ratio, actionScript, fetchScript, imagesHolder, loader) {
  //first fetch page settings - then define auto loader
  let pageSettings = await fetchPageSettings(fetchScript),
  nextFetch = pageSettings.perPage,
  inProcess = false, rowHolder = '';
  this.onscroll = async () => {
    if(!inProcess && (this.innerHeight + this.scrollY) >= document.body.offsetHeight * ratio) {
      inProcess = true;//lock this code
      let fetchReq = await doHttpRequest(actionScript + nextFetch + this.location.search);
      if(!fetchReq) {
        console.error('Could not fetch books');
        inProcess = false;
        return;
      }
      if(!fetchReq.more) {//no more books
        this.onscroll = null;
        loader.remove();
      }
      nextFetch += fetchReq.books.length;
      fetchReq.books.forEach((img, i) => {
        if(i % pageSettings.perRow === 0) {
          rowHolder = document.createElement('DIV');
          rowHolder.className = 'line';
          imagesHolder.appendChild(rowHolder);
        }
        buildBookObject(img.name, pageSettings.page, img.id, rowHolder)
      });
      inProcess = false;
    }
  };
}

function buildBookObject(bookName, bookType, bookId, htmlHolder) {
  let div = document.createElement('DIV'),
  p = document.createElement('P'),
  a = document.createElement('A'),
  img = document.createElement('IMG');
  div.className = 'obj';
  p.innerHTML = bookName;
  img.src = "/pic/" + bookType + '/' + bookId;
  a.setAttribute('onclick', `window.location = "/${bookType}/${bookId}" + window.location.search;`);
  div.appendChild(p);
  a.appendChild(img);
  div.appendChild(a);
  htmlHolder.appendChild(div);
}

async function fetchPageSettings(actionScr) {
  let pageSettings = {
    perRow: 4,//default value
    perPage: 20,//default value
    page: this.location.pathname.replace(/\//g,'')
  };
  let fetchReq = await doHttpRequest(actionScr);
  if(fetchReq) {
    pageSettings.perRow = fetchReq.perRow;
    pageSettings.perPage = fetchReq.perPage;
  }
  return pageSettings;
}
