(async () => {
  let settings = {
    elements: {
      imagesHolder: document.getElementById('imgs'),
      mainLoader: document.getElementById('main-ldr'),
      sort: document.getElementById('sort')
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
  loadBooksOnBottomReach(settings.vars.ratioForFetch, settings.scripts.fetchNext, settings.scripts.pageSettings, settings.elements.imagesHolder, settings.elements.mainLoader);
})()


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
