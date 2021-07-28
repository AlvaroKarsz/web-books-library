const path = require("path");


module.exports = new function() {

  /**********************************************************************************************************************************************/
  /*DIRECTORIES NAMES*/
  this.GENERAL_PICTURES_FOLDER_NAME = 'generalPics';
  this.BACKUPS_FOLDER_NAME = 'backups';
  this.BOOKS_FOLDER_NAME = 'books';
  this.E_BOOKS_FOLDER_NAME = 'e-books';
  this.ICONS_FOLDER_NAME = 'icons';
  this.LOGS_FOLDER_NAME = 'logs';
  this.SERIES_FOLDER_NAME = 'series';
  this.GROUPS_FOLDER_NAME = 'groups';
  this.SORCE_CODE_FOLDER_NAME = 'src';
  this.STORIES_FOLDER_NAME = 'stories';
  this.WISH_LIST_FOLDER_NAME = 'wishlist';
  this.SOURCE_CODE_BACKEND_FOLDER_NAME = 'backend';
  this.SOURCE_CODE_FRONTEND_FOLDER_NAME = 'frontend';
  this.SOURCE_CODE_HTML_FOLDER_NAME = 'html';
  this.SOURCE_CODE_STYLE_FOLDER_NAME = 'style';
  this.SOURCE_CODE_BACKEND_DATABASE_FOLDER_NAME = 'db';
  this.SOURCE_CODE_BACKEND_DATABASE_PROTOTYPES_FOLDER_NAME = 'prototypes';
  this.SOURCE_CODE_BACKEND_GUI_FOLDER_NAME = 'gui';
  this.SOURCE_CODE_BACKEND_MODULES_FOLDER_NAME = 'modules';
  this.SOURCE_CODE_BACKEND_ROUTES_FOLDER_NAME = 'routes';
  this.SOURCE_CODE_BACKEND_TOKENS_FOLDER_NAME = 'tokens';
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*SOURCE FILE NAMES*/
  this.SOURCE_CODE_STYLE_FILE_NAME = 'style.css';
  this.SOURCE_CODE_HTML_MAIN_FILE_NAME = 'main.html';
  this.SOURCE_CODE_HTML_INSERT_WISH_FILE_NAME = 'insertWish.html';
  this.SOURCE_CODE_HTML_INSERT_STORY_FILE_NAME = 'insertStory.html';
  this.SOURCE_CODE_HTML_INSERT_SERIE_FILE_NAME = 'insertSerie.html';
  this.SOURCE_CODE_HTML_INSERT_BOOK_FILE_NAME = 'insertBook.html';
  this.SOURCE_CODE_HTML_INSERT_GROUP_FILE_NAME = 'insertGroup.html';
  this.SOURCE_CODE_HTML_DISPLAY_FILE_NAME = 'display.html';
  this.SOURCE_CODE_FRONTEND_INSERT_WISH_FILE_NAME = 'insertWish.js';
  this.SOURCE_CODE_FRONTEND_INSERT_STORY_FILE_NAME = 'insertStory.js';
  this.SOURCE_CODE_FRONTEND_INSERT_GROUP_FILE_NAME = 'insertGroup.js';
  this.SOURCE_CODE_FRONTEND_INSERT_SERIE_FILE_NAME = 'insertSerie.js';
  this.SOURCE_CODE_FRONTEND_INSERT_BOOK_FILE_NAME = 'insertBook.js';
  this.SOURCE_CODE_FRONTEND_COMMON_FILE_NAME = 'common.js';
  this.SOURCE_CODE_FRONTEND_AUTOMATIC_FILE_NAME = 'automatic.js';
  this.SOURCE_CODE_FRONTEND_MAIN_FILE_NAME = 'code.js';
  this.SOURCE_CODE_BACKEND_CONFIG_FILE_NAME = 'config.js';
  this.SOURCE_CODE_BACKEND_INDEX_FILE_NAME = 'index.js';
  this.SOURCE_CODE_BACKEND_SETTINGS_FILE_NAME = 'settings.js';
  this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_TOKEN_FILE_NAME = 'driveToken.json';
  this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_CREDENTIALS_FILE_NAME = 'driveCredentials.json';
  this.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_NAME = 'basic.js';
  this.SOURCE_CODE_BACKEND_DRIVE_MODULE_FILE_NAME = 'drive.js';
  this.SOURCE_CODE_BACKEND_BACKUP_MODULE_FILE_NAME = 'driveBackup.js';
  this.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_NAME = 'goodReads.js';
  this.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_NAME = 'googleApi.js';
  this.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_NAME = 'images.js';
  this.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_NAME = 'logger.js';
  this.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_NAME = 'googleSearch.js';
  this.SOURCE_CODE_BACKEND_AMAZON_MODULE_FILE_NAME = 'amazon.js';
  this.SOURCE_CODE_BACKEND_OPEN_LIBRARY_MODULE_FILE_NAME = 'openLibrary.js';
  this.SOURCE_CODE_BACKEND_PICTURE_DECODER_MODULE_FILE_NAME = 'pictureDecoder.js';
  this.SOURCE_CODE_BACKEND_WEBSOCKET_MODULE_FILE_NAME = 'websocket.js';
  this.SOURCE_CODE_BACKEND_WEB_STORE_SEARCHER_MODULE_FILE_NAME = 'webStoreSearcher.js';
  this.SOURCE_CODE_BACKEND_WIKI_MODULE_FILE_NAME = 'wikiApi.js';
  this.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_NAME = 'displayer.js';
  this.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_NAME = 'htmlRenderer.js';
  this.SOURCE_CODE_BACKEND_TOP_NAV_GUI_FILE_NAME = 'topNav.js';
  this.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_NAME = 'connection.js';
  this.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_NAME = 'functions.js';
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*NON-SOURCE FILE NAMES*/
  this.BLANK_PIC_FILE_NAME = 'blank.jpg';
  this.BACKUP_DB_FILE_NAME = 'db_bkp.sql';
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*DIRECTORIES PATHS*/
  this.ROOT_PATH = path.join(__dirname, '..', '..');
  this.GENERAL_PICTURES_PATH = path.join(this.ROOT_PATH, this.GENERAL_PICTURES_FOLDER_NAME);
  this.BACKUPS_PATH = path.join(this.ROOT_PATH, this.BACKUPS_FOLDER_NAME);
  this.BOOKS_PATH = path.join(this.ROOT_PATH, this.BOOKS_FOLDER_NAME);
  this.E_BOOKS_PATH = path.join(this.ROOT_PATH, this.E_BOOKS_FOLDER_NAME);
  this.ICONS_PATH = path.join(this.ROOT_PATH, this.ICONS_FOLDER_NAME);
  this.LOGS_PATH = path.join(this.ROOT_PATH, this.LOGS_FOLDER_NAME);
  this.SERIES_PATH = path.join(this.ROOT_PATH, this.SERIES_FOLDER_NAME);
  this.GROUPS_PATH = path.join(this.ROOT_PATH, this.GROUPS_FOLDER_NAME);
  this.SORCE_CODE_PATH = path.join(this.ROOT_PATH, this.SORCE_CODE_FOLDER_NAME);
  this.STORIES_PATH = path.join(this.ROOT_PATH, this.STORIES_FOLDER_NAME);
  this.WISH_LIST_PATH = path.join(this.ROOT_PATH, this.WISH_LIST_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_PATH = path.join(this.SORCE_CODE_PATH, this.SOURCE_CODE_BACKEND_FOLDER_NAME);
  this.SOURCE_CODE_FRONTEND_PATH = path.join(this.SORCE_CODE_PATH, this.SOURCE_CODE_FRONTEND_FOLDER_NAME);
  this.SOURCE_CODE_HTML_PATH = path.join(this.SORCE_CODE_PATH, this.SOURCE_CODE_HTML_FOLDER_NAME);
  this.SOURCE_CODE_STYLE_PATH = path.join(this.SORCE_CODE_PATH, this.SOURCE_CODE_STYLE_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_DATABASE_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_DATABASE_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_DATABASE_PROTOTYPES_PATH = path.join(this.SOURCE_CODE_BACKEND_DATABASE_PATH, this.SOURCE_CODE_BACKEND_DATABASE_PROTOTYPES_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_GUI_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_GUI_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_MODULES_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_MODULES_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_ROUTES_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_ROUTES_FOLDER_NAME);
  this.SOURCE_CODE_BACKEND_TOKENS_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_TOKENS_FOLDER_NAME);
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*SOURCE FILE PATHS*/
  this.SOURCE_CODE_STYLE_FILE_PATH = path.join(this.SOURCE_CODE_STYLE_PATH, this.SOURCE_CODE_STYLE_FILE_NAME);
  this.SOURCE_CODE_HTML_MAIN_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_MAIN_FILE_NAME);
  this.SOURCE_CODE_HTML_INSERT_WISH_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_INSERT_WISH_FILE_NAME);
  this.SOURCE_CODE_HTML_INSERT_STORY_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_INSERT_STORY_FILE_NAME);
  this.SOURCE_CODE_HTML_INSERT_SERIE_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_INSERT_SERIE_FILE_NAME);
  this.SOURCE_CODE_HTML_INSERT_BOOK_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_INSERT_BOOK_FILE_NAME);
  this.SOURCE_CODE_HTML_INSERT_GROUP_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_INSERT_GROUP_FILE_NAME);
  this.SOURCE_CODE_HTML_DISPLAY_FILE_PATH = path.join(this.SOURCE_CODE_HTML_PATH, this.SOURCE_CODE_HTML_DISPLAY_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_INSERT_WISH_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_INSERT_WISH_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_INSERT_STORY_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_INSERT_STORY_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_INSERT_GROUP_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_INSERT_GROUP_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_INSERT_SERIE_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_INSERT_SERIE_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_INSERT_BOOK_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_INSERT_BOOK_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_COMMON_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_COMMON_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_AUTOMATIC_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_AUTOMATIC_FILE_NAME);
  this.SOURCE_CODE_FRONTEND_MAIN_FILE_PATH = path.join(this.SOURCE_CODE_FRONTEND_PATH, this.SOURCE_CODE_FRONTEND_MAIN_FILE_NAME);
  this.SOURCE_CODE_BACKEND_CONFIG_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_CONFIG_FILE_NAME);
  this.SOURCE_CODE_BACKEND_INDEX_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_INDEX_FILE_NAME);
  this.SOURCE_CODE_BACKEND_SETTINGS_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_PATH, this.SOURCE_CODE_BACKEND_SETTINGS_FILE_NAME);
  this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_TOKEN_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_TOKENS_PATH, this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_TOKEN_FILE_NAME);
  this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_CREDENTIALS_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_TOKENS_PATH, this.SOURCE_CODE_BACKEND_GOOGLE_DRIVE_CREDENTIALS_FILE_NAME);
  this.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_DRIVE_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_DRIVE_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_BACKUP_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_BACKUP_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_GOOGLE_SEARCH_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_AMAZON_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_AMAZON_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_IMAGES_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_LOGGER_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_OPEN_LIBRARY_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_OPEN_LIBRARY_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_PICTURE_DECODER_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_PICTURE_DECODER_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_WEBSOCKET_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_WEBSOCKET_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_WEB_STORE_SEARCHER_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_WEB_STORE_SEARCHER_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_WIKI_MODULE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_MODULES_PATH, this.SOURCE_CODE_BACKEND_WIKI_MODULE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_GUI_PATH, this.SOURCE_CODE_BACKEND_DISPLAYER_GUI_FILE_NAME);
  this.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_GUI_PATH, this.SOURCE_CODE_BACKEND_HTML_RENDERER_GUI_FILE_NAME);
  this.SOURCE_CODE_BACKEND_TOP_NAV_GUI_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_GUI_PATH, this.SOURCE_CODE_BACKEND_TOP_NAV_GUI_FILE_NAME);
  this.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_DATABASE_PATH, this.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_NAME);
  this.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_PATH = path.join(this.SOURCE_CODE_BACKEND_DATABASE_PATH, this.SOURCE_CODE_BACKEND_FUNCTIONS_DATABASE_FILE_NAME);
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*NON SOURCE FILE PATHS*/
  this.BLANK_PIC_PATH = path.join(this.GENERAL_PICTURES_PATH, this.BLANK_PIC_FILE_NAME);
  this.BACKUP_DB_FILE_PATH = path.join(this.BACKUPS_PATH, this.BACKUP_DB_FILE_NAME);
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*APP SETTINGS*/
  this.APP_PORT = 80;
  this.WS_PORT = 8080;
  /**********************************************************************************************************************************************/

  /**********************************************************************************************************************************************/
  /*APP DISPLAY SETTINGS*/
  this.IMAGES_NUM_PER_PAGE = 25;
  this.BOOKS_PER_ROW = 5;
  /**********************************************************************************************************************************************/

/**********************************************************************************************************************************************/
/*GENERAL SETTINGS*/
this.POSTGRESQL_SEED_PARAMETER_NAME = 'postgres_seed_random';
/**********************************************************************************************************************************************/
};
