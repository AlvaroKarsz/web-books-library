const settings = require('../settings.js');
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);
const webStoreSearcher = require(settings.SOURCE_CODE_BACKEND_WEB_STORE_SEARCHER_MODULE_FILE_PATH);

class BookDisplayer {

  build(data,type, actions) {
    /*add main title*/
    let output = `<div class = "displayer-title"><div>${data.name}</div>`;

    /*add edit option*/
    output += this.addEditOption(data, type);

    /*close main title div*/
    output += `</div>`;

    /*build main info divs*/
    output += `<div class = "displayer-body"><div class="displayer-body-pic-holder">`;

    /*add left redirector*/
    output += this.addRedirectorArrow('left', data.prevListingId);

    /*add main picture*/
    output += this.addMainPicture(type, data.id);

    /*add right arrow*/
    output += this.addRedirectorArrow('right', data.nextListingId);

    /*add actions*/
    output += this.addActions(data,type ,actions);

    /*add tags if relevant*/
    output += this.addTags(data.tags);

    /*add ratings*/
    output += this.buildRating(data);

    /*add description if relevant*/
    output += this.addDescription(data.description);

    /*add general info*/
    output += this.addGeneralInformation(data);

    /*
    add purchase details
    if this is an owned book: add listing date
    if this is a purchased book: add purchase date
    */
    output += this.addPurchaseDetails(data);

    /*add reading info*/
    output += this.addReadingDetails(data, type);

    /*add chronologically related notes*/
    output += this.addChronologicallyRelations(data, type);

    /*add serie details*/
    output += this.buildSerieDataDisplayer({
      id: data.serie_id,
      serie: data.serie,
      number: data.serie_num,
      next: {
        num:data.serie_next_num,
        id:data.serie_next_id,
        name: data.serie_next_name,
        type: data.serie_next_type
      },
      prev: {
        num:data.serie_prev_num,
        id:data.serie_prev_id,
        name: data.serie_prev_name,
        type: data.serie_prev_type
      }
    }, type);

    /*add stories details*/
    output += this.buildCollectionDisplayer(data.stories);

    /*add books details if this is a serie*/
    output += this.buildBooksDisplayerForSeries(data.books,data.books_read,data.wish_books,data.purchased_books,data.stories_list,data.stories_read);

    /*add collection details if this is a story*/
    output += this.buildCollectionParentForStory( {collection_name: data.collection_name, collection_number: data.collection_number,collection_id: data.collection_id,  next: {id: data.next_collection_id, name: data.next_collection_name }, prev: {id: data.prev_collection_id, name: data.prev_collection_name} } );

    /*close main info divs*/
    output += `</div></div>`;
    return output;
  }

  addEditOption(data, type) {
    /*add edit button with relevant redirector*/
    return `<a title="Edit" href="/insert/${type}/${data.id}"><i class = "fa fa-edit"></i></a>`;
  }

  addChronologicallyRelations(data, type) {
    /*if this one has a next/previous book/story in chronological temrs - add redirectors*/
    let output = '';
    if(!data.next_id && !data.prev_id) {
      return output;
    }
    /*main holder*/
    output += '<div class="general-holder-book-displayer">Related Books (chronologically)<div class = "folder-pictures-holder">';
    /*Preceded book if exists*/
    if(data.prev_id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>Preceded By:</p><p>${data.prev_name}</p><img src="/pic/${type}/${data.prev_id}" onclick = "window.location='/${data.prev_type}/${data.prev_id}'"></div>`;
    }
    /*followed book if exists*/
    if(data.next_id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>Followed By:</p><p>${data.next_name}</p><img src="/pic/${type}/${data.next_id}" onclick = "window.location='/${data.next_type}/${data.next_id}'"></div>`;
    }
    output += '</div></div>';
    return output;
  }

