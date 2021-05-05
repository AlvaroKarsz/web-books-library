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
    `<a onclick = "doBackUp('backups')">DB Backups</a>` +
    `<a onclick = "doBackUp('books')">Book Pictures</a>` +
    `<a onclick = "doBackUp('wishlist')">WishList Pictures</a>` +
    `<a onclick = "doBackUp('stories')">Stories Pictures</a>` +
    `<a onclick = "doBackUp('series')">Series Pictures</a>` +
    `<a onclick = "doBackUp('icons')">App Icons</a>` +
    `<a onclick = "doBackUp('generalPics')">General Pictures</a>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `</div>`;
  }

};

module.exports = new TopNav();
