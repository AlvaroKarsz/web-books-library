const settings = require('../settings.js');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const ip = require("ip");

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

  getYYYYMMDDcurrentDate(delimiter = '-') {
    let date = new Date();
    return `${date.getFullYear()}${delimiter}${date.getMonth() + 1 /*starts from 0*/}${delimiter}${date.getDate()}`;
  }

  getTodaysEpoch() {
    return + new Date(this.getYYYYMMDDcurrentDate());
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
    fs.readdirSync(path.join(settings.ROOT_PATH , folderName)).forEach((pic) => {
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

  async doFetch(url, settings=null, options = {}) {
    settings = settings ? settings : {method:'GET'};
    let response = [fetch(url, settings )];
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

  addCommasToNum(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  insensitiveCompare(a,b) {
    if(typeof a === 'boolean' ||  typeof b === 'boolean') {//in case of booleans
      return a === b;
    }
    return a.toLowerCase().trim() === b.toLowerCase().trim();
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

  escapeHtmlString(s) {
    if(!s) {
      return '';
    }
    return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  }

  getFilters(urlParams) {
    let filters = {};
    if('author' in urlParams) {
      filters.authorFilter = decodeURIComponent(urlParams['author']);
    }
    if('title' in urlParams) {
      filters.titleFilter = decodeURIComponent(urlParams['title']);
    }
    if('sort' in urlParams) {
      filters.sort = decodeURIComponent(urlParams['sort']);
    }
    return filters;
  }

  convertFolderType(type) {
    return {
      books: settings.BOOKS_FOLDER_NAME,
      wishlist: settings.WISH_LIST_FOLDER_NAME,
      series: settings.SERIES_FOLDER_NAME,
      stories: settings.STORIES_FOLDER_NAME,
      reads: settings.BOOKS_FOLDER_NAME,
      purchased: settings.WISH_LIST_FOLDER_NAME,
      icon: settings.ICONS_FOLDER_NAME
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

  sleep(t) {
    return new Promise(res => setTimeout(res, t));
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

  buildRefererUrl(referer, text, isError = true) {
    const errorMessageParam = 'err-msg',
    successMessageParam = 'suc-msg';

    let url = referer;

    /* no query params, add the first one */
    if(referer.indexOf('?') === -1) {
      url += '?';
    } else {
      /* query params exists - add a new one */
      url += '&';
    }

    /*add param name*/
    url += isError ? errorMessageParam : successMessageParam;

    /*add param value*/

    url += '=' + text;

    return url;
  }

}
module.exports = new Basic();
