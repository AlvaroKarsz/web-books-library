const fetch = require('node-fetch');
const db = require('../db/functions');
const path = require('path');
const fs = require('fs');
const ip = require("ip");
const settings = require('../settings.js');
const topNav = require('../gui/topNav.js');

class Basic {
  toInt(num, base=10) {
    return parseInt(num, base);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  readDateForDB(date) {
    /*
    Examples for valid dates:
    jan 2020
    jan 2020 - mar 2020
    */

    /*trim string*/
    date = date.trim();
    /*empty date (may be the case is date is only white spaces)*/
    if(!date) {
      return null;
    }

    /*get today date*/
    let today = new Date(),
    thisYear = today.getFullYear(),
    thisMonth = today.getMonth();//returns INDEX!!

    /*list of valid month codes that can be used*/
    const validMonthCodes = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec'
    ];

    /*months will be capitalize later, for now convert to lower case*/
    date = date.toLowerCase();

    /*remove all white spaces from date*/
    date = date.replace(/\s+/g, '');

    /*
    without withspaces date format should follow:

    CASE 1:
    3 letters (first month) and 4 digits (year)                                                                 EXAMPLE: jan2020
    CASE 2:
    3 letters (from month) and 4 digits (from year) and "-" and 3 letters (to month) and 4 digits (to year)     EXAMPLE: jan2020-mar2020
    */

    /*CASE 1:*/

    if(/^[a-z]{3}[0-9]{4}$/.test(date)) {
      let month = date.slice(0,3),//first 3 chars
      year = date.slice(-4);//last 4 chars

      /*invalid month code*/
      if(! validMonthCodes.includes(month)) {
        return false;
      }

      /*inserted year is bigger than current year*/
      if(this.isBiggerInt(year, thisYear)) {
        return false;
      }

      /*same year as today's year - but bigger month*/
      if(this.isEqualInt(year, thisYear) && this.isBiggerInt(validMonthCodes.indexOf(month), thisMonth)) {
        return false;
      }

      /*valid date - beautify it*/
      return `${this.capitalize(month)} ${year}`;
    }

    /*CASE 2:*/

    if(/^[a-z]{3}[0-9]{4}\-[a-z]{3}[0-9]{4}$/.test(date)) {
      let month1 = date.slice(0,3),//first 3 chars
      year1 = date.slice(3,7),//following 4 chars
      month2 =  date.slice(8,11),//following 3 chars (ignoring "-")
      year2 =  date.slice(-4);//last 4 chars

      /*invalid month code for one of the months*/
      if(! validMonthCodes.includes(month1) || ! validMonthCodes.includes(month2)) {
        return false;
      }

      /*first year is bigger than second year*/
      if(this.isBiggerInt(year1, year2)) {
        return false;
      }

      /*same year but first month is bigger than second month*/
      if(this.isEqualInt(year1, year2) && this.isBiggerInt(validMonthCodes.indexOf(month1), validMonthCodes.indexOf(month2))) {
        return false;
      }

      /*second year is bigger than today's year*/
      if(this.isBiggerInt(year2, thisYear)) {
        return false;
      }

      /*second year is same as today's year but has bigger month*/
      if(this.isEqualInt(year2, thisYear) && this.isBiggerInt(validMonthCodes.indexOf(month2), thisMonth)) {
        return false;
      }

      /*
      same month and year
      not an error - just return like CASE 1 format
      */
      if(this.isEqualInt(year2, year1) && month1 === month2) {
        return `${this.capitalize(month1)} ${year1}`;
      }

      /*valid date - beautify it*/
      return `${this.capitalize(month1)} ${year1} - ${this.capitalize(month2)} ${year2}`;
    }

    /*no match for any of the allowed cases*/
    return false;
  }

  monthNameFromIndex(i) {
    return ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"][i];
  }

  dayMonthToMonthDay(date) {
    date = date.split("/");
    /*swap day and month*/
    [date[0], date[1]] = [date[1], date[0]];
    return date.join("/");
  }

  beautifyDate(uglyDate) {
    uglyDate = new Date(uglyDate);
    return `${uglyDate.getDate()}/${this.monthNameFromIndex(uglyDate.getMonth())}/${uglyDate.getFullYear()}`;
  }

  intSum(a, b) {
    return this.toInt(a) + this.toInt(b);
  }

  isBiggerInt(a, b) {
    return this.toInt(a) > this.toInt(b);
  }

  getDecimalPartOfNumber(num) {
    return Number((num - Math.trunc(num)).toFixed(3));
  }

  isEqualInt(a, b) {
    return this.toInt(a) === this.toInt(b);
  }

