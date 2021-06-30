const settings = require('../settings.js');
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);

class TopNav {
  constructor() {
    this.ROUTES = {
      /*displayer routes - such wish list and books*/
      DISPLAYERS: {
        BOOKS: '/books',
        WISHLIST: '/wishlist',
        SERIES: '/series',
        STORIES: '/stories',
        READS: '/reads',
        PURCHASES: '/purchased'
      },
      /*inserters routes - insert new book/wish...*/
      INSERTERS: {
        BOOKS: '/insert/books',
        WISHLIST: '/insert/wishlist',
        SERIES: '/insert/series',
        STORIES: '/insert/stories'
      },
      /*advance options (backup etc..)*/
      ADVANCE: {
        DB_BACKUP: '/advance/db/backup'
      }

    };
    this.REFERER = '';
    this.URL_PARAMS = {};
  }

  getFilterValue(filterName) {
    return this.URL_PARAMS && this.URL_PARAMS[filterName] ? basic.escapeHtmlString(decodeURIComponent(this.URL_PARAMS[filterName])) : '';
  }

  setUrlParams(urlParams) {
    this.URL_PARAMS = urlParams;
  }

  setReferer(referer) {
    this.REFERER = referer;
  }

  build() {
    return `<div class = "topnav">` +
    `<div class = "dropmenu">` +
    `<button>Display</button>` +
    `<div class = "dropmenu-list">` +
    `<a href="${this.ROUTES.DISPLAYERS.BOOKS}">My Books</a>` +
    `<a href="${this.ROUTES.DISPLAYERS.WISHLIST}">My Wishlist</a>` +
    `<a href="${this.ROUTES.DISPLAYERS.SERIES}">My Series</a>` +
    `<a href="${this.ROUTES.DISPLAYERS.STORIES}">My Stories</a>` +
    `<a href="${this.ROUTES.DISPLAYERS.READS}">My Read List</a>` +
    `<a href="${this.ROUTES.DISPLAYERS.PURCHASES}">My Purchased Books</a>` +
    `</div>` +
    `</div>` +
    `<div class = "dropmenu">` +
    `<button>Insert</button>` +
    `<div class = "dropmenu-list">` +
    `<a href="${this.ROUTES.INSERTERS.BOOKS}">Insert Book</a>` +
    `<a href="${this.ROUTES.INSERTERS.WISHLIST}">Insert Wish</a>` +
    `<a href="${this.ROUTES.INSERTERS.SERIES}">Insert Serie</a>` +
    `<a href="${this.ROUTES.INSERTERS.STORIES}">Insert Story</a>` +
    `</div>` +
    `</div>` +
    `<div class = "dropmenu">` +
    `<button>Advance</button>` +
    `<div class = "dropmenu-list">` +
    `<a href="${this.ROUTES.ADVANCE.DB_BACKUP}">Backup DB</a>` +
    `<a id = 'backup-files-a'>Backup Files To Drive <i class="fa fa-caret-right"></i></a>` +
    `<div class = "dropmenu" side='true'>` +
    `<div class = "dropmenu-list" side='true' id = 'backup-files-menu'>` +
    `<a onclick = "doBackUp('all')">All</a>` +
    `<a onclick = "doBackUp('${settings.BACKUPS_FOLDER_NAME}')">DB Backups</a>` +
    `<a onclick = "doBackUp('${settings.BOOKS_FOLDER_NAME}')">Book Pictures</a>` +
    `<a onclick = "doBackUp('${settings.WISH_LIST_FOLDER_NAME}')">WishList Pictures</a>` +
    `<a onclick = "doBackUp('${settings.STORIES_FOLDER_NAME}')">Stories Pictures</a>` +
    `<a onclick = "doBackUp('${settings.SERIES_FOLDER_NAME}')">Series Pictures</a>` +
    `<a onclick = "doBackUp('${settings.ICONS_FOLDER_NAME}')">App Icons</a>` +
    `<a onclick = "doBackUp('${settings.GENERAL_PICTURES_FOLDER_NAME}')">General Pictures</a>` +
    `<a onclick = "doBackUp('${settings.E_BOOKS_FOLDER_NAME}')">E-Books</a>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    this.buildFilter() +
    `</div>`;
  }

  buildFilter() {
    return `<div class = "topnav-search">` +
    `<label for='filter-toggle-option'>` +
    `<div t = "btn">Search <i class="fa fa-search"></i></div>` +
    `</label>` +
    `<input type='checkbox' class = 'invisible-cb-filter' id = 'filter-toggle-option'>` +
    `<div class = "filter">` +
    `<div class = "filter-title">` +
    `Search:<div class='small-loader' id='filter-ldr' style='width:0;margin-left:-110px;'><div style = 'background:rgba(0,0,0,0.2)'></div></div>` +
    `<button id = 'clear-filters-main' class='filter-clear-button'>Clear All</button>` +
    `</div>` +
    `<form action="" method="GET" id = 'filter-form' autocomplete="off">` +
    `<div class = "filter-options-cbox-group" only-one-allowed='t' id='filter-page-selector' checkbox-sticky='t'>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Book</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='books' ${this.REFERER === 'books' || !this.REFERER ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Wish</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='wishlist' ${this.REFERER === 'wishlist' ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Read</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='reads' ${this.REFERER === 'reads' ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Purchase</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='purchased' ${this.REFERER === 'purchased' ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Serie</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='series' ${this.REFERER === 'series' ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:16.66%">` +
    `<p t="cbox-single">Story</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" trgt='stories' ${this.REFERER === 'stories' ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `</div>` +
    `<div class="filter-line"><p>Title</p><input type="text" name="title" value="${this.getFilterValue('title')}"></div>` +
    `<div class="filter-line"><p>Author</p><input type="text" name="author" value="${this.getFilterValue('author')}"></div>` +
    `<div class="filter-more-less-options-class">` +
    `<div t="more-less" id = "filter-more-options-button">More Options <i class="fa fa-angle-double-down"></i></div>` +
    `</div>` +
    `<div id = "filter-more-options-body" class = "filter-more-options" style = "display:none">` +
    `<div class="filter-line"><p>ISBN</p><input type="text" name="isbn" value="${this.getFilterValue('isbn')}"></div>` +
    `<div class = "filter-options-slider-group">` +
    `<p t="main">Rating</p>` +
    `<div t="single">` +
    `<p t="mini">From</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" default-value="0" min="0" max="5" value="${this.getFilterValue('fromRating') || '0'}" step="0.01" name='fromRating'>` +
    `</div>` +
    `</div>` +
    `<div t="single">` +
    `<p t="mini">To</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" min="0" max="5" default-value="5" value="${this.getFilterValue('toRating') || '5'}" step="0.01" name='toRating'>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div class = "filter-options-slider-group">` +
    `<p t="main">Pages</p>` +
    `<div t="single">` +
    `<p t="mini">From</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" min="1" max="1700" default-value="1" value="${this.getFilterValue('fromPage') || '1'}" step="1" name='fromPage'>` +
    `</div>` +
    `</div>` +
    `<div t="single">` +
    `<p t="mini">To</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" min="1" max="1700" default-value="1700" value="${this.getFilterValue('toPage') || '1700'}" step="1" name='toPage'>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div class = "filter-options-slider-group">` +
    `<p t="main">Publication Year</p>` +
    `<div t="single">` +
    `<p t="mini">From</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" min="1900" default-value="1900" max="${this.getCurrentYear()}" value="${this.getFilterValue('fromYear') || '1900'}" step="1" name='fromYear'>` +
    `</div>` +
    `</div>` +
    `<div t="single">` +
    `<p t="mini">To</p>` +
    `<div class="filter-options-range-wrap">` +
    `<div class="filter-options-range-value"></div>` +
    `<input type="range" min="1900" default-value="${this.getCurrentYear()}" max="${this.getCurrentYear()}" value="${this.getFilterValue('toYear') || this.getCurrentYear()}" step="1" name='toYear'>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div class = "filter-options-cbox-group">` +
    `<p t="main">Format</p>` +
    `<div class = "filter-options-cbox-single">` +
    `<p t="cbox-single">Hardcover</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name="H"  ${this.getFilterValue('H') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single">` +
    `<p t="cbox-single">Paperback</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name="P" ${this.getFilterValue('P') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single">` +
    `<p t="cbox-single">Hardcover no D/J</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name="HN" ${this.getFilterValue('HN') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single">` +
    `<p t="cbox-single">E-Book</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name="E" ${this.getFilterValue('E') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `</div>` +
    `<div class = "filter-options-double-line">` +
    `<div class="filter-line-half"><p>Lang.</p><input type="text" name="language" value="${this.getFilterValue('language')}"></div>` +
    `<div class="filter-line-half"><p>Original Lang.</p><input type="text" name="oLanguage" value="${this.getFilterValue('oLanguage')}"></div>` +
    `</div>` +
    `<div class="filter-line"><p>Tags</p><input type="text" name="tags" value="${this.getFilterValue('tags')}"></div>` +
    `<div class="filter-line"><p>Serie</p><input type="text" name="serie" value="${this.getFilterValue('serie')}"></div>` +
    `<div class="filter-line"><p>Store</p><input type="text" name="store" value="${this.getFilterValue('store')}"></div>` +
    `<div class = "filter-options-cbox-group" only-one-allowed='t'>` +
    `<p t="main">Read</p>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">Yes</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='read' ${this.getFilterValue('read') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">No</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='no-read' ${this.getFilterValue('no-read') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `</div>` +
    `<div class = "filter-options-cbox-group" only-one-allowed='t'>` +
    `<p t="main">is Collection</p>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">Yes</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='collection' ${this.getFilterValue('collection') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">No</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='no-collection' ${this.getFilterValue('no-collection') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `</div>` +
    `<div class = "filter-options-cbox-group" only-one-allowed='t'>` +
    `<p t="main">Owned & want to but again</p>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">Yes</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='owned-buy' ${this.getFilterValue('owned-buy') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `<div class = "filter-options-cbox-single" style = "width:50%">` +
    `<p t="cbox-single">No</p>` +
    `<label class="radio-button-container">` +
    `<input type="checkbox" name='no-owned-buy' ${this.getFilterValue('no-owned-buy') ? "checked" : "" }>` +
    `<span class="radio-button-checkmark"></span>` +
    `</label>`+
    `</div>` +
    `</div>` +
    `<div class="filter-line"><p>Desc.</p><input type="text" name="description" value="${this.getFilterValue('description')}"></div>` +
    `<div class="filter-more-less-options-class">` +
    `<div t="more-less" id = "filter-less-options-button">Less Options <i class="fa fa-angle-double-up"></i></div>` +
    `</div>` +
    `</div>` +
    `<input type="submit" style="display:none">` +
    `</form>` +
    `</div>` +
    `</div>`;
  }

  getCurrentYear() {
    return new Date().getFullYear();
  }

};

module.exports = new TopNav();
