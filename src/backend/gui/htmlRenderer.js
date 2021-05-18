const settings = require('../settings.js');
const topNav = require(settings.SOURCE_CODE_BACKEND_TOP_NAV_GUI_FILE_PATH);
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const fs = require('fs');
const path = require('path');

/*
CREATES HTML STRING
REPLACES KEYS WITH AGREED VLUES
ALLOWED KEYS:

TOP_NAV: generates main top navigator
DISPLAYER: signle listing details (book/wishlist/serie/story...)
INSERTION_TITLE: Action title, relevant for html pages that insert/update listings (Insert new Book / Update Wishlist...)
SORT_OPTIONS: build elemets with all sort options available (sort by rating desc, sort by number of pages...)
TYPE: type of elements (books/wishlists/stories...)
TOT_COUNT: number of relevant listings (for example, number of books) this will return number of listings after applying filters as well
IMAGES: post listing images
LOADER_IF_BOOKS: add loader if there are more books to fetch
FILTER_VAL_TITLE: adds current title filder value to filter input
FILTER_VAL_AUTHOR: adds current author filder value to filter input
*/


class HtmlRender {
  constructor() {
    this.PATH_TO_HTML_FOLDER = settings.SOURCE_CODE_HTML_PATH;
  }

  async render(params = {}) {
    /*
    params object options:

    html => html file name to manipulate
    required for every KEY

    folder => folder name to find relevant pictures
    required for IMAGES

    totalCount => number of relevant elements count
    required for TOT_COUNT, LOADER_IF_BOOKS

    objects => array of relevant listing info
    required for IMAGES

    urlParams => url parameters from user
    required for FILTER_VAL_TITLE, FILTER_VAL_AUTHOR, SORT_OPTIONS

    imageHref => endpoint to fetch pictures from backend
    required for IMAGES

    route => route to fetch data from backend after a sort filter was applied
    required for SORT_OPTIONS

    pageTitle => Action title, relevant for html pages that insert/update listings (Insert new Book / Update Wishlist...)
    required for INSERTION_TITLE

    type => listing type (book/wish...)
    required for TYPE

    displayer => displayer data after calling build()
    requred for DISPLAYER
    */


    /*
    LIST OF KEYS AND REPLACEMENTS
    */
    const keys = {
      TYPE: "params.type",
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

    /*fetch html content*/
    let htmlContent = this.getHtmlContent(params.html);

    let rgx = '';
    for(let key in keys) {
      rgx = new RegExp("\{\{" + key + "\}\}",'g');
      if(rgx.test(htmlContent)) {
        htmlContent = htmlContent.replace(rgx,await eval(keys[key]));
      }
    }

    return htmlContent;
  }

  getHtmlContent(fileName) {
    try{
      return fs.readFileSync(path.join(this.PATH_TO_HTML_FOLDER , fileName) ,'UTF8');
    } catch(err) {
      /*empty string - file not exists or no permission to open*/
      return '';
    }
  }

  getFilterValue(urlParams, filterName) {
    return urlParams[filterName] ? basic.escapeHtmlString(decodeURIComponent(urlParams[filterName])) : '';
  }

  createMainLoaderIfBooksFound(books) {
    if(books > settings.IMAGES_NUM_PER_PAGE) {
      return '<div class="bottom-loader" id = "main-ldr"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
    }
  }

  buildBookObject(book,type, href) {
    return `<div class = "obj"><p>${book.name}</p><a onclick = "window.location = '${href + book.id}' + window.location.search;">${this.putPicture(type, book.id)}</a></div>`;
  }

  putPicture(type, id) {
    return `<img src="/pic/${type}/${id}">`;
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

};

module.exports = new HtmlRender();