  addReadingDetails(data, type) {
    /*
    relevant for owned books and stories
    add read number + read time + was completed
    if not relevant return empty string

    if this is a ebook, it may have bookmark argument, meaning user is currently reading it
    */
    let output = '';
    if(!data.read_order && !data.bookmark) {
      return output;
    }
    output += '<div class="general-holder-book-displayer">Read Details';
    /*normal book - was completed*/
    if(data.read_order) {
      output += this.echoDisplayLine(`Read Order (${basic.capitalize(type)}): ` , data.read_order);
      output += this.echoDisplayLine('Read Time: ' , data.read_date);
      output += this.echoDisplayLine('Was Completed: ' , data.read_completed === null ? 'Yes' : `No, Only ${data.read_completed}/${data.pages} were read`);
    } else if (data.bookmark) {/*ebook, is currently been read*/
      output += this.echoDisplayLine(`Bookmark: Page ` , data.bookmark);
    }
    output += '</div>';
    return output;
  }

  addPurchaseDetails(data) {
    /*
    add store + date
    if nor relevant return empty string
    */
    let output = '';
    if(!data.store) {
      return output;//empty string
    }

    output += '<div class="general-holder-book-displayer">Purchase Details: ';
    output += this.echoDisplayLine('Bought on: ' , data.store);
    if(data.order_date) {//in case of wishlist book that was purchased but not received yet
      /*order_date is saved in DD/MM/YYYY format, convert to MM/DD/YYYY*/
      output += this.echoDisplayLine('Bought at: ' , basic.beautifyDate(basic.dayMonthToMonthDay(data.order_date)));
    }
    if(data.listed_date) {//normal book - purchased and received
      output += this.echoDisplayLine('Listed at: ' , basic.beautifyDate(data.listed_date));
    }
    output += '</div>';
    return output;
  }

  getIsbnTitle(isbn) {
    /*
    if this is an isbn, the number of digits will not exceed 13
    if number is bigger, this is not an ISBN
    this can happen in case of ebooks without ISBN
    a unique ID is generated instead ISBN
    */
    if(isbn) {
      if(isbn.replace(/\D/g,'','').length > 13) { /*count just numeric digits*/
        return 'Unique ID: ';
      } else {
        return 'ISBN: ';
      }
    } else { //no isbn - return empty string
      return '';
    }
  }

  addGeneralInformation(data) {
    /*add general info - echoDisplayLine will return empty line if param is empty*/
    let output = '<div class="general-holder-book-displayer">General Information:';
    output += this.echoDisplayLine('Author: ' , data.story_author ? data.story_author : data.author);/*handle stories - (special case) if story author is present - display it*/
    output += this.echoDisplayLine('Publication Year: ' , data.year);
    output += this.echoDisplayLine('Number of Pages: ' , data.pages);
    output += this.echoDisplayLine(this.getIsbnTitle(data.isbn), data.isbn, {max:20}); /*book may have no isbn (some ebooks for example)*/
    output += this.echoDisplayLine('ASIN: ' , data.asin);
    output += this.echoDisplayLine('Book Language: ' , data.language);
    output += this.echoDisplayLine('Book Original Publication Language: ' , data.o_language);
    output += this.addFormat(data.type);
    output += '</div>';
    return output;
  }

  addDescription(desc) {
    /*if no description return empty string*/
    if(!desc) {
      return '';
    }

    let output = '<div class="general-holder-book-displayer">Description:</div>';
    output += '<div class = "description-holder"';
    if(basic.hasHeb(desc)) {/*if description is in hebrew, make right to left align*/
      output += ' style="text-align: right;"';
    }
    output += '>';
    output += desc.replace(/[\n]/g,'<br>');//add html line breakers
    output += '</div>';
    return output;
  }

  addFormat(format) {
    /*add book format and book icon if relevant*/

    /*object to convert type code to format string*/
    const formatOptionsConverter = {
      'P': 'PaperBack',
      'H': 'HardCover',
      'HN': 'HardCover without Dust Jacket',
      'E': 'E-Book'
    };

    /*no format - or invalid one*/
    if(!format || !Object.keys(formatOptionsConverter).includes(format)) {
      return '';
    }
    return `<div class="displayer-body-line">Format: ${formatOptionsConverter[format]}</div>`;
  }


  addMainPicture(type, id) {
    /*post image*/
    return `<img src="/pic/${type}/${id}">`;
  }

