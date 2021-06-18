const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  /*check if book ID exist in DB*/
  _THIS.bookExists = async (id) => {
    let exists = await pg.query(`SELECT EXISTS(SELECT 1 FROM my_books WHERE id = $1);`, [id]);
    return exists.rows[0].exists;
  }

  /*gets book ISBN, returns ID*/
  _THIS.getBookIdFromISBN = async (isbn) => {
    const query = "SELECT id FROM my_books WHERE isbn=$1;";
    let result = await pg.query(query, [isbn]);
    result = result.rows[0]['id'];
    return result;
  }

  /*update book's description*/
  _THIS.changeBookDescription = async (id, description) => {
    await pg.query('UPDATE my_books SET description=$1 WHERE id = $2;', [description, id]);
  }

  /*retrieve book's number of pages from book's ID*/
  _THIS.getBookPages = async (id) => {
    let res = await pg.query(`SELECT pages FROM my_books WHERE id = $1;`, [id]);
    return res.rows[0].pages;
  }

  /*change book status from normal (not read) to "read"*/
  _THIS.markBookAsRead = async (id, date, completedPages = null) => {
    /*
    STEPS:
    * MARK BOOK AS READ
    * IF THIS IS A COLLECTION, MARK IT STORIES AS READ
    */


    /********************************************************************************************
    MARK BOOK AS READ (RESET BOOKMARK (page_tracker_ebook) JUST IN CASE THIS IS AN EBOOK WITH BOOKMARK)
    *********************************************************************************************/
    let queryParams = [];
    let queryCounter = 0;
    let query = `UPDATE my_books
    SET read_order = (
      (
        SELECT read_order FROM my_books WHERE read_order IS NOT NULL ORDER BY read_order DESC LIMIT 1
      ) + 1
    ),
    page_tracker_ebook = NULL,
    read_date = $${++queryCounter},
    completed = `;
    queryParams.push(date);
    if(completedPages) {
      /*completedPages is not null - book was not completed - save number of read pages*/
      query += `$${++queryCounter}`
      queryParams.push(completedPages);
    } else {
      /*completedPages is null - book was completed, set completed column as NULL*/
      query += `NULL`
    }
    /*end query*/
    query += ` WHERE id = $${++queryCounter};`;
    queryParams.push(id);
    /*send query*/
    await pg.query(query, queryParams);

    /********************************************************************************************
    MARK COLLECTION STORIES AS READ (IF RELEVANT)
    *********************************************************************************************/

    let moreStoriesToUpdateFlag = true;/*flag to indicate if this collection have more stories without read order flag*/
    queryParams.length = 0;//reset
    query = `UPDATE stories
    SET read_date = $1,
    read_order = (
      SELECT read_order FROM stories WHERE read_order IS NOT NULL ORDER BY read_order DESC LIMIT 1
    ) + 1

    WHERE id = (
      SELECT id FROM stories WHERE parent = $2 AND read_order IS NULL ORDER BY id ASC LIMIT 1
    );`;

    queryParams.push(date, id);

    /*run until all stories are marked as read*/
    let tmpResultHolder = null;
    while(moreStoriesToUpdateFlag) {
      tmpResultHolder = await pg.query(query, queryParams);
      /*
      IF rowCount IS 0, NO ROWS WERE UPDATED, SO WHILE (0) WILL BREAK LOOP - NO MORE STORIES TO UPDATE
      */
      moreStoriesToUpdateFlag = tmpResultHolder.rowCount;
    }
  }

  /*check if ebook is marked as "read"*/
  _THIS.checkIfEbookNotCompleted = async (id) => {
    const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE id=$1 AND type = $2 AND read_order IS NULL);";
    let result = await pg.query(query, [id, 'E']);
    result = result.rows[0]['exists'];
    return result;
  }

  /*check if book is marked as read*/
  _THIS.checkIfBookIsMarkedAsRead = async (id) => {
    let res = await pg.query(`SELECT 1 FROM my_books WHERE id = $1 AND read_order IS NOT NULL;`, [id]);
    return res.rows.length !== 0;/*is marked as read (read_order is not null)*/
  }

  /*change book status from "read" to normal book (not read)*/
  _THIS.removeReadMarkFromBook = async (id) => {
    /*
    STEPS:
    1. GET READ ORDER OF THIS BOOK.
    2. REMOVE READ MARK OF THIS BOOK.
    3. DECREASE BY 1 BOOKS THAT WERE READ AFTER THIS ONE
    */

    /*STEP 1*/
    let query = `SELECT read_order FROM my_books WHERE id = $1;`;
    let readOrder = await pg.query(query, [id]);
    readOrder = readOrder.rows[0]['read_order'];

    /*STEP 2*/
    query = `UPDATE my_books SET read_order = NULL, read_date = NULL WHERE id = $1;`;
    await pg.query(query, [id]);

    /*STEP 3*/
    query = `UPDATE my_books SET read_order = (read_order - 1) WHERE read_order IS NOT NULL  AND read_order > $1;`;
    await pg.query(query, [readOrder]);
  }

  /*marks a book that is collation as read, the difference with markBookAsRead is that the read time is calculated based on stories read time*/
  _THIS.markCollectionAsRead = async (collectionId) => {
    /*In order to get the read date for collection, fetch all read date for it stories, and calculate collection read date*/
    let query = `SELECT read_date FROM stories WHERE parent = $1;`;
    let dates = await pg.query(query, [collectionId]);
    dates = dates.rows;

    /*find read range*/

    /*functions to get the bigger and smaller date from a pair*/
    let getBiggerSmallerDate = (d1, d2, getBiggerDate = true) => {
      /*temp vars to save month and year*/
      let month1, month2, year1, year2;
      /*arr with month codes - the higger the index in this array, the biggest the month*/
      const monthCodes = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      /*handle cases when one of the dates is empty (should not happen)*/

      if(!d1) {
        return d2;
      }

      if(!d2) {
        return d1;
      }

      month1 = d1.match(/[a-z]+/gi)[0].toLowerCase();
      month2 = d2.match(/[a-z]+/gi)[0].toLowerCase();
      year1 = parseInt(d1.match(/[0-9]+/g)[0], 10);
      year2 = parseInt(d2.match(/[0-9]+/g)[0], 10);


      if (year1 > year2) {
        return getBiggerDate ? d1 : d2;
      }

      if (year1 < year2) {
        return getBiggerDate ? d2 : d1;
      }
      /*in this point, the years are equal*/
      /*check by months*/
      if (monthCodes.indexOf(month1) > monthCodes.indexOf(month2) ) {
        return getBiggerDate ? d1 : d2;
      }

      if (monthCodes.indexOf(month1) < monthCodes.indexOf(month2) ) {
        return getBiggerDate ? d2 : d1;
      }
      /*equal date, no difference*/
      return d1;
    };

    /*start calculation based on stories data (using getBiggerSmallerDate function)*/
    let fromDate = null, toDate = null, tmp = null;

    for(let i = 0 , l = dates.length ; i < l ; i ++ ) {
      tmp = dates[i]['read_date'].replace(/\s+/g,'').toLowerCase().split('-');/*remove white spaces and split in case of MMM YYYY - MMM YYYY date format*/

      for(let j = 0 , o = tmp.length ; j < o ; j ++ ) {/*needed in MMM YYYY - MMM YYYY cases*/
        fromDate = getBiggerSmallerDate(fromDate, tmp[j], false);
        toDate = getBiggerSmallerDate(toDate, tmp[j]);
      }
    }
    /*now, after finding the dates, beautify it*/
    fromDate = fromDate.slice(0,3) + ' ' + fromDate.slice(3);
    toDate = toDate.slice(0,3) + ' ' + toDate.slice(3);

    /*capitalizate*/
    fromDate = fromDate.charAt(0).toUpperCase() + fromDate.slice(1);
    toDate = toDate.charAt(0).toUpperCase() + toDate.slice(1);

    /*get full date range (if "from" is equal to "to", no need to include both)*/
    const fullDate = fromDate === toDate ? fromDate : fromDate + ' - ' + toDate;
    /*now mark book as read*/
    await _THIS.markBookAsRead(collectionId, fullDate);
  }

  /*insert a new book into DB*/
  _THIS.saveBook = async (bookJson) => {
    /*
    Needed actions:
    1) Insert book to DB.
    2) Insert stories to stories table if this is a collection
    3) If this book is preceded by another book, change the "next" coulumn of the preceded book to pointer to this newly inserted bookID.
    4) Save the book rating
    5) Save stories rating if this is a collection.
    */

    /********************************************************************************************
    INSERT BOOK INTO DB
    *********************************************************************************************/
    /*general parameters*/
    let queryParams = ['name','year','author','original_language','language','store','isbn','type','pages', 'listed_date', 'description'];
    let queryArguments = [bookJson.title, bookJson.year, bookJson.author, bookJson.langOrg, bookJson.lang, bookJson.store.toUpperCase() ,bookJson.isbn, bookJson.type, bookJson.pages, bookJson.arrivalDate, bookJson.description];

    /*add asin if received*/
    if(bookJson.asin) {
      queryParams.push('asin');
      queryArguments.push(bookJson.asin);
    }

    /*add tags if received*/
    if(bookJson.tags) {
      queryParams.push('tags');
      queryArguments.push(bookJson.tags);
    }

    /*if this book is part of serie - add serie parameters*/
    if(bookJson.serie && typeof bookJson.serie.value !== 'undefined' && typeof bookJson.serie.number !== 'undefined') {
      queryParams.push('serie','serie_num');
      queryArguments.push(bookJson.serie.value,bookJson.serie.number);
    }
    /*if this is a collection, set collection flag in DB as true*/
    if(bookJson.collection && bookJson.collection.length) {
      queryParams.push('collection');
      queryArguments.push(true);
    }
    /*if this book if followed by another book, add the next book ID*/
    if(bookJson.next) {
      queryParams.push('next');
      queryArguments.push(bookJson.next);
    }
    /*build SQL query, new book id should be returned in order to use in other tables (if needed)*/
    let query = `INSERT INTO my_books(${queryParams.join(",")}) VALUES (${queryParams.map((element, index) => '$' + (index + 1))}) RETURNING id;`;

    /*send query and get book ID*/
    let bookId = await pg.query(query, queryArguments);
    bookId = bookId.rows[0].id;

    /********************************************************************************************
    INSERT STORIES IF COLLECTION
    *********************************************************************************************/
    if(bookJson.collection && bookJson.collection.length) {
      let counter = 0;
      /*
      if the story author is the same as the collection author, author value in DB should be NULL
      */
      query = 'INSERT INTO stories(name, pages, parent, author, asin, description) VALUES ';
      queryArguments.length = 0;//reset queryArguments array
      bookJson.collection.forEach((stry) => {
        queryArguments.push(stry.title, stry.pages, bookId);
        query += `($${++counter},$${++counter},$${++counter},`;/* the query will be closed with ")" after inserting all data*/
        if(stry.author) {//story has author - insert to DB
          queryArguments.push(stry.author);
          query += `$${++counter}),`;
        } else {//no author, set value as null
          query += `NULL),`;
        }

        if(stry.asin) {//story has asin - insert to DB
          queryArguments.push(stry.asin);
          query += `$${++counter}),`;
        } else {//no author, set value as null
          query += `NULL),`;
        }

        if(stry.description) {//story has description - insert to DB
          queryArguments.push(stry.description);
          query += `$${++counter}),`;
        } else {//no author, set value as null
          query += `NULL),`;
        }

      });
      query = query.replace(/[,]$/,'') + ";";//remove last comma
      await pg.query(query, queryArguments);
    }

    /********************************************************************************************
    CHANGE NEXT PARAM IN PRECEDED BOOK (IF ANY)
    *********************************************************************************************/
    if(bookJson.prev) {
      queryArguments.length = 0;//reset queryArguments array
      query = `UPDATE my_books SET next = $1 WHERE id = $2;`;
      queryArguments.push(bookId, bookJson.prev);
      await pg.query(query, queryArguments);
    }

    /********************************************************************************************
    SAVE BOOK RATING IN DB
    *********************************************************************************************/
    _THIS.saveRating(bookId, bookJson.isbn, bookJson.title, bookJson.author, 'my_books');

    /********************************************************************************************
    SAVE STORIES RATING IF COLLECTION
    *********************************************************************************************/
    if(bookJson.collection && bookJson.collection.length) {
      await _THIS.saveCollectionRating(bookId);
    }
  }

  /*alter a book that already exist in DB*/
  _THIS.alterBookById = async (id, bookJson) => {
    /********************************************************************************************
    ALTER MAIN TABLE WITH NEW PARAMS
    *********************************************************************************************/
    /*general parameters*/
    let paramsCounter = 0;
    let query = `UPDATE my_books SET
    name = $${++paramsCounter},
    year = $${++paramsCounter},
    author = $${++paramsCounter},
    original_language = $${++paramsCounter},
    language = $${++paramsCounter},
    store = $${++paramsCounter},
    isbn = $${++paramsCounter},
    type = $${++paramsCounter},
    pages = $${++paramsCounter},
    asin = $${++paramsCounter},
    tags = $${++paramsCounter},
    listed_date = $${++paramsCounter},
    description = $${++paramsCounter}
    `;
    let queryArguments = [bookJson.title, bookJson.year, bookJson.author, bookJson.langOrg, bookJson.lang, bookJson.store.toUpperCase() ,bookJson.isbn, bookJson.type, bookJson.pages, bookJson.asin, bookJson.tags, bookJson.arrivalDate, bookJson.description];


    /*if this book is part of serie - add serie parameters*/
    if(bookJson.serie && typeof bookJson.serie.value !== 'undefined' && typeof bookJson.serie.number !== 'undefined') {
      query += `,serie = $${++paramsCounter},
      serie_num = $${++paramsCounter}
      `;
      queryArguments.push(bookJson.serie.value,bookJson.serie.number);
    } else {/*no serie, set null in case this is previoulsy a part of serie and this part was deleted*/
      query += `,serie = NULL,
      serie_num = NULL
      `;
    }

    /*if this book if followed by another book, add the next book ID*/
    if(bookJson.next) {
      query += `,next = $${++paramsCounter}
      `;
      queryArguments.push(bookJson.next);
    } else {/*no next book - reset to null*/
      query += `,next = NULL
      `;
    }

    /*if this is a collection, set collection flag in DB as true*/
    if(bookJson.collection && bookJson.collection.length) {
      query += `,collection = 't'
      `;
    } else {/*reset to false*/
      query += `,collection = 'f'
      `;
    }

    /*run query and update main book table*/
    query += `WHERE id = $${++paramsCounter}`;
    queryArguments.push(id);

    /*send query*/
    await pg.query(query, queryArguments);

    /********************************************************************************************
    UPDATE PREV. BOOK IF EXISTS
    *********************************************************************************************/
    /*
    first remove 'next' value to all books that were followed by this book
    the 'next' data will be set again if still relevant
    */
    queryArguments.length = 0;//reset queryArguments array
    query = `UPDATE my_books
    SET next = NULL
    WHERE next = $1`;
    queryArguments.push(id);
    await pg.query(query, queryArguments);

    /*now - if prev. exists, alter the prev. book to point to this one as follow book*/
    if(bookJson.prev) {
      queryArguments.length = 0;//reset queryArguments array
      query = `UPDATE my_books SET next = $1 WHERE id = $2;`;
      queryArguments.push(id, bookJson.prev);
      await pg.query(query, queryArguments);
    }


    /********************************************************************************************
    ALTER STORIES IF COLLECTION
    *********************************************************************************************/
    /*if this is not a collection - remove all stories with this parent*/
    if(!bookJson.collection || !bookJson.collection.length) {
      queryArguments.length = 0;//reset queryArguments array
      queryArguments.push(id);
      query = `DELETE FROM stories WHERE parent = $1;`;
      await pg.query(query, queryArguments);

    } else {
      /*this is a collection - alter the existsing stories if needed, add new ones, and delete irrelevant ones*/

      /*fetch all prev. stories for this book*/
      let oldStories = await _THIS.fetchCollectionStories(id);
      /*
      iterate stories received from alered json.
      stories that were modified/not changed will have an ID value (story ID)
      new stories will have id as false
      */
      let storyFoundFlag = false;//default value - flag indicate if a match was found for a new story
      for (let i = 0 , l = bookJson.collection.length ; i < l ; i ++ ) {
        storyFoundFlag = false;//reset
        if(bookJson.collection[i].id) {//have ID - story should exists in oldStories array
          //find story in oldStories array
          for (let j = 0 , s = oldStories.length ; j < s ; j ++ ) {
            if( bookJson.collection[i].id.toString() === oldStories[j].id.toString() ) {//match, same ID
              /*update story entry*/
              queryArguments.length = 0;//reset queryArguments array
              paramsCounter = 0;//reset counter
              query = `UPDATE stories SET name = $${++paramsCounter}, pages = $${++paramsCounter}, author=`;
              queryArguments.push(bookJson.collection[i].title, bookJson.collection[i].pages);
              if(bookJson.collection[i].author) {//story has author different from collection, add into query
                query += `$${++paramsCounter} `;
                queryArguments.push(bookJson.collection[i].author);
              } else {//same author as collection, set value as NULL
                query += `NULL `;
              }

              query += `, asin=`;
              if(bookJson.collection[i].asin) {//story has asin
                query += `$${++paramsCounter} `;
                queryArguments.push(bookJson.collection[i].asin);
              } else {//same author as collection, set value as NULL
                query += `NULL `;
              }

              query += `, description=`;
              if(bookJson.collection[i].description) {//story has description
                query += `$${++paramsCounter} `;
                queryArguments.push(bookJson.collection[i].description);
              } else {//same author as collection, set value as NULL
                query += `NULL `;
              }

              //complete query and run it
              query += ` WHERE id = $${++paramsCounter};`;
              queryArguments.push(bookJson.collection[i].id);
              //send query
              await pg.query(query, queryArguments);

              /*
              since match was found, break nested loop and change flag value
              */
              storyFoundFlag = true;
              break;
            }
          }

          if(storyFoundFlag) {/*match was found for this story, continue to the next one*/
            continue;
          } else {
            /*no match - should never happen because if a story from bookJson has an ID value, this means the story already exists - anyway insert it*/
            queryArguments.length = 0;//reset queryArguments array
            paramsCounter = 0;//reset counter
            query = `INSERT INTO stories(name, pages, parent, author, asin, description) VALUES ($${++paramsCounter},$${++paramsCounter},$${++paramsCounter},`;/*will be closed with ")" after all needed data is inserted*/
            queryArguments.push(bookJson.collection[i].title, bookJson.collection[i].pages, id);

            if(bookJson.collection[i].author) {//story has author different from collection, add into query
              query += `$${++paramsCounter} `;
              queryArguments.push(bookJson.collection[i].author);
            } else {//same author as collection, set value as NULL
              query += `NULL `;
            }

            if(bookJson.collection[i].asin) {//story has asin
              query += `$${++paramsCounter} `;
              queryArguments.push(bookJson.collection[i].asin);
            } else {//no asin
              query += `NULL `;
            }

            if(bookJson.collection[i].description) {//story has description
              query += `$${++paramsCounter} `;
              queryArguments.push(bookJson.collection[i].description);
            } else {//no description
              query += `NULL `;
            }

            /*close query and send it*/
            query += `);`;
            await pg.query(query, queryArguments);
          }
        } else {
          /*book has no ID - new book - should be inserted*/
          queryArguments.length = 0;//reset queryArguments array
          paramsCounter = 0;//reset counter
          query = `INSERT INTO stories(name, pages, parent, author, asin, description) VALUES ($${++paramsCounter},$${++paramsCounter},$${++paramsCounter},`; /*will be closed with ")" after all needed data is inserted*/
          queryArguments.push(bookJson.collection[i].title, bookJson.collection[i].pages, id);
          if(bookJson.collection[i].author) {//story has author different from collection, add into query
            query += `$${++paramsCounter} `;
            queryArguments.push(bookJson.collection[i].author);
          } else {//same author as collection, set value as NULL
            query += `NULL `;
          }

          if(bookJson.collection[i].asin) {//story has asin
            query += `$${++paramsCounter} `;
            queryArguments.push(bookJson.collection[i].asin);
          } else {//same author as collection, set value as NULL
            query += `NULL `;
          }

          if(bookJson.collection[i].description) {//story has description
            query += `$${++paramsCounter} `;
            queryArguments.push(bookJson.collection[i].description);
          } else {//same author as collection, set value as NULL
            query += `NULL `;
          }

          /*close query and send it*/
          query += `);`;
          await pg.query(query, queryArguments);
        }
      }

      /*iterate oldStories and check if some stories were deleted (stories with id that not exists on bookJson.collection)*/
      let idsToDelete = [];//save here stories to delete

      for(let i = 0 , l = oldStories.length ; i < l ; i ++ ) {
        storyFoundFlag = false;//reset flag

        for(let j = 0 , s = bookJson.collection.length ; j < s ; j ++ ) {
          if (oldStories[i].id.toString() === bookJson.collection[j].id.toString()) {
            /*match - this story exists - don't delete it*/
            storyFoundFlag = true;
            break;
          }
        }

        if(!storyFoundFlag) {//not found - delete it
          idsToDelete.push(oldStories[i].id);
        }
      }

      /*
      if idsToDelete is not empty - delete the ID's from DB
      the md5sum hashes should be deleted as well from cache table
      */
      if(idsToDelete.length) {
        //delete stories
        paramsCounter = 0;//reset counter
        query = `DELETE FROM stories WHERE id IN (${idsToDelete.map(a => `$${++paramsCounter}`).join(',')})`;
        await pg.query(query, idsToDelete);
        //delete hashes
        paramsCounter = 0;//reset counter
        query = `DELETE FROM cache WHERE folder = 'stories' AND id IN (${idsToDelete.map(a => `$${++paramsCounter}`).join(',')});`;
        await pg.query(query, idsToDelete);
      }

    }

    /********************************************************************************************
    ALTER BOOK RATING IN DB , CHANGES IN ISBN/AUTHOR/TITLE MAY LEAD TO A DIFFERENT RATING
    *********************************************************************************************/
    _THIS.saveRating(id, bookJson.isbn, bookJson.title, bookJson.author, 'my_books');

    /********************************************************************************************
    ALTER STORIES RATING IF COLLECTION
    *********************************************************************************************/
    if(bookJson.collection && bookJson.collection.length) {
      await _THIS.saveCollectionRating(id);
    }
  }

  /*fetch all books that are marked as "read", option to pass filters*/
  _THIS.fetchAllReads = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT id,
    name,
    COALESCE(goodreads_rating,'0') AS rating
    FROM my_books `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(name) LIKE $');
      params.push(`%${titleFilter}%`);
    }
    let condition = " WHERE read_order IS NOT NULL ";
    if(filters.length) {//we have filters
      condition += " AND ";
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        condition +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      condition = condition.replace(/\sAND\s$/,'');
    }
    query += condition;
    //add order by type
    query += " ORDER BY ";
    switch(sortType) {
      case 'titl-a':
      query += " name "
      break;
      case "titl-d":
      query += " name DESC "
      break;
      case 'pag-h':
      query += " pages DESC "
      break;
      case "pag-l":
      query += " pages "
      break;
      case 'pub-h':
      query += " year DESC "
      break;
      case "pub-l":
      query += " year "
      break;
      case 'rat-h':
      query += " COALESCE(goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(goodreads_rating,'0') "
      break;
      case 'rd-r':
      query += " read_order DESC "
      break;
      case 'rd-n':
      query += " read_order "
      break;
      case 'lst-l':
      query += " id "
      break;
      case 'lst-f':
      query += " id DESC "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM my_books main ${condition};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*fetch all books from DB, option to use filters*/
  _THIS.fetchAllBooks = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT id,
    name,
    COALESCE(goodreads_rating,'0') AS rating
    FROM my_books `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(name) LIKE $');
      params.push(`%${titleFilter}%`);
    }

    let conditions = "";

    if(filters.length) {//we have filters
      conditions += " WHERE ";
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');
    }
    //add order by type
    query += conditions;

    query += " ORDER BY ";
    switch(sortType) {
      case 'titl-a':
      query += " name "
      break;
      case "titl-d":
      query += " name DESC "
      break;
      case 'pag-h':
      query += " pages DESC "
      break;
      case "pag-l":
      query += " pages "
      break;
      case 'pub-h':
      query += " year DESC "
      break;
      case "pub-l":
      query += " year "
      break;
      case 'rat-h':
      query += " COALESCE(goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(goodreads_rating,'0') "
      break;
      case 'rd-r':
      query += " read_order DESC "
      break;
      case 'rd-n':
      query += " read_order "
      break;
      case 'lst-l':
      query += " id "
      break;
      case 'lst-f':
      query += " id DESC "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM my_books main ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*fetch all book data*/
  _THIS.fetchBookById = async (id, filters, type) => {
    let query = ` SELECT
    my_books_main.id AS id,
    my_books_main.name AS name,
    my_books_main.isbn AS isbn,
    my_books_main.year AS year,
    my_books_main.author AS author,
    my_books_main.store AS store,
    my_books_main.asin AS asin,
    my_books_main.tags AS tags,
    my_books_main.page_tracker_ebook AS bookmark,
    my_books_main.description AS description,
    my_books_main.language AS language,
    my_books_main.original_language AS o_language,
    my_books_main.type AS type,
    my_books_main.pages AS pages,
    my_books_main.read_order AS read_order,
    my_books_main.read_date AS read_date,
    my_books_main.listed_date::TEXT AS listed_date,
    my_books_main.completed AS read_completed,
    my_books_main.collection AS is_collection,
    my_books_main.serie AS serie_id,
    my_books_main.serie_num AS serie_num,
    series_table.name AS serie,
    my_books_main.goodreads_rating AS rating,
    my_books_main.goodreads_rating_count AS rating_count,
    my_books_main.google_rating AS google_rating,
    my_books_main.google_rating_count AS google_rating_count,
    my_books_main.amazon_rating AS amazon_rating,
    my_books_main.amazon_rating_count AS amazon_rating_count,
    JSON_STRIP_NULLS(
      JSON_AGG(
        JSONB_BUILD_OBJECT(
          'name',
          stories_table.name,
          'id',
          stories_table.id::TEXT,
          'asin',
          stories_table.asin,
          'description',
          stories_table.description,
          'pages',
          stories_table.pages,
          'author',
          COALESCE(
            stories_table.author,
            my_books_main.author
          )
        )
      )
    ) AS stories,
    my_books_entry1.id AS next_id,
    my_books_entry1.name AS next_name,

    CASE
    WHEN my_books_entry1.read_order IS NOT NULL THEN 'reads'
    ELSE 'books'
    END next_type,

    my_books_entry2.id AS prev_id,
    my_books_entry2.name AS prev_name,

    CASE
    WHEN my_books_entry2.read_order IS NOT NULL THEN 'reads'
    ELSE 'books'
    END prev_type


    FROM my_books my_books_main

    LEFT JOIN my_books my_books_entry1
    ON my_books_main.next = my_books_entry1.id

    LEFT JOIN my_books my_books_entry2
    ON my_books_main.id = my_books_entry2.next

    LEFT JOIN series series_table
    ON my_books_main.serie = series_table.id

    LEFT JOIN stories stories_table
    ON my_books_main.id = stories_table.parent

    WHERE my_books_main.id = $1

    GROUP BY

    my_books_main.id,
    my_books_main.name,
    my_books_main.year,
    my_books_main.author,
    my_books_main.language,
    my_books_main.original_language,
    my_books_main.isbn,
    my_books_main.type,
    my_books_main.pages,
    my_books_main.store,
    my_books_main.asin,
    my_books_main.read_order,
    my_books_main.serie_num,
    my_books_main.completed,
    my_books_main.collection,
    my_books_main.description,
    my_books_main.amazon_rating_count,
    my_books_main.amazon_rating,
    my_books_main.google_rating_count,
    my_books_main.google_rating,
    my_books_main.page_tracker_ebook,
    my_books_main.tags,
    series_table.name,
    my_books_main.listed_date,
    my_books_entry1.id,
    my_books_entry1.name,
    my_books_entry2.id,
    my_books_entry2.name,
    my_books_main.goodreads_rating_count,
    my_books_main.goodreads_rating;`;


    let result = await pg.query(query, [id]);
    result = result.rows[0];

    /*now get the next book id and prev. book id based on filters received*/
    /*fetch all books in wanted order, then get the next and prev. id*/
    let allBooks = [];
    if(type === 'book') {//fetch all wished and search there
      allBooks = await _THIS.fetchAllBooks(filters);
    } else if (type === 'read') {
      allBooks = await _THIS.fetchAllReads(filters);
    }

    /*if type param received - if not (fetch for data from frontend) ignore this step*/
    if(typeof allBooks.rows !== 'undefined') {
      /*iterate all book until we reach the one with our ID*/
      for(let i = 0 , l = allBooks.rows.length ; i < l ; i ++ ) {
        if (allBooks.rows[i].id == id) {/*this listing is the one we are looking for*/
          /*
          first get "next id"
          if selected wish is the last in the list, grab the first as next, if not just grab the next one
          */
          result.nextListingId = i === allBooks.rows.length - 1 ? allBooks.rows[0].id : allBooks.rows[i + 1].id;
          /*
          get "prev. id"
          if selected wish is the first in the list, grab the last as prev., if not just grab the prev. one
          */
          result.prevListingId = i === 0 ? allBooks.rows[allBooks.rows.length - 1].id : allBooks.rows[i - 1].id;

          /*exit loop - wanted data found*/
          break;
        }
      }
    }
    /*
    if this is not a collection - clear stories value
    it will contain empty line with author's name
    */
    if(!result.is_collection) {
      result.stories = null;
    } else {//if this is a collection of stories, sort the stories by ID
      result.stories.sort((x,y) => x.id.localeCompare(y.id, undefined, {numeric: true}));
    }

    /*if this book is part of serie, fetch next and prev. in serie*/
    if(result.serie) {
      //merge results with serie results
      result = {...result, ... await _THIS.getAdjacentInSeries(result.serie_id, result.serie_num)};
    }
    return result;
  }

  /*fetch all book (marked as "read") data*/
  _THIS.fetchReadById = async (id, filters, type) => {
    /*same as "fetch book by id, just different type"*/
    return _THIS.fetchBookById(id, filters, type);
  }

  /*search and save ratings for a book*/
  _THIS.saveBookRating = async (id) => {
    /*fetch needed data from DB*/
    let neededData = await pg.query(`SELECT isbn, name, author, goodreads_rating_additional_isbn FROM my_books WHERE id = $1;`, [id]);
    if(neededData.rows.length === 0) {//no id
      return null;
    }
    neededData = neededData.rows[0];
    /*
    return saveRating
    It will return true only in case of success
    */
    return await _THIS.saveRating(id, neededData.isbn, neededData.name, neededData.author, 'my_books');
  }

  /*check if a book with this title and author already exists in books DB*/
  _THIS.checkIfBookAuthorAndTitleExists = async (title, author, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM my_books WHERE UPPER(author)=$1 AND UPPER(name)=$2 `;
    let params = [author.toUpperCase(), title.toUpperCase()];
    /*if idToExclude is not null, exclude this id from query*/

    if(idToExclude) {
      query += ` AND id != $3`;
      params.push(idToExclude);
    }
    /*close query*/
    query += ');';
    let result = await pg.query(query, params);
    result = result.rows[0]['exists'];
    return result;
  }

  /*check if book exists in DB with this ISBN*/
  _THIS.checkIfIsbnExists = async (isbn, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM my_books WHERE UPPER(isbn)=$1 `;
    let params = [isbn.toUpperCase()];

    /*if idToExclude is not null, exclude this id from query*/
    if(idToExclude) {
      query += ` AND id != $2`;
      params.push(idToExclude);
    }
    /*close query*/
    query += ');';
    let result = await pg.query(query, params);
    result = result.rows[0]['exists'];
    return result;
  }

  /*check if a book from this serie in this serie location already exist in books DB */
  _THIS.bookFromSerieExists = async (serieId, serieNum, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM my_books WHERE serie=$1 AND serie_num=$2 `;/*query will be closed with ")" after inserting all data*/
    let params = [serieId, serieNum];
    /*if idToExclude is not null, exclude this id from query*/

    if(idToExclude) {
      query += ` AND id != $3`;
      params.push(idToExclude);
    }
    /*close query*/
    query += ');';
    let result = await pg.query(query, params);
    result = result.rows[0]['exists'];
    return result;
  }

  /*check if a collection with this ID exists in DB*/
  _THIS.checkIsCollectionIdExists = async (collectionId) => {
    const query = `SELECT EXISTS(
      SELECT 1 FROM my_books WHERE collection = 't' AND id=$1
    );`;
    let result = await pg.query(query, [collectionId]);
    result = result.rows[0]['exists'];
    return result;
  }

  /*count how many books are part of this serie*/
  _THIS.getBooksCountFromSerie = async (id) => {
    let count = await pg.query(`SELECT COUNT(1) FROM my_books WHERE serie = $1;`, [id]);
    return count.rows[0].count;
  }

  /*get book's author and pages from ID*/
  _THIS.getAuthorAndPagesById = async (id) => {
    let res = await pg.query(`SELECT author, pages FROM my_books WHERE id = $1;`, [id]);
    return res.rows[0];
  }

  /*move bookmark for an E-Book*/
  _THIS.moveBookMark = async (id, page) => {
    await pg.query(`UPDATE my_books SET page_tracker_ebook = $1 WHERE id = $2;`, [page, id]);
  }

  /*fetch all books, each book in a full string format*/
  _THIS.fetchBooksForHtml = async () => {
    let res = await pg.query(`SELECT (name || ' by ' || author || ' (' || year || ')') AS text, id FROM my_books;`);
    return res.rows;
  }

  /*fetch all books that are collections, each collection in a full string format*/
  _THIS.fetchCollectionsForHtml = async () => {
    let res = await pg.query(`SELECT (name || ' by ' || author || ' (' || year || ')') AS text, id FROM my_books WHERE collection='t';`);
    return res.rows;
  }
};
