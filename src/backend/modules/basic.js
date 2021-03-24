const fetch = require('node-fetch');
const db = require('../db/functions');
const path = require('path');
const fs = require('fs');
const config = require('../config.js');

class Basic {
  constructor(){}

  toInt(num, base=10) {
    return parseInt(num, base);
  }

  intSum(a, b) {
    return this.toInt(a) + this.toInt(b);
  }

  getPictureMime(folderName, pictureId) {
    let result = null;
    fs.readdirSync(path.join(__dirname, '..' ,'..','..', folderName)).forEach((pic) => {
      if(new RegExp("^" + pictureId + "[.]").test(pic)) {
        result = pic;
        return;
      }
    });
    return result;
  }


  async doFetch(url, settings = null, options = {}) {
    let response = [fetch(url, settings)];

    if(options.timeout && this.isNumber(options.timeout)) {
      response.push(
        new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(null);
          }, options.timeout);
        })
      );
    }
    try {
      response = await Promise.race(response);

      if(response === null) {//timeout
        throw '';
      }
      if(options.text) {
        response = await response.text();
      } else if (options.buffer) {
        response = await response.arrayBuffer();
      } else {
        response = await response.json();
      }
    } catch(e) {
      response = null;
    }
    return response;
  }

  generateRandomString(len) {
    const options = 'qDbnazxYUJsSWEhyujmQAZXCwedxsSWcNHYUvfNHMKILOPrtgVFRTGBkil_op1745289603';
    let output = '';
    for(let i = 0 ; i < len ; i ++ ) {
      output += options[this.generateRandomNumberInRange(0,options.length)];
    }
    return output;
  }

  generateRandomNumberInRange(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  insensitiveInclude2Ways(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    return str1.includes(str2) || str2.includes(str1);
  }

  async renderHtml(params) {
    /*
    params object options:
    html => html string
    folder => folder name to fetch pictures
    totalCount => total objects in relevant table
    objects => the actual books/stories/wishes..
    urlParams => url params from get request
    title => title of object (Books, Wish List..)
    route => request route
    */

    const keys = {
      TYPE: "params.title",
      TOT_COUNT: "params.totalCount",
      FILTER_VAL_TITLE: "this.getFilterValue(params.urlParams, 'title')",
      FILTER_VAL_AUTHOR: "this.getFilterValue(params.urlParams, 'author')",
      SORT_OPTIONS: "this.getSortOptions(params.urlParams, params.route)",
      IMAGES: "this.postPictures(params.folder, params.objects)",
      SERIES: "this.setSeriesInSelectBox()",
      BOOKS: "this.setBooksInSelectBox()",
      LOADER_IF_BOOKS: "this.createMainLoaderIfBooksFound(params.totalCount)",
      TOP_NAV: "this.echoTopNav()"
    };

    let rgx = '';
    for(let key in keys) {
      rgx = new RegExp("\{\{" + key + "\}\}",'g');
      if(rgx.test(params.html)) {
        params.html = params.html.replace(rgx,await eval(keys[key]));
      }
    }

    return params.html;
  }

  getFilterValue(urlParams, filterName) {
    return urlParams[filterName] ? unescape(urlParams[filterName]) : '';
  }

  createMainLoaderIfBooksFound(books) {
    if(books > config.IMAGES_NUM) {
      return '<div class="bottom-loader" id = "main-ldr"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
    }
  }

  async setBooksInSelectBox() {
    let str = '<option value="">-- SELECT --</option>';
    let books = await db.fetchBooksForHtml();
    books.forEach((book) => {
      str += `<option value="${book.id}">${book.text}</option>`
    });
    return str;
  }

  async setSeriesInSelectBox() {
    let str = '<option value="">-- SELECT --</option>';
    let series = await db.fetchSeriesForHtml();
    series.forEach((serie) => {
      str += `<option value="${serie.id}">${serie.text}</option>`
    });
    return str;
  }


  getSortOptions(urlParams, requestRoute) {
    let str = `<option value="">-- SELECT --</option>`;//default one
    const options = {
      "rat-h": {
        name:  "Rating - Higher",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased']
      },
      "rat-l": {
        name: "Rating - Lower",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased']
      },
      "pub-h": {
        name: "Publication Year - Newer",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased']
      },
      "pub-l": {
        name: "Publication Year - Older",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased']
      },
      "pag-h": {
        name: "Number of Pages - Bigger",
        routes:['books', 'stories', 'reads']
      },
      "pag-l": {
        name: "Number of Pages - Lower",
        routes:['books', 'stories', 'reads']
      },
      "titl-a": {
        name: "Title - ASC",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased', 'series']
      },
      "titl-d": {
        name: "Title - DESC",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased', 'series']
      },
      'rd-n': {
        name: "Read order",
        routes:['books', 'stories', 'reads']
      },
      'rd-r': {
        name: "Read order - Reversed",
        routes:['books', 'stories', 'reads']
      },
      'lst-f': {
        name: "List order - Newer",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased', 'series']
      },
      'lst-l': {
        name: "List order - Older",
        routes:['books', 'wishlist', 'stories', 'reads', 'purchased', 'series']
      },
      'prc-f': {
        name: "Purchase order - Newer",
        routes:['purchased']
      },
      'prc-l': {
        name: "Purchase order - Older",
        routes:['purchased']
      },
      'cln-f': {
        name: "Collection Name - ASC",
        routes:['stories']
      },
      'cln-l': {
        name: "Collection Name - DESC",
        routes:['stories']
      },
      'owb-b': {
        name: "Owned Books - Max.",
        routes:['series']
      },
      'owb-s': {
        name: "Owned Books - Min.",
        routes:['series']
      },
      'rdb-b': {
        name: "Books Read - Max.",
        routes:['series']
      },
      'rdb-s': {
        name: "Books Read - Min.",
        routes:['series']
      },
      'wsb-b': {
        name: "Books in WishList - Max.",
        routes:['series']
      },
      'wsb-s': {
        name: "Books in WishList - Min.",
        routes:['series']
      }
    };

    for(let opt in options) {
      if(options[opt].routes.includes(requestRoute)) {
        str += `<option value="${opt}" ${opt == urlParams['sort'] ? 'selected' : ''}>${options[opt].name}</option>`;
      }
    }
    return str;
  }

  postPictures(folder, objects) {
    let str = '<div class = "line">';
    for(let i = 0 , l = objects.length; i < l ; i ++ ) {
      if(i % config.BOOKS_PER_ROW === 0) {
        str += "</div><div class = 'line'>";
      }
      str += this.buildBookObject(objects[i],folder);
    }
    str += '</div>';
    return str;
  }


  buildBookObject(book,type) {
    return '<div class = "obj"><p>' + book.name + "</p>" + '<img src = "/pic/' + type + '/' + book.id + '"></div>';
  }

  getUrlParams(url) {
    let out = {};
    url = url.split("?");
    url.shift();//keep GET params only
    url = url.join("?");//in case oaram include "?"
    url = url.split("&");
    url = url.map(a => a.split("="));
    url.forEach((a) => {
      if(a[0] !== '') {
        out[a[0]] = typeof a[1] !== 'undefined' ? a[1] : '';
      }
    });
    return out;
  }

  getFilters(urlParams) {
    let filters = {};
    if('author' in urlParams) {
      filters.authorFilter = urlParams['author'];
    }
    if('title' in urlParams) {
      filters.titleFilter = urlParams['title'];
    }
    if('sort' in urlParams) {
      filters.sort = urlParams['sort'];
    }
    return filters;
  }

  convertFolderType(type) {
    return {
      books: 'books',
      wishlist: 'wishlist',
      series: 'series',
      stories: 'stories',
      reads: 'books',
      purchased: 'wishlist'
    }[type];
  }

  exists(a) {
    return typeof a !== "undefined";
  }

  isObject(s) {
    return typeof s === 'object' && s;
  }

  isArray(arr){
    return this.exists(arr) && Array.isArray(arr);
  }

  isBool(a) {
    return a === !!a;
  }

  isNull(a) {
    return a === null;
  }

  isNumber(a) {
    return Number(a) === a;
  }

  doTrim(a) {
    return !this.isBool(a) && !this.isNumber(a) && !this.isNull(a) && this.exists(a) ? a.trim() : a;
  }

  trimAllFormData(dataObj) {
    if(this.isObject(dataObj)) {
      for(let key in dataObj) {
        if(this.isArray(dataObj[key]) || this.isObject(dataObj[key])) {
          dataObj[key] = this.trimAllFormData(dataObj[key]);
        } else {
          dataObj[key] = this.doTrim(dataObj[key]);
        }
      }
    } else if(this.isArray(dataObj)) {
      for(let i = 0 , l = dataObj.length ; i < l ; i ++ ) {
        if(this.isArray(dataObj[i]) || this.isObject(dataObj[i])) {
          dataObj[i] = this.trimAllFormData(dataObj[i]);
        } else {
          dataObj[i] = this.doTrim(dataObj[i]);
        }
      }
    } else {
      dataObj = this.doTrim(dataObj);
    }
    return dataObj;
  }

  isValidInt(num){
    return /^[0-9]+$/.test(num) && num > 0;
  }

  echoTopNav() {
    return `<div class = "topnav">
    <div class = "dropmenu">
    <button>Display</button>
    <div class = "dropmenu-list">
    <a href="/books">My Books</a>
    <a href="/wishlist">My Wishlist</a>
    <a href="/series">My Series</a>
    <a href="/stories">My Stories</a>
    <a href="/reads">My Read List</a>
    <a href="/purchased">My Purchased Books</a>
    </div>
    </div>
    <div class = "dropmenu">
    <button>Insert</button>
    <div class = "dropmenu-list">
    <a href="/insert/book">Insert Book</a>
    <a href="/insert/wish">Insert Wish</a>
    <a href="/insert/serie">Insert Serie</a>
    </div>
    </div>
    </div>`;
  }
}
module.exports = new Basic();