  addRedirectorArrow(direction, id) {
    /*
    build a DIV with an arrow
    redirect to id on click
    */
    return `<div class="displayer-body-arrow"><a onclick="${this.buildJSRedirector(id)}"><i class = "fa fa-angle-double-${direction}"></i></a></div>`;
  }

  buildCollectionParentForStory(data) {
    /*data format:
    {
    collection_name: collection name,
    collection_number: number in collection,
    collection_id: collection id,
    next:{    id: next story in collection,    name: next storyin scollection}      },
    prev:{    id: prev. story in collection,    name: prev.story in collection}     }
    */
    let output = '';
    if(!data.collection_name) {//isn't a story
      return output;
    }

    /*general collection title*/
    output += `<div class = "general-holder-book-displayer">Collection: <div class = "folder-pictures-holder">`;

    /*add collection info*/
    output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t" marked = "t"><p>Collection: ${data.collection_name}</p><p>Number: ${data.collection_number}</p><img src="/pic/books/${data.collection_id}" onclick = "window.location = '/books/${data.collection_id}'"></div>`;

    /*add previous book in series if exists*/
    if(data.prev.id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t"><p>Prev. Story: ${data.prev.name}</p><p>Number: ${basic.toInt(data.collection_number) - 1}</p><img src="/pic/stories/${data.prev.id}" onclick = "window.location = '${data.prev.id}'"></div>`;
    }

    /*add next book in series if exists*/
    if(data.next.id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t"><p>Next Story: ${data.next.name}</p><p>Number: ${basic.toInt(data.collection_number) + 1}</p><img src="/pic/stories/${data.next.id}" onclick = "window.location = '${data.next.id}'"></div>`;
    }

    /*close main divs*/
    output += '</div></div>';
    return output;
  }

  buildSerieDataDisplayer(data, type) {
    /*data format:
    {
    serie: serie name,
    number: location in serie,
    id: serie id,
    next:{    id: next book in serie id,    name: next book in serie name  , num: next book number in serie, type: next book type(wish/purchased) },
    prev:{    id: prev. book in serie id,    name: prev. book in serie name  , num: prev. book number in serie , type: prev book type(wish/purchased)}     }
    */
    let output = '';
    if(!data.serie || !data.number) {//isn't part of serie
      return output;
    }

    /*general serie title*/
    output += `<div class = "general-holder-book-displayer">Serie: <div class = "folder-pictures-holder">`;


    /*add serie info*/
    output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t" marked = "t"><p>Serie: ${data.serie}</p><p>Number: ${data.number}</p><img src="/pic/series/${data.id}" onclick = "window.location = '/series/${data.id}'"></div>`;


    /*add previous book in series if exists*/
    if(data.prev.id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t"><p>Prev. Book: ${data.prev.name}</p><p>Number: ${data.prev.num}</p><img src="/pic/${data.prev.type}/${data.prev.id}" onclick = "window.location = '/${data.prev.type}/${data.prev.id}'"></div>`;
    }

    /*add next book in series if exists*/
    if(data.next.id) {
      output += `<div class = "folder-pictures-holder-single-pic-holder" big = "t"><p>Next Book: ${data.next.name}</p><p>Number: ${data.next.num}</p><img src="/pic/${data.next.type}/${data.next.id}" onclick = "window.location='/${data.next.type}/${data.next.id}'"></div>`;
    }

    /*close main divs*/
    output += '</div></div>';
    return output;
  }

  buildSignleRating(name, rating, count) {
    /*add ratings (including stars) if relevant*/

    let output = `<div class = "displayer-rating-line"> ${name} `;


    /*no rating - add unknown label*/
    if(!rating || !count) {
      output += `<div style = "display:inline-block;"> UNKNOWN </div></div>`;
      return output;
    }

    const starCode = '&#x2605;',
    starClass = 'rating-star',
    partialStarClass = 'partial-rating-star',
    maxNumberOfStars = 5;

    let div, width;

    for(let i = 1 ; i <= maxNumberOfStars ; i ++ ) {
      /*calculate width for current star based on rating and loop index*/
      width = basic.isBiggerOrEqualInt(rating, i) ?
      /*if the index is smaller (or equal) int that rating, star shold be full*/
      '100%' :
      /*else, if index is bigger by more than 1 int, should be 0, else. should be partial*/
      (
        basic.isBiggerInt(i, basic.toInt(rating) + 1) ?
        '0%' :
        /*in this case, star should be partial painted, for example: index is 3 and rating is 3.87*/
        basic.getDecimalPartOfNumber(rating) * 100 + '%'
      );
      output += `<div class="${starClass}">${starCode}<div class="${partialStarClass}" style = "width: ${width};">${starCode}</div></div>`;
    }
    /*now add to output the rating data*/
    output += `<p>${rating} (${basic.addCommasToNum(count)})</p></div>`;
    return output;
  }

