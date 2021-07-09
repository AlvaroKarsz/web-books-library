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
IMAGES: post listing images
LOADER_IF_BOOKS: add loader if there are more books to fetch
HTML_TITLE: add page title
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
    required for TOPNAV, LOADER_IF_BOOKS

    objects => array of relevant listing info
    required for IMAGES

    urlParams => url parameters from user
    required for TOP_NAV

    imageHref => endpoint to fetch pictures from backend
    required for IMAGES and IMAGES

    route => route to fetch data from backend after a sort filter was applied
    required for TOP_NAV

    pageTitle => Action title, relevant for html pages that insert/update listings (Insert new Book / Update Wishlist...)
    required for INSERTION_TITLE

    typeTitle => My Books, My Wishlist ..
    required for TOPNAV

    displayer => displayer data after calling build()
    requred for DISPLAYER
    */

    /*
    LIST OF KEYS AND REPLACEMENTS
    */
    const keys = {
      IMAGES: "this.postPictures(params.folder, params.objects, params.imageHref, params.urlParams)",
      LOADER_IF_BOOKS: "this.createMainLoaderIfBooksFound(params.totalCount)",
      TOP_NAV: "topNav.setElementsNumber(params.totalCount); topNav.setPageType(params.typeTitle); topNav.setUrlParams(params.urlParams); topNav.setReferer(params.route); topNav.build()",
      DISPLAYER:"params.displayer",
      INSERTION_TITLE: "params.pageTitle",
      HTML_TITLE: "params.htmlTitle"
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

  createMainLoaderIfBooksFound(books) {
    if(books > settings.IMAGES_NUM_PER_PAGE) {
      return '<div class="bottom-loader" id = "main-ldr"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
    }
  }

  buildBookObject(book,type, href, urlParams) {
    return `<div class = "obj"><p>${book.name}</p><a href = "${basic.setUrlParams(urlParams, href + book.id)}">${this.putPicture(type, book.id)}</a></div>`;
  }

  putPicture(type, id) {
    return `<img src="/pic/${type}/${id}">`;
  }

  postPictures(folder, objects, actionScriptOnclick, urlParams) {
    let str = '<div class = "line">';
    for(let i = 0 , l = objects.length; i < l ; i ++ ) {
      if(i % settings.BOOKS_PER_ROW === 0) {
        str += "</div><div class = 'line'>";
      }
      str += this.buildBookObject(objects[i],folder ,actionScriptOnclick, urlParams);
    }
    str += '</div>';
    return str;
  }
};

module.exports = new HtmlRender();