  isBiggerOrEqualInt(a, b) {
    return this.isBiggerInt(a,b) || this.isEqualInt(a,b);
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

  findAllIndexes(arr, el, insensitive = false) {
    /*if insensitive convert all to lower case*/
    if(insensitive) {
      arr = arr.map(a => a.toLowerCase());
    }
    let output = [], idx;
    /*infinite loop until break - indexOf returns (-1)*/
    while(true) {
      idx = arr.indexOf(el);
      /*el not present in array - exit*/
      if(idx === -1) {
        break;
      }
      /*save index*/
      output.push(idx);
      /*cut arr - start next index search from (this index + 1)*/
      arr = arr.slice(idx + 1);
    }
    return output;
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
      IMAGES: "this.postPictures(params.folder, params.objects, params.imageHref)",
      LOADER_IF_BOOKS: "this.createMainLoaderIfBooksFound(params.totalCount)",
      TOP_NAV: "topNav.build()",
      DISPLAYER:"params.displayer",
      INSERTION_TITLE: "params.pageTitle"
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
    if(books > settings.IMAGES_NUM_PER_PAGE) {
      return '<div class="bottom-loader" id = "main-ldr"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
    }
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

  postPictures(folder, objects, actionScriptOnclick) {
    let str = '<div class = "line">';
    for(let i = 0 , l = objects.length; i < l ; i ++ ) {
      if(i % settings.BOOKS_PER_ROW === 0) {
        str += "</div><div class = 'line'>";
      }
      str += this.buildBookObject(objects[i],folder ,actionScriptOnclick);
    }
    str += '</div>';
    return str;
  }

  addCommasToNum(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  insensitiveCompare(a,b) {
    if(typeof a === 'boolean' ||  typeof b === 'boolean') {//in case of booleans
      return a === b;
    }
    return a.toLowerCase().trim() === b.toLowerCase().trim();
  }

  buildBookObject(book,type, href) {
    return `<div class = "obj"><p>${book.name}</p><a onclick = "window.location = '${href + book.id}' + window.location.search;">${this.putPicture(type, book.id)}</a></div>`;
  }


  putPicture(type, id) {
    return `<img src="/pic/${type}/${id}">`;
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
      purchased: 'wishlist',
      icon: 'icons'
    }[type];
  }

  exists(a) {
    return typeof a !== "undefined";
  }

  isObject(s) {
    return typeof s === 'object' && s;
  }

  isEmptyObject(e) {
    return this.isObject(e) && Object.keys(e).length === 0;
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

  isDigits(a) {
    return /^[0-9]+$/.test(a);
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

  formDataToJson(formData) {
    let json = {}, tmp, tracker;
    for(let i in formData ) {
      tmp = this.formDataNameToKeys(i);
      if(tmp.path) {//this is a json
        if(typeof json[tmp.name] === 'undefined') {//first time this name appers in json
          json[tmp.name] = {};
        }
        //iterate path and create the parts that not exist
        tracker = json[tmp.name];
        for(let o = 0 , l = tmp.path.length ; o < l ; o ++ ) {
          if(o !== tmp.path.length - 1) {//this is not the last element, create path or walk inside
            if(typeof tracker[tmp.path[o]] === 'undefined') {//not eixst - create it
              tracker[tmp.path[o]] = {};
            }
            //walk in
            tracker = tracker[tmp.path[o]];
          } else {//last element - set value
            tracker[tmp.path[o]] = this.stringToDataAndType(formData[i]);//convert "false" to false, "null" to null
          }
        }
      } else {//no path just a normal variable
        json[tmp.name] = this.stringToDataAndType(formData[i]);//convert "false" to false, "null" to null
      }
    }
    /*
    if this book is a collection of stories it will appear like:
    collection: {
    '0': {title: '...',pages: '..',author: '..',cover: '..'},
    '1': {title: '...',pages: '..',author: '..',cover: '..'},
    ...

    the keys are just the index in the array that was transformed to fromdata before submitting it
    convert it to array
    */

    if(json.collection && this.isObject(json.collection) && !this.isEmptyObject(json.collection) ) {
      json.collection = Object.values(json.collection);
    }
    return json;
  }

  stringToDataAndType(dta) {
    /*
    "false" to false
    "undefined" to undefined
    "null" to null
    oterwise return the input
    */
    switch(dta) {
      case 'false':
      return false;
      break;
      case 'null':
      return null;
      break;
      case 'undefined':
      return undefined;
      break;
      default:
      return dta;
      break;
    }
  }

  formDataNameToKeys(name) {
    let out = {
      /*get name before parameters*/
      name: name.split('[')[0],
      path: null
    }
    name = name.match(/\[(.*?)\]/g);
    if(name) {
      out.path = name.map(a => a.replace(/[\[]/,'').replace(/[\]]/,''));
    }
    return out;
  }

  getLocalIpAddress() {
    return  ip.address();
  }
}
module.exports = new Basic();