  buildRating(data) {
    let output = '<div class="displayer-body-line">Rating: ';
    /*add goodreads rating*/
    output += this.buildSignleRating('GoodReads', data.rating, data.rating_count);

    /*add amazon rating*/
    output += this.buildSignleRating('Amazon', data.amazon_rating, data.amazon_rating_count);

    /*add google rating*/
    output += this.buildSignleRating('Google', data.google_rating, data.google_rating_count);

    output += '</div>';

    return output;
  }

  addActions(data, type , actions) {
    /*no actions - return empty string*/
    if(!actions || basic.isEmptyObject(actions)) {
      return '';
    }
    let output = '<div class="displayer-options">';
    /*option to mark this book as purchased*/
    if(actions.buy) {
      output += `<div title="Click if you've bought this book">` +
      `<label for='invi-cb'>` +
      `<i class="fa fa-shopping-cart"></i>` +
      `</label>` +
      `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'invi-cb'>` +
      `<p>Mark as Purchased</p>` +
      `<form action="./purchased/${data.id}" method="post" id = 'mark-book-as-purchased'>` +
      `<input name="store" placeholder="Store Name" required>` +
      `<button type="submit" class="black-white-button">Save</button>` +
      `</form>` +
      `</div>`;
    }

    /*option for purchased books to mark as received*/
    if(actions.received) {
      output += `<div title="Click if you've received this book">` +
      `<a href = "/insert/books/wish${data.id}">` +
      `<i class="fa fa-truck"></i>` +
      `<p>Book Received</p>` +
      `</a>` +
      `</div>`;
    }

    /*option to search book in web stores*/
    if(actions.search) {
      /*if this is a book, make sure search_book flag is on*/
      if(type !== 'books' || data.search_book) {
        /*local module to find books on web stores*/
        output += `<div title="Search book online">` +
        `<label for='search-book'>` +
        `<i class="fa fa-search"></i>` +
        `</label>` +
        `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'search-book'>` +
        `<p>Search Book Online</p>` +
        `<form id = 'web-stores-holder'>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'betterworldbooks')}"><img src="${webStoreSearcher.icon('betterworldbooks')}"></a>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'thriftbooks')}"><img src="${webStoreSearcher.icon('thriftbooks')}"></a>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'abebooks')}"><img src="${webStoreSearcher.icon('abebooks')}"></a>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'bookdepository')}"><img src="${webStoreSearcher.icon('bookdepository')}"></a>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'ebay')}"><img src="${webStoreSearcher.icon('ebay')}"></a>` +
        `<a target="_blank" href="${webStoreSearcher.find({isbn: data.isbn, author: data.author, title: data.name}, 'amazon')}"><img src="${webStoreSearcher.icon('amazon')}"></a>` +
        `</form>` +
        `</div>`;
      }
    }

    /*option to search cheapest book in stores automatically*/
    if(actions.searchCheapest) {
      /*if this is a book, make sure search_book flag is on*/
      if(type !== 'books' || data.search_book) {
        output += `<div title="Click to Search for the cheapest book in stores" id='books-cheapest-search' param-isbn="${data.isbn}">` +
        `<i class="fa fa-usd"></i>` +
        `<p>Search Cheapest</p>` +
        `</div>`;
      }
    }

    /*
    this option is used in books only
    toggles a flag in DB that allows to search for this book in stores even though we have this book
    */
    if(actions.searchMoreEditions && type === 'books') {
      output += `<div title="Click to ${data.search_book && 'revoke' || 'grant'} option to search this book in stores">` +
      `<a href = "/books/toggleSearchBook/${data.id}">` +
      `<i class="${data.search_book && 'fa fa-eye-slash' || 'fa fa-eye'}"></i>` +
      `<p>${data.search_book && 'Revoke' || 'Grant'} Search Book Option</p>` +
      `</a>` +
      `</div>`;
    }

    /*option to mark a book/story as read*/
    if(actions.bookRead || actions.storyRead) {
      /*this option is relevant for book/story that were not read yet*/
      if(!data.read_date) {
        output += `<div title="Click if you've read this ${actions.bookRead ? 'Book' : 'Story'}">` + //add relevant title depending on action type
        `<label for='read-book-label'>` +
        `<i class="fa fa-book"></i>` +
        `</label>` +
        `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'read-book-label'>` +
        `<p>Mark as Read</p>` +
        `<form action="/${actions.bookRead ? 'books' : 'stories'}/read/${data.id}" method="post" id = 'mark-book-as-read'>` + //add relevant API endpoint depending on action type
        `<input oneline='t' name="date" placeholder="Read Date (Jan 2020, Jan 2020 - Mar 2020)" required long='t'>` +
        `<label class="radio-button-container">` +
        `<input name='completed' type="checkbox" checked class = "book-completed-check-box" id='mark-book-as-completed'>` +
        `<span class="radio-button-checkmark"></span>` +
        `</label>` +
        `<p oneline='f'>${actions.bookRead ? 'Book' : 'Story'} was Completed</p>` + //add relevant title depending on action type
        `<input oneline='t' name="pages" placeholder="Number of Read Pages" id='input-number-read-pages-book' type='number' long='t'>` +
        `<button type="submit" class="black-white-button" oneline='t'>Save</button>` +
        `</form>` +
        `</div>`;
      }
    }

    /*
    option to open the book in a new tab
    relevant for ebooks only
    */
    if(actions.openPdf) {
      if(data.type === 'E') {
        output += `<div title="Open This Book in Browser" ` +
        `onclick = "openEbook('/ebook/${data.id}` +
        (data.bookmark ? `#page=${data.bookmark}` : '') + /*if this ebook has a bookmark, open book in relevant page*/
        `','${data.name} by ${data.author}');"` +
        `>` +
        `<i class="fa fa-file-pdf-o"></i>` +
        `<p>Open This Book</p>` +
        `</div>`;
      }
    }

    /*
    option to cancel purchase mark from wishlist
    relevant only if it was purchased in first place
    */
    if(actions.cancelPurchase) {
      if(data.store && data.order_date) {
        output += `<div title="Cancel purchase mark">` +
        `<label for='cancel-purchase-label'>` +
        `<i class="fa fa-eraser"></i>` +
        `</label>` +
        `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'cancel-purchase-label'>` +
        `<p>Cancel Purchase Mark</p>` +
        `<form action="/purchased/read/cancel/${data.id}" method="get" style='margin-left:45px'>` +
        `<p oneline='t'>Are you sure?</p>` +
        `<button type="submit" class="black-white-button" oneline='t'>I'm sure</button>` +
        `</form>` +
        `</div>`;
      }
    }

    /*delete this note from DB & delete picture*/
    if(actions.delete) {
      output += `<div title="Delete">` +
      `<label for='delete-note-label'>` +
      `<i class="fa fa-trash"></i>` +
      `</label>` +
      `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'delete-note-label'>` +
      `<p>Delete</p>` +
      `<form action="/${type}/delete/${data.id}" method="get" style = "margin-left: 14px;">` +
      `<p oneline='t'>Are you sure?</p>` +
      `<button type="submit" class="black-white-button" oneline='t'>I'm sure</button>` +
      `</form>` +
      `</div>`;
    }

    /*option to search for a new description and save it in DB*/
    if(actions.fetchDescription) {
      output += `<div id='refresh-description' title="Search for a new Description" param-id="${data.id}" param-type="${type}">` +
      `<i class="fa fa-asterisk"></i>` +
      `<p>New Description</p>` +
      `</div>`;
    }
    /*option to change cover picture*/
    if(actions.fetchCover) {
      output += `<div id='refresh-cover' title="Change Cover">` +
      `<i class="fa fa-picture-o"></i>` +
      `<p>New Cover</p>` +
      `</div>`;
    }
    /*option to reload ratings*/
    if(actions.fetchRating) {
      output += `<div title="Click to reload Rating">` +
      `<a href = "/${type}/rating/change/${data.id}">` +
      `<i class="fa fa-star"></i>` +
      `<p>New Rating</p>` +
      `</a>` +
      `</div>`;
    }

    /*fetch tags and save*/
    if(actions.fetchTags) {
      output += `<div title="Click to fetch new Tags">` +
      `<a href = "/${type}/tags/${data.id}">` +
      `<i class="fa fa-tag"></i>` +
      `<p>New Tags</p>` +
      `</a>` +
      `</div>`;
    }

    /*option to search similar books*/
    if(actions.similarBooks) {
      output += `<div title="Click to find similar books" id='similar-books-search' param-id="${data.id}" param-type="${type}">` +
      `<i class="fa fa-arrows-h"></i>` +
      `<p>Similar Books</p>` +
      `</div>`;
    }

    /*find more books by this author*/
    if(actions.booksByAuthor) {
      output += `<div title="Click to find more books by same author" id='books-by-author-search' param-author="${data.author}">` +
      `<i class="fa fa-user"></i>` +
      `<p>Books by Author</p>` +
      `</div>`;
    }

    /*find more books from same seires*/
    if(actions.findFromSerie) {
      /*
      2 options, this is a serie, or a book
      if this is a book, check if book is part of serie, if not ignore this part
      */
      if(type === 'series' || data.serie_id) {
        output += `<div title="Click to find more books from same series" id='books-from-same-series' param-serie="` +
        /*if this is a series, just pass id, if this is a book, pass serie_id*/
        `${type === 'series' ? data.id : data.serie_id}">` +
        `<i class="fa fa-arrows"></i>` +
        `<p>Books from Series</p>` +
        `</div>`;
      }
    }

    /*option to refetch asin*/
    if(actions.fetchAsin) {
      output += `<div title="Click to reload ASIN">` +
      `<a href = "/${type}/asin/${data.id}">` +
      `<i class="fa fa-amazon"></i>` +
      `<p>New ASIN</p>` +
      `</a>` +
      `</div>`;
    }

    /*bookmark ebooks, mark the current page to read*/
    if(actions.Ebookmark) {
      if(data.type === 'E') {/*relevant only for ebooks*/
        if(!data.read_order) {/*relevant only for ebook that weren't completed yet*/
        output += `<div title="Click To change bookmark">` +
        `<label for='e-book-bookmark'>` +
        `<i class="fa fa-bookmark"></i>` +
        `</label>` +
        `<input type='checkbox' class = 'invisible-cb-displayer-option' id = 'e-book-bookmark'>` +
        `<p>Bookmark</p>` +
        `<form action="/books/bookmark/${data.id}" method="post" id = 'move-ebook-bookmark'>` +
        `<input name="page" placeholder="Current Page" type="number" required>` +
        `<button type="submit" class="black-white-button" oneline='t'>Save</button>` +
        `</form>` +
        `</div>`;
      }
    }
  }

  output += '</div>';
  return output;
}

echoDisplayLine(prevLine, param, ops = {}) {
  if(!param) {//no param - return empty string
    return '';
  }

  /*
  ops options:
  max: maximun number of digits, anything above will be replaced with ...
  add title with full value
  */
  let isTruncated = false, finalParam = param;

  if(ops.max) {
    if(param.length > ops.max) {
      finalParam = param.slice(0, ops.max) + '...';
      isTruncated = true
    }
  }

  return `<div class="displayer-body-line" ${isTruncated ? 'title=' + param : '' }>${prevLine}${finalParam}</div>`;
}

buildJSRedirector(id) {
  return `window.location = ${id} + window.location.search`;
}

buildCollectionDisplayer(stories) {
  if(!stories) {//this is not a sotries collection
    return '';
  }
  let output = `<div class = "general-holder-book-displayer">Collection: (${stories.length} Stories)<div class = "folder-pictures-holder">`;
  stories.forEach((stry) => {
    output += `<div class = "folder-pictures-holder-single-pic-holder"><p>${stry.name} by ${stry.author}</p><img src="/pic/stories/${stry.id}" onclick = "window.location='/stories/' + ${stry.id}"></div>`;
  });
  /*close main div*/
  output += '</div></div>';
  return output;
}

buildBooksDisplayerForSeries(books,booksRead,wishBooks,purchasedBooks,stories, storiesRead) {
  let output = '';
  if(!books && !booksRead && !wishBooks && !purchasedBooks && !stories && !storiesRead) {//this is not a serie - return empty string
    return output;
  }
  let count = 0,
  holder = [];
  /*add owned serie books and stories*/
  if(books || stories) {

    if(books) {
      count += books.length;
      holder.push(...books.map(a => {
        a.type = 'books';
        return a;
      }));
    }
    if(stories) {
      count += stories.length;
      holder.push(...stories.map(a => {
        a.type = 'stories';
        return a;
      }));
    }

    /*sort by serie number*/
    holder = holder.sort((x, y) => {
      return x.number - y.number;
    });

    output += `<div class = "general-holder-book-displayer">${count} Owned Books: <div class = "folder-pictures-holder">`;

    holder.forEach((book) => {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>${book.number}: ${book.name}</p><img src="/pic/${book.type}/${book.id}" onclick = "window.location='/${book.type}/' + ${book.id}"></div>`;
    });
    /*close main div*/
    output += '</div></div>';
  }
  //clear counter and holder
  count = 0;
  holder.length = 0;

  /*add purchased books*/
  if(purchasedBooks) {
    output += `<div class = "general-holder-book-displayer">${purchasedBooks.length} Purchased Books: <div class = "folder-pictures-holder">`
    purchasedBooks.forEach((book) => {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>${book.number}: ${book.name}</p><img src="/pic/wishlist/${book.id}" onclick = "window.location='/purchased/' + ${book.id}"></div>`;
    });
    /*close main div*/
    output += '</div></div>';
  }

  /*add wished books*/
  if(wishBooks) {
    output += `<div class = "general-holder-book-displayer">${wishBooks.length} Books in Wishlist: <div class = "folder-pictures-holder">`
    wishBooks.forEach((book) => {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>${book.number}: ${book.name}</p><img src="/pic/wishlist/${book.id}" onclick = "window.location='/wishlist/' + ${book.id}"></div>`;
    });
    /*close main div*/
    output += '</div></div>';
  }

  /*add read books/stories*/
  if(booksRead || storiesRead) {
    if(booksRead) {
      count += booksRead.length;
      holder.push(...booksRead.map(a => {
        a.type = 'reads';
        return a;
      }));
    }
    if(storiesRead) {
      count += storiesRead.length;
      holder.push(...storiesRead.map(a => {
        a.type = 'stories';
        return a;
      }));
    }
    /*sort by serie number*/
    holder = holder.sort((x, y) => {
      return x.number - y.number;
    });

    output += `<div class = "general-holder-book-displayer">${count} Books Read: <div class = "folder-pictures-holder">`
    holder.forEach((book) => {
      output += `<div class = "folder-pictures-holder-single-pic-holder"><p>${book.number}: ${book.name}</p><img src="/pic/${book.type}/${book.id}" onclick = "window.location='/${book.type}/' + ${book.id}"></div>`;
    });
    /*close main div*/
    output += '</div></div>';
  }

  return output;

}

addTags(tags) {
  let output = '';

  if(!tags) {
    return output;/*no tags - return empty string*/
  }


  tags = tags
  .split(',') /*tags are separated by commans, split it*/
  .map( a => a.trim() ); /*trim whitespaces*/

  /*add main div holder*/
  output += '<div class = "main-displayer-tags">';

  /*add tags*/
  for(let i = 0 , l = tags.length ; i < l ; i ++ ) {
    output += `<div>${tags[i]}</div>`;
  }

  /*close main div*/
  output += '</div>';

  return output;
}
}

module.exports = new BookDisplayer();
