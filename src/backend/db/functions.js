const settings = require('../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

class dbFunctions {

  async saveAsin(asin, id, table) {
    let query = 'UPDATE ', paramCounter = 0, queryArguments = [];

    /*get table from tableName param*/
    switch(table) {
      case 'my_books':
      query += ' my_books ';
      break;

      case 'wish_list':
      query += ' wish_list ';
      break;

      case 'stories':
      query += ' stories ';
      break;

      default: /*unknown param*/
      return null;
    }

    query += `SET asin = `;

    if(asin) {
      query += ` $${++paramCounter} `;
      queryArguments.push(asin);
    } else {
      query += ' NULL ';
    }

    query += ` WHERE id = $${++paramCounter};`;
    queryArguments.push(id);

    await pg.query(query, queryArguments);
    return true;
  }

  async saveBookRating(id) {
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
    return await this.saveRating(id, neededData.isbn, neededData.name, neededData.author, 'my_books');
  }

  async saveWishRating(id) {
    /*fetch needed data from DB*/
    let neededData = await pg.query(`SELECT isbn, name, author FROM wish_list WHERE id = $1;`, [id]);
    if(neededData.rows.length === 0) {//no id
      return null;
    }
    neededData = neededData.rows[0];
    /*
    return saveRating
    It will return true only in case of success
    */
    return await this.saveRating(id, neededData.isbn, neededData.name, neededData.author, 'wish_list');
  }

  async saveStoryRating(id) {
    /*fetch needed data from DB*/
    let neededData = await pg.query(`SELECT name, author, parent FROM stories WHERE id = $1;`, [id]);
    if(neededData.rows.length === 0) {//no id
      return null;
    }
    neededData = neededData.rows[0];

    /*if no author, fetch author from parent*/

    if(! neededData.author ) {
      let parentAuthor = await pg.query(`SELECT author FROM my_books WHERE id = $1;`, [neededData.parent]);
      if(parentAuthor.rows.length === 0) {//no id
        return null;
      }
      neededData.author = parentAuthor.rows[0].author;
    }
    /*
    return saveRating
    It will return true only in case of success
    */
    return await this.saveRating(id, '', neededData.name, neededData.author, 'stories');
  }

  async changeBookDescription(id, description) {
    await pg.query('UPDATE my_books SET description=$1 WHERE id = $2;', [description, id]);
  }

  async changeStoryDescription(id, description) {
    await pg.query('UPDATE stories SET description=$1 WHERE id = $2;', [description, id]);
  }

  async changeWishDescription(id, description) {
    await pg.query('UPDATE wish_list SET description=$1 WHERE id = $2;', [description, id]);
  }

  async cancelPurchaseMark(id) {
    let query = `UPDATE wish_list
    SET store = NULL,
    order_date = NULL,
    ordered = 'f'
    WHERE id = $1;`;
    await pg.query(query, [id]);
  }

  async getAllMD5Hashes(folders) {
    let res = await pg.query(`SELECT folder, id, md5 FROM cache WHERE folder IN (${folders.map((a, i) => {return '$' + (i+1).toString() }).join(',')});`, folders);
    return res.rows;
  }

  async getNumberOfStories(collectionId) {
    let res = await pg.query(`SELECT COUNT(1) FROM stories WHERE parent = $1;`, [collectionId]);
    return res.rows[0].count;
  }

  async removeReadMarkFromBook(id) {
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

  async bookMarkedAsRead(id) {
    let res = await pg.query(`SELECT 1 FROM my_books WHERE id = $1 AND read_order IS NOT NULL;`, [id]);
    return res.rows.length !== 0;/*is marked as read (read_order is not null)*/
  }

  async allStoriesAreRead(collectionId) {
    let res = await pg.query(`SELECT COUNT(1) FROM stories WHERE parent = $1 AND read_order IS NULL;`, [collectionId]);
    res = res.rows[0].count;
    return res === '0';//true if all stories are read
  }

  async markCollectionAsRead(collectionId) {
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
    await this.markBookAsRead(collectionId, fullDate);
  }

  async getStoryCollectionById(id) {
    let res = await pg.query(`SELECT parent FROM stories WHERE id = $1;`, [id]);
    return res.rows[0].parent;
  }

  async moveBookMark(id, page) {
    await pg.query(`UPDATE my_books SET page_tracker_ebook = $1 WHERE id = $2;`, [page, id]);
  }

  async getStoryIdFromDetails(details) {
    let query = `SELECT id FROM stories WHERE
    LOWER(name)=$1 AND pages = $2 AND parent = $3 AND `;
    let params = [details.title.toLowerCase(), details.pages, details.collectionId.value];

    if(details.author) {/*add author if exists*/
      query += ` LOWER(author) = $4;`;
      params.push(details.author.toLowerCase());
    } else {/*if not author should be null*/
      query += ` author IS NULL;`;
    }

    let res = await pg.query(query, params);
    return res.rows[0].id;
  }

  async getAuthorAndPagesById(id) {
    let res = await pg.query(`SELECT author, pages FROM my_books WHERE id = $1;`, [id]);
    return res.rows[0];
  }

  async getStoryPages(id) {
    let res = await pg.query(`SELECT pages FROM stories WHERE id = $1;`, [id]);
    return res.rows[0].pages;
  }

  async getBookPages(id) {
    let res = await pg.query(`SELECT pages FROM my_books WHERE id = $1;`, [id]);
    return res.rows[0].pages;
  }

  async deleteWish(id) {
    await pg.query(`DELETE FROM wish_list WHERE id = $1;`, [id]);
  }

  async deleteMD5(folderName, id) {
    await pg.query(`DELETE FROM cache WHERE id = $1 AND folder = $2;`, [id, folderName]);
  }

  async fetchAllBooks(ops = {}) {
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

  async fetchAllWishes(ops = {}) {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT id,
    name,
    COALESCE(goodreads_rating,'0') AS rating
    FROM wish_list `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(name) LIKE $');
      params.push(`%${titleFilter}%`);
    }
    let conditions = " WHERE ordered = 'f' ";

    if(filters.length) {//we have filters
      conditions += " AND ";
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
    let count = await pg.query(`SELECT COUNT(1) FROM wish_list main ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};

  }

  async fetchAllSeries(ops = {}) {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT
    main.id,
    main.name,
    (
      SELECT COUNT(1)
      FROM my_books
      WHERE serie = main.id
    ) AS owned_books,
    (
      SELECT COUNT(1)
      FROM my_books
      WHERE serie = main.id AND read_order IS NOT NULL
    ) AS readed_books,
    (
      SELECT COUNT(1)
      FROM wish_list
      WHERE serie = main.id
    ) AS wished_books

    FROM series main `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }
    let conditions = '';
    if(filters.length) {//we have filters
      conditions += " WHERE ";
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');
    }
    query += conditions;
    //add order by type
    query += " ORDER BY ";
    switch(sortType) {
      case 'titl-a':
      query += " main.name "
      break;
      case "titl-d":
      query += " main.name DESC "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      case 'owb-b':
      query += " owned_books DESC "
      break;
      case 'owb-s':
      query += " owned_books "
      break;
      case 'rdb-b':
      query += " readed_books DESC "
      break;
      case 'rdb-s':
      query += " readed_books "
      break;
      case 'wsb-b':
      query += " wished_books DESC "
      break;
      case 'wsb-s':
      query += " wished_books "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM series main ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  async fetchAllStories(ops = {}) {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT main.id,
    main.name,
    COALESCE(main.goodreads_rating,'0') AS rating
    FROM stories main

    LEFT JOIN my_books parent
    ON main.parent = parent.id `;
    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(COALESCE(main.author , parent.author)) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }
    let conditions = '';
    if(filters.length) {//we have filters
      conditions += " WHERE ";
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');
    }
    query += conditions;
    //add order by type
    query += " ORDER BY ";
    switch(sortType) {
      case 'titl-a':
      query += " main.name "
      break;
      case "titl-d":
      query += " main.name DESC "
      break;
      case 'pag-h':
      query += " main.pages DESC "
      break;
      case "pag-l":
      query += " main.pages "
      break;
      case 'pub-h':
      query += " parent.year DESC "
      break;
      case "pub-l":
      query += " parent.year "
      break;
      case 'rat-h':
      query += " COALESCE(main.goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(main.goodreads_rating,'0') "
      break;
      case 'rd-r':
      query += " main.read_order DESC "
      break;
      case 'rd-n':
      query += " main.read_order "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      case 'cln-f':
      query += " parent.name "
      break;
      case 'cln-l':
      query += " parent.name DESC "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM stories main LEFT JOIN my_books parent  ON main.parent = parent.id ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  async fetchAllReads(ops = {}) {
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

  async fetchAllPurchased(ops = {}) {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT id,
    name,
    COALESCE(goodreads_rating ,'0') AS rating
    FROM wish_list `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(name) LIKE $');
      params.push(`%${titleFilter}%`);
    }
    let conditions = " WHERE ordered = 't' ";
    if(filters.length) {//we have filters
      conditions += " AND ";
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');
    }
    query += conditions;

    //add order by type
    query += " ORDER BY ";
    switch(sortType) {
      case 'titl-a':
      query += " name "
      break;
      case "titl-d":
      query += " name DESC "
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
      case 'lst-l':
      query += " id "
      break;
      case 'lst-f':
      query += " id DESC "
      break;
      case 'prc-f':
      query += " order_date::DATE DESC "
      break;
      case 'prc-l':
      query += " order_date::DATE "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM wish_list main ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + (filters.length + 1) + " OFFSET $" + (filters.length + 2) + ";";
    params.push(limit, offset);
    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  async fetchSeriesForHtml() {
    let res = await pg.query(`SELECT (name || ' by ' || author) AS text, id FROM series;`);
    return res.rows;
  }

  async fetchBooksForHtml() {
    let res = await pg.query(`SELECT (name || ' by ' || author || ' (' || year || ')') AS text, id FROM my_books;`);
    return res.rows;
  }

  async fetchCollectionsForHtml() {
    let res = await pg.query(`SELECT (name || ' by ' || author || ' (' || year || ')') AS text, id FROM my_books WHERE collection='t';`);
    return res.rows;
  }

  async saveStory(storyJson) {
    /*
    Needed actions:
    1) Insert story to DB.
    2) Save the story rating
    */

    /********************************************************************************************
    INSERT STORY INTO DB
    *********************************************************************************************/
    let counter = 0,
    query = `INSERT INTO stories (
      name,
      pages,
      parent,
      description,
      asin,
      author
    ) VALUES (
      $${++coutner},
      $${++coutner},
      $${++coutner},
      $${++coutner},
      ${storyJson.asin ? `$${++coutner}` : 'NULL' }),
      ${storyJson.author ? `$${++coutner}` : 'NULL' })
      RETURNING id;`;//if author is empty, insert NULL insted - indicated to use collection's author
      let queryArguments = [storyJson.title, storyJson.pages, storyJson.collectionId.value, storyJson.description];
      if(storyJson.asin) {
        queryArguments.push(storyJson.asin);
      }
      if(storyJson.author) {
        queryArguments.push(storyJson.author);
      }

      /*send query and get story ID*/
      let storyId = await pg.query(query, queryArguments);
      storyId = storyId.rows[0].id;

      /********************************************************************************************
      SAVE STORY RATING IN DB
      *********************************************************************************************/
      this.saveRating(storyId, '', storyJson.title, storyJson.actualAuthor, 'stories');
    }

    async saveWish(bookJson) {
      /*
      Needed actions:
      1) Insert wish to DB.
      2) Save the wish rating
      */

      /********************************************************************************************
      INSERT WISH INTO DB
      *********************************************************************************************/
      /*general parameters*/
      let queryParams = ['name','year','author','isbn', 'description'];
      let queryArguments = [bookJson.title, bookJson.year, bookJson.author,bookJson.isbn, bookJson.description];

      /*if asin was received, add it to query*/
      if(bookJson.asin) {
        queryParams.push('asin');
        queryArguments.push(bookJson.asin);
      }

      /*if this wish is part of serie - add serie parameters*/
      if(bookJson.serie && typeof bookJson.serie.value !== 'undefined' && typeof bookJson.serie.number !== 'undefined') {
        queryParams.push('serie','serie_num');
        queryArguments.push(bookJson.serie.value,bookJson.serie.number);
      }

      /*build SQL query, new wish id should be returned in order to use in other tables (if needed)*/
      let query = `INSERT INTO wish_list(${queryParams.join(",")}) VALUES (${queryParams.map((element, index) => '$' + (index + 1))}) RETURNING id;`;

      /*send query and get wish ID*/
      let wishId = await pg.query(query, queryArguments);
      wishId = wishId.rows[0].id;

      /********************************************************************************************
      SAVE WISH RATING IN DB
      *********************************************************************************************/
      this.saveRating(wishId, bookJson.isbn, bookJson.title, bookJson.author, 'wish_list');
    }

    async saveSerie(serieJson) {
      await pg.query(`INSERT INTO series(name, author) VALUES($1,$2);`, [serieJson.title, serieJson.author]);
    }

    async alterSerieById(id, serieJson) {
      await pg.query(`UPDATE series SET name = $1, author = $2 WHERE id = $3;`, [serieJson.title, serieJson.author, id]);
    }

    async getSerieIdFromTitleAndAuthor(title, author) {
      let res = await pg.query(`SELECT id FROM series WHERE LOWER(name) = $1 AND LOWER(author) = $2;`, [title.toLowerCase(), author.toLowerCase()]);
      return res.rows[0].id;
    }

    async saveBook(bookJson) {
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
        query = 'INSERT INTO stories(name, pages, parent, author) VALUES ';
        queryArguments.length = 0;//reset queryArguments array
        bookJson.collection.forEach((stry) => {
          queryArguments.push(stry.title, stry.pages, bookId);
          query += `($${++counter},$${++counter},$${++counter},`;
            if(stry.author) {//story has author - insert to DB
              queryArguments.push(stry.author);
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
        this.saveRating(bookId, bookJson.isbn, bookJson.title, bookJson.author, 'my_books');

        /********************************************************************************************
        SAVE STORIES RATING IF COLLECTION
        *********************************************************************************************/
        if(bookJson.collection && bookJson.collection.length) {
          await this.saveCollectionRating(bookId);
        }
      }

      async saveCollectionRating(bookId) {
        const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);
        const goodreads = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);

        let query, bookAuthor, stories, rating, queryParamsArr = [], paramsCount = 0;
        /*
        stories are saved without ISBN, and ISBN is needed in order to fetch rating.
        the workaround is fetching story title and author, and look for if ISBN exist for this title.
        if ISBN exist, use it in order to fetch the rating.
        If ISBN doesn't exists, rating can't be fetched for this story.
        */

        /*
        "author" column in stories table may be null, in this case, the author is the same as collection author.
        fetch collection author first.
        */

        query = "SELECT author FROM my_books WHERE id = $1;";
        bookAuthor =  await pg.query(query, [bookId]);
        bookAuthor = bookAuthor.rows[0].author;


        /*fetch stories data by Collection ID*/
        query = `SELECT
        id,
        name,
        author
        FROM stories WHERE parent = $1;`;
        stories = await pg.query(query, [bookId]);
        stories = stories.rows;

        /*iterate stories, if "author" is null, set "bookAuthor" as author*/
        for(let i = 0 , l = stories.length ; i < l ; i ++ ) {
          if(!stories[i].author) {
            stories[i].author = bookAuthor;
          }
        }

        /*
        fetch ISBN by author and title for these stories
        if no ISBN exist, the returned value will be null
        */
        stories = await googleApi.fetchIsbnByTitleAndAuthorBulk(stories.map((a) => {return {title: a.name, author: a.author, id: a.id}}));

        /*
        fetch rating for found isbns - remove nulls from isbn arrays
        */
        rating = await goodreads.fetchRatings(stories.map(a => a.isbn).filter(a => a));

        /*
        add rating to stories element
        ######################################################################
        typical respinse from fetchRatings method:
        [{
        id: 713989,
        isbn: '1416549854',
        isbn13: '9781416549857',
        ratings_count: 405,
        reviews_count: 852,
        text_reviews_count: 50,
        work_ratings_count: 90525,
        work_reviews_count: 163597,
        work_text_reviews_count: 2697,
        average_rating: '3.97'
      },{...}]
      ######################################################################
      wanted values: average_rating and work_ratings_count
      iterate response and compare story isbn with "isbn" or "isbn13"
      */
      for(let i = 0, l = stories.length ; i < l ; i ++ ) {
        if(!stories[i].isbn) {//no isbn for this story, continue to next one
          continue;
        }
        for(let j = 0, s = rating.length ; j < s ; j ++ ) {
          if(stories[i].isbn === rating[j].isbn || stories[i].isbn === rating[j].isbn13) {
            stories[i].rating = rating[j].average_rating;
            stories[i].count = rating[j].work_ratings_count;
            break;//next story
          }
        }
      }

      /*
      save data in DB table.
      the ISBN used to find data shoud be saved in additional_isbn column.
      SPECIAL CASE:
      if rating not found for a story:
      set rating = null, count = null, additional_isbn = false
      So when running an alogrithm to refetch the rating (updated data), the alogrithm will not try again to fetch rating for these stories.
      When the alogrithm sees additional_isbn = false, this entry will be ignored
      */

      for(let i = 0, l = stories.length ; i < l ; i ++ ) {
        await this.insertRatingIntoDB(
          typeof stories[i].rating === 'undefined' ? null : stories[i].rating,
          typeof stories[i].rating === 'undefined' ? null : stories[i].count,
          typeof stories[i].rating === 'undefined' ? 'false' : stories[i].isbn,
          stories[i].id,
          'stories');
        }
      }

      async saveRating(id, isbn, title, author, tableName) {
        /*fetch rating and save it in DB table*/
        /*fetch goodreads and google ratings and amazon ratings*/
        let rating = null, additionalIsbn = null;

        /*try to fetch rating from goodreads api*/
        const goodreads = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);
        const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);
        const amazonApi = require(settings.SOURCE_CODE_BACKEND_AMAZON_MODULE_FILE_PATH);

        /*
        make a separated google rating fetch & amazon rating fetch
        make it in background, and make wait for it to finish before exiting this function!
        make is without await in order to avoid blocking the function
        */


        let googleRatingResult = googleApi.fetchRatings({
          isbn: isbn,
          author: author,
          title: title
        })
        .then(async (googleRes) => {
          if(!googleRes) {/*not found - clear google rating from table and return*/
            await this.clearGoogleRating(id, tableName);
            return;
          }
          /*save in DB*/
          await this.saveGoogleRating(id, googleRes.rating, googleRes.count, tableName);
        });

        /*asin is needed for amazon api*/
        let amazonRatingResult = amazonApi.fetchRating(
          await this.getAsin(id, tableName)
        )
        .then(async (amzRes) => {
          if(!amzRes) {/*not found - clear amazon rating from table and return*/
            await this.clearAmazonRating(id, tableName);
            return;
          }
          /*save in DB*/
          await this.saveAmazonRating(id, amzRes.rating, amzRes.count, tableName);
        });


        /*may be empty for stories*/
        if(isbn) {
          rating = await goodreads.fetchRating(isbn);
        }


        if(!rating) {
          /*rating not found by this isbn, try to fetch another isbn from goodreads api based on book title and author*/
          additionalIsbn = await goodreads.fetchIsbnFromTitleAndAuthor(title,author);

          if(!additionalIsbn) {/*could not find, try to find using google api*/
            additionalIsbn = await googleApi.fetchIsbnByTitleAndAuthor(title,author);
          }

          /*
          in some cases, there is no ISBN, but rating exist in goodreads
          for example a e-book without ISBN
          for this cases, use fetchRatingFromTitleAndAuthor function to search for ratings without isbn at all
          */
          if(!additionalIsbn) {
            let ratingWithoutISBN = await goodreads.fetchRatingFromTitleAndAuthor(title,author);
            if(ratingWithoutISBN) {
              /*rating found, save rating & rating count in table, additionalIsbn should be empty in this case since no additional ISBN was used*/
              await this.insertRatingIntoDB(ratingWithoutISBN.rating, ratingWithoutISBN.count, null, id, tableName);
              /*make sure google & amazon rating was fetched before exit*/
              await Promise.all([amazonRatingResult,googleRatingResult]);
              return true;
            }
          }


          if(!additionalIsbn) {
            /*no luck - no isbn found*/
            /*clear rating and return clearRating "exit code"*/

            /*make sure google & amazon rating was fetched before exit*/
            await Promise.all([amazonRatingResult,googleRatingResult]);
            return await this.clearRating(id, tableName);
          }
          if(isbn === additionalIsbn) {
            /*isbn found in one of the apis is the same one inserted by user, nothing found in goodreads for this isbn*/
            /*clear rating and return clearRating "exit code"*/

            /*make sure google & amazon rating was fetched before exit*/
            await Promise.all([amazonRatingResult,googleRatingResult]);
            return await this.clearRating(id, tableName);
          }
          /*try to fetch rating with new isbn from google*/
          rating = await goodreads.fetchRating(additionalIsbn);
          if(!rating) {
            /*nothing found for this isbn as well*/
            /*clear rating and return clearRating "exit code"*/

            /*make sure google & amazon rating was fetched before exit*/
            await Promise.all([amazonRatingResult,googleRatingResult]);
            return await this.clearRating(id, tableName);
          }
        }

        await this.insertRatingIntoDB(rating.rating, rating.count, additionalIsbn, id, tableName);
        /*make sure google rating was fetched before exit*/
        await googleRatingResult;
        return true;
      }

      async getStoryAuthorFromStoryId(id) {
        let res = await pg.query(`SELECT mn.author FROM my_books mn WHERE mn.id = (SELECT strs.parent FROM stories strs WHERE strs.id = $1);`, [id]);
        return res.rows[0].author;
      }

      async clearAmazonRating(id, table) {
        let query = 'UPDATE ';
        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += ` SET amazon_rating = NULL, amazon_rating_count = NULL WHERE id = $1;`;
        await pg.query(query, [id]);
        return true;/*success*/
      }

      async clearGoogleRating(id, table) {
        let query = 'UPDATE ';
        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += ` SET google_rating = NULL, google_rating_count = NULL WHERE id = $1;`;
        await pg.query(query, [id]);
        return true;/*success*/

      }

      async clearRating(id, table) {
        let query = 'UPDATE ';
        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += ` SET goodreads_rating = NULL, goodreads_rating_count = NULL, goodreads_rating_additional_isbn = NULL WHERE id = $1;`;
        await pg.query(query, [id]);
        return true;/*success*/
      }

      async getAsin(id, table) {
        let query = 'SELECT asin FROM ';

        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += ` WHERE id = $1;`;

        let res = await pg.query(query, [id]);
        res = res.rows;
        return res.length ? res[0].asin : null;
      }

      async saveAmazonRating(id, rating, count, table) {
        let query = 'UPDATE ', paramCounter = 0, queryArguments = [];

        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += `SET
        amazon_rating = `;

        if(rating) {//rating exist
          query += ` $${++paramCounter} `;
          queryArguments.push(rating);
        } else {//no rating - use NULL
          query += ` NULL `
        }

        query += ` , amazon_rating_count = `;

        if(count) {//count exist
          query += ` $${++paramCounter} `;
          queryArguments.push(count);
        } else {//no count - use NULL
          query += ` NULL `
        }

        query += ` WHERE id = $${++paramCounter};`;
        queryArguments.push(id);
        await pg.query(query, queryArguments);
        return true;
      }

      async saveGoogleRating(id, rating, count, table) {
        let query = 'UPDATE ', paramCounter = 0, queryArguments = [];

        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += `SET
        google_rating = `;

        if(rating) {//rating exist
          query += ` $${++paramCounter} `;
          queryArguments.push(rating);
        } else {//no rating - use NULL
          query += ` NULL `
        }

        query += ` , google_rating_count = `;

        if(count) {//count exist
          query += ` $${++paramCounter} `;
          queryArguments.push(count);
        } else {//no count - use NULL
          query += ` NULL `
        }

        query += ` WHERE id = $${++paramCounter};`;
        queryArguments.push(id);
        await pg.query(query, queryArguments);
        return true;
      }

      async insertRatingIntoDB(rating, count, additionalISBN, id, table) {
        let query = 'UPDATE ', paramCounter = 0, queryArguments = [];

        /*get table from tableName param*/
        switch(table) {
          case 'my_books':
          query += ' my_books ';
          break;

          case 'wish_list':
          query += ' wish_list ';
          break;

          case 'stories':
          query += ' stories ';
          break;

          default: /*unknown param*/
          return null;
        }

        query += `SET
        goodreads_rating = `;

        if(rating) {//rating exist
          query += ` $${++paramCounter} `;
          queryArguments.push(rating);
        } else {//no rating - use NULL
          query += ` NULL `
        }

        query += ` , goodreads_rating_count = `;

        if(count) {//count exist
          query += ` $${++paramCounter} `;
          queryArguments.push(count);
        } else {//no count - use NULL
          query += ` NULL `
        }

        query += ` , goodreads_rating_additional_isbn = `;


        if(additionalISBN) {
          /*
          google api was used to fetch rating, not the isbn received from user
          save this isbn in additional_isbn column
          */
          queryArguments.push(additionalISBN);
          query += `  $${++paramCounter} `;
        } else {
          /*isbn from user was used to fetch rating, no additional_isbn for this book*/
          query += ' NULL ';
        }

        queryArguments.push(id);
        query += ` WHERE id = $${++paramCounter};`;

        await pg.query(query, queryArguments);
      }

      async checkIsSerieIdExists(serieId) {
        const query = `SELECT EXISTS(
          SELECT 1 FROM series WHERE id=$1
        );`;
        let result = await pg.query(query, [serieId]);
        result = result.rows[0]['exists'];
        return result;
      }

      async checkIsCollectionIdExists(collectionId) {
        const query = `SELECT EXISTS(
          SELECT 1 FROM my_books WHERE collection = 't' AND id=$1
        );`;
        let result = await pg.query(query, [collectionId]);
        result = result.rows[0]['exists'];
        return result;
      }

      async getStoriesPagesSumFromCollection(collectionId, storyIdToExclude = null) {
        let query = `SELECT COALESCE(
          SUM(
            pages
          ),
          '0'
        ) AS sum FROM stories WHERE parent = $1 `;
        let paramHolder = [collectionId];
        /*add id to exclude if relevant*/
        if(storyIdToExclude) {
          query += ` AND id != $2`;
          paramHolder.push(storyIdToExclude);
        }
        /*close query*/
        query += ';';
        let result = await pg.query(query, paramHolder);
        result = result.rows[0]['sum'];
        return result;
      }

      async checkIfStoryAuthorAndTitleAndPagesExistsInStoriesList(title, author, pages, idToExclude = null) {
        let paramsArgs = [];
        let paramsCounter = 0;
        let query = `SELECT EXISTS(
          SELECT 1 FROM stories WHERE UPPER(name)=$${++paramsCounter} AND pages=$${++paramsCounter} `;
          paramsArgs.push(title.toUpperCase(), pages);
          if(!author) {
            /*no author - meaning same author as collection, value should be null*/
            query += ` AND author IS NULL`;
          } else {
            /*author exists - different one from collection*/
            query += ` AND UPPER(author) =$${++paramsCounter}`;
            paramsArgs.push(author.toUpperCase());
          }
          /*id to ignore*/
          if(idToExclude) {
            query += ` AND id != $${++paramsCounter}`;
            paramsArgs.push(idToExclude);
          }
          /*close query*/
          query += ');';
          let result = await pg.query(query, paramsArgs);
          result = result.rows[0]['exists'];
          return result;
        }

        async checkIfBookAuthorAndTitleExists(title, author, idToExclude = null) {
          let query = `SELECT EXISTS(
            SELECT 1 FROM my_books WHERE UPPER(author)=$1 AND UPPER(name)=$2 `;
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

          async bookFromSerieExists(serieId, serieNum, idToExclude = null) {
            let query = `SELECT EXISTS(
              SELECT 1 FROM my_books WHERE serie=$1 AND serie_num=$2 `;
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

            async checkIfIsbnExists(isbn, idToExclude = null) {
              let query = `SELECT EXISTS(
                SELECT 1 FROM my_books WHERE UPPER(isbn)=$1 `;
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

              async bookFromSerieExistsInWishList(serieId, serieNum, idToExclude = null) {
                let query = `SELECT EXISTS(
                  SELECT 1 FROM wish_list WHERE serie=$1 AND serie_num=$2 `;
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

                async checkIfBookIdExists(id) {
                  const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE id=$1);";
                  let result = await pg.query(query, [id]);
                  result = result.rows[0]['exists'];
                  return result;
                }

                async checkIfEbookNotCompleted(id) {
                  const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE id=$1 AND type = $2 AND read_order IS NULL);";
                  let result = await pg.query(query, [id, 'E']);
                  result = result.rows[0]['exists'];
                  return result;
                }

                async checkIfIsbnExistsInWishList(isbn, idToExclude = null) {
                  let query = `SELECT EXISTS(
                    SELECT 1 FROM wish_list WHERE UPPER(isbn)=$1 `;
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

                  async checkIfBookAuthorAndTitleAndYearExistsInWishList(title, author, year, idToExclude = null) {
                    let query = `SELECT EXISTS(
                      SELECT 1 FROM wish_list WHERE UPPER(author)=$1 AND UPPER(name)=$2 AND year=$3 `;
                      let params = [author.toUpperCase(), title.toUpperCase(), year];
                      /*if idToExclude is not null, exclude this id from query*/
                      if(idToExclude) {
                        query += ` AND id != $4`;
                        params.push(idToExclude);
                      }
                      /*close query*/
                      query += ');';
                      let result = await pg.query(query, params);
                      result = result.rows[0]['exists'];
                      return result;
                    }

                    async checkIfSerieAuthorAndTitleExistsInSeriesList(title, author, idToExclude = null) {
                      let query = `SELECT EXISTS(
                        SELECT 1 FROM series WHERE UPPER(author)=$1 AND UPPER(name)=$2 `;
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

                      async getBookIdFromISBN(isbn) {
                        const query = "SELECT id FROM my_books WHERE isbn=$1;";
                        let result = await pg.query(query, [isbn]);
                        result = result.rows[0]['id'];
                        return result;
                      }

                      async getWishIdFromISBN(isbn) {
                        const query = "SELECT id FROM wish_list WHERE isbn=$1;";
                        let result = await pg.query(query, [isbn]);
                        result = result.rows[0]['id'];
                        return result;
                      }

                      async getStoryIdFromAuthorAndTitleAndParentISBN(title, author, parentISBN) {

                        const query = `SELECT id FROM stories WHERE name=$1 AND parent = (
                          SELECT id FROM my_books WHERE isbn=$2
                        ) AND (
                          author = $3
                          OR
                          (
                            SELECT author FROM my_books WHERE isbn=$4
                          ) = $5
                        );`;
                        let result = await pg.query(query, [title, parentISBN, author, parentISBN, author]);
                        result = result.rows[0]['id'];
                        return result;
                      }

                      async deletePictureHashes(dataArr) {
                        if(!Array.isArray(dataArr)) {/*force array*/
                          dataArr = [dataArr];
                        }

                        let query = `DELETE FROM cache WHERE `;
                        let paramCounter = 0, paramArr = [];

                        dataArr.forEach((data) => {
                          query += ` ( id = $${++ paramCounter} AND folder = $${++ paramCounter} ) OR`;
                          paramArr.push(data.id,data.folder);
                        });
                        /*remove last OR and add ;*/
                        query = query.replace(/OR$/,'') + ";";//remove last comma
                        await pg.query(query, paramArr);
                      }

                      async savePictureHashes(dataArr) {
                        if(!Array.isArray(dataArr)) {/*force array*/
                          dataArr = [dataArr];
                        }
                        let query = `INSERT INTO cache(md5, folder, id) VALUES `, paramCounter = 0, paramArr = [];
                        dataArr.forEach((cvr) => {
                          query += `($${++ paramCounter},$${++ paramCounter},$${++ paramCounter}),`;
                          paramArr.push(cvr.md5,cvr.folder,cvr.id);
                        });
                        query = query.replace(/[,]$/,'') + " ON CONFLICT (id, folder) DO UPDATE SET md5 = EXCLUDED.md5, timestamp=TIMEZONE('ASIA/JERUSALEM'::TEXT, NOW());";//remove last comma + handle updates
                        await pg.query(query, paramArr);
                      }

                      async fetchWishById(id, filters, type) {
                        let query = ` SELECT
                        main.id AS id,
                        main.name AS name,
                        main.isbn AS isbn,
                        main.year AS year,
                        main.description AS description,
                        main.asin AS asin,
                        main.author AS author,
                        main.store AS store,
                        main.order_date AS order_date,
                        main.serie AS serie_id,
                        main.serie_num AS serie_num,
                        series.name AS serie,
                        main.goodreads_rating AS rating,
                        main.goodreads_rating_count AS rating_count,
                        main.google_rating AS google_rating,
                        main.google_rating_count AS google_rating_count,
                        main.amazon_rating AS amazon_rating,
                        main.amazon_rating_count AS amazon_rating_count

                        FROM wish_list main

                        LEFT JOIN  series series
                        ON main.serie = series.id

                        WHERE main.id = $1
                        GROUP BY

                        main.id,
                        main.name,
                        main.year,
                        main.author,
                        main.store,
                        main.ordered,
                        main.description,
                        main.serie_num,
                        main.serie,
                        main.google_rating,
                        main.asin,
                        main.amazon_rating_count,
                        main.amazon_rating,
                        main.google_rating_count,
                        series.name,
                        main.goodreads_rating_count,
                        main.goodreads_rating;`;
                        let result = await pg.query(query, [id]);
                        result = result.rows[0];

                        /*now get the next book id and prev. book id based on filters received*/
                        /*fetch all wishes in wanted order, then get the next and prev. id*/
                        let allWishes = [];
                        if(type === 'wish') {//fetch all wished and search there
                          allWishes = await this.fetchAllWishes(filters);
                        } else if (type === 'purchase') {//fetch from purchased list
                          allWishes = await this.fetchAllPurchased(filters);
                        }

                        /*allWishes.rows will not be defined when this function was called without type argument*/
                        if(typeof allWishes.rows !== 'undefined') {
                          /*iterate all wished until we reach the one with our ID*/
                          for(let i = 0 , l = allWishes.rows.length ; i < l ; i ++ ) {
                            if (allWishes.rows[i].id == id) {/*this listing is the one we are looking for*/
                              /*
                              first get "next id"
                              if selected wish is the last in the list, grab the first as next, if not just grab the next one
                              */
                              result.nextListingId = i === allWishes.rows.length - 1 ? allWishes.rows[0].id : allWishes.rows[i + 1].id;
                              /*
                              get "prev. id"
                              if selected wish is the first in the list, grab the last as prev., if not just grab the prev. one
                              */
                              result.prevListingId = i === 0 ? allWishes.rows[allWishes.rows.length - 1].id : allWishes.rows[i - 1].id;

                              /*exit loop - wanted data found*/
                              break;
                            }
                          }
                        }
                        /*if this book is part of serie, fetch next and prev. in serie*/
                        if(result.serie) {
                          query = `SELECT
                          (
                            SELECT id FROM wish_list WHERE serie = $1 AND serie_num = $2
                          ) AS serie_next_id,

                          (
                            SELECT name FROM wish_list WHERE serie = $3 AND serie_num = $4
                          ) AS serie_next_name,

                          (
                            SELECT id FROM wish_list WHERE serie = $5 AND serie_num = $6
                          ) AS serie_prev_id,

                          (
                            SELECT name FROM wish_list WHERE serie = $7 AND serie_num = $8
                          ) AS serie_prev_name,

                          (
                            SELECT serie_num FROM wish_list WHERE serie = $9 AND serie_num = $10
                          ) AS serie_next_num,

                          (
                            SELECT serie_num FROM wish_list WHERE serie = $11 AND serie_num = $12
                          ) AS serie_prev_num
                          ;`;

                          let seriesResult = await pg.query(query, [
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1
                          ]);
                          seriesResult = seriesResult.rows[0];
                          //merge results
                          result = {...result, ...seriesResult};
                        }
                        return result;
                      }

                      async fetchBookById(id, filters, type) {
                        let query = ` SELECT
                        my_books_main.id AS id,
                        my_books_main.name AS name,
                        my_books_main.isbn AS isbn,
                        my_books_main.year AS year,
                        my_books_main.author AS author,
                        my_books_main.store AS store,
                        my_books_main.asin AS asin,
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
                        my_books_entry2.id AS prev_id,
                        my_books_entry2.name AS prev_name

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
                          allBooks = await this.fetchAllBooks(filters);
                        } else if (type === 'read') {
                          allBooks = await this.fetchAllReads(filters);
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
                          query = `SELECT
                          (
                            SELECT id FROM my_books WHERE serie = $1 AND serie_num = $2
                          ) AS serie_next_id,

                          (
                            SELECT name FROM my_books WHERE serie = $3 AND serie_num = $4
                          ) AS serie_next_name,

                          (
                            SELECT id FROM my_books WHERE serie = $5 AND serie_num = $6
                          ) AS serie_prev_id,

                          (
                            SELECT name FROM my_books WHERE serie = $7 AND serie_num = $8
                          ) AS serie_prev_name,

                          (
                            SELECT serie_num FROM my_books WHERE serie = $9 AND serie_num = $10
                          ) AS serie_next_num,

                          (
                            SELECT serie_num FROM my_books WHERE serie = $11 AND serie_num = $12
                          ) AS serie_prev_num;`;

                          let seriesResult = await pg.query(query, [
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) + 1,
                            result.serie_id,
                            parseInt(result.serie_num,10) - 1,
                          ]);
                          seriesResult = seriesResult.rows[0];
                          //merge results
                          result = {...result, ...seriesResult};
                        }
                        return result;
                      }

                      async fetchCollectionStories(id) {
                        const query = `SELECT * FROM stories WHERE parent = $1;`;
                        let res = await pg.query(query, [id]);
                        return res.rows;
                      }

                      async markWishAsPurchased(id,store) {
                        /*get today's date*/
                        let date = new Date();
                        date  = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

                        const query = `UPDATE wish_list
                        SET
                        ordered = 't',
                        store = $1,
                        order_date = $2
                        WHERE id = $3;`;
                        await pg.query(query, [store.trim().toUpperCase(), date, id]);
                      }

                      async fetchStoryById(id, filters=null) {
                        const query = `SELECT
                        my_stories_main.id AS id,
                        my_stories_main.name AS name,
                        my_stories_main.pages AS pages,
                        my_stories_main.author AS story_author,
                        my_stories_main.read_date AS read_date,
                        my_stories_main.read_order AS read_order,
                        my_stories_main.completed AS read_completed,
                        my_stories_main.asin AS asin,
                        my_stories_main.description AS description,
                        my_books_main.year AS year,
                        my_books_main.name AS collection_name,
                        (
                          SELECT
                          stories_temp_entry_nested_double.index
                          FROM (
                            SELECT
                            stories_temp_entry_nested.id,
                            ROW_NUMBER () OVER (ORDER BY stories_temp_entry_nested.id) AS index
                            FROM stories stories_temp_entry_nested
                            WHERE my_books_main.id = stories_temp_entry_nested.parent
                            ORDER BY stories_temp_entry_nested.id
                          ) stories_temp_entry_nested_double
                          WHERE stories_temp_entry_nested_double.id = $1
                        ) AS collection_number,
                        my_books_main.author AS author,
                        my_books_main.language AS language,
                        my_books_main.listed_date AS listed_date,
                        my_books_main.original_language AS o_language,
                        my_books_main.id AS collection_id,
                        my_stories_entry1.id AS next_collection_id,
                        my_stories_entry1.name AS next_collection_name,
                        my_stories_entry2.id AS prev_collection_id,
                        my_stories_entry2.name AS prev_collection_name,
                        my_stories_main.goodreads_rating_count AS rating_count,
                        my_stories_main.goodreads_rating AS rating,
                        my_stories_main.google_rating AS google_rating,
                        my_stories_main.google_rating_count AS google_rating_count,
                        my_stories_main.amazon_rating AS amazon_rating,
                        my_stories_main.amazon_rating_count AS amazon_rating_count

                        FROM stories my_stories_main

                        LEFT JOIN  my_books my_books_main
                        ON my_stories_main.parent = my_books_main.id

                        LEFT JOIN stories my_stories_entry1
                        ON my_stories_entry1.id = (
                          SELECT id FROM stories temp_stories
                          WHERE temp_stories.parent = my_stories_main.parent
                          AND
                          temp_stories.id > my_stories_main.id
                          ORDER BY temp_stories.id ASC
                          LIMIT 1
                        )

                        LEFT JOIN stories my_stories_entry2
                        ON my_stories_entry2.id = (
                          SELECT id FROM stories temp_stories
                          WHERE temp_stories.parent = my_stories_main.parent
                          AND
                          temp_stories.id < my_stories_main.id
                          ORDER BY temp_stories.id DESC
                          LIMIT 1
                        )

                        WHERE my_stories_main.id = $1
                        GROUP BY
                        my_stories_main.id,
                        my_stories_main.name,
                        my_stories_main.pages,
                        my_stories_main.author,
                        my_stories_main.description,
                        my_books_main.id,
                        my_books_main.name,
                        my_books_main.year,
                        my_books_main.author,
                        my_books_main.language,
                        my_books_main.listed_date,
                        my_stories_main.completed,
                        my_books_main.original_language,
                        my_books_main.read_order,
                        my_stories_entry1.id,
                        my_stories_entry1.name,
                        my_stories_main.asin,
                        my_stories_entry2.id,
                        my_stories_entry2.name,
                        my_stories_main.google_rating,
                        my_stories_main.goodreads_rating_count,
                        my_stories_main.google_rating_count,
                        my_stories_main.amazon_rating_count,
                        my_stories_main.amazon_rating,
                        my_stories_main.goodreads_rating;`;


                        let result = await pg.query(query, [id]);
                        result = result.rows[0];

                        /*now get the next story id and prev. book id based on filters received*/
                        /*fetch all stories in wanted order, then get the next and prev. id*/

                        let allBooks = filters ? await this.fetchAllStories(filters) : null;


                        if(allBooks) {/*function may be called without filters*/
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
                        return result;
                      }

                      async fetchSerieById(id, filters=null) {
                        const query = `SELECT
                        id,
                        name,
                        author,

                        (
                          SELECT
                          JSON_STRIP_NULLS(
                            JSON_AGG(
                              JSONB_BUILD_OBJECT(
                                'name',
                                name,
                                'id',
                                id::TEXT,
                                'number',
                                serie_num::TEXT
                              )
                              ORDER BY serie_num
                            )
                          ) FROM my_books
                          WHERE serie = $1
                        ) AS books,

                        (
                          SELECT
                          JSON_STRIP_NULLS(
                            JSON_AGG(
                              JSONB_BUILD_OBJECT(
                                'name',
                                name,
                                'id',
                                id::TEXT,
                                'number',
                                serie_num::TEXT
                              )
                              ORDER BY serie_num
                            )
                          )  FROM my_books
                          WHERE serie = $1 AND read_order IS NOT NULL
                        ) AS books_read,

                        (
                          SELECT
                          JSON_STRIP_NULLS(
                            JSON_AGG(
                              JSONB_BUILD_OBJECT(
                                'name',
                                name,
                                'id',
                                id::TEXT,
                                'number',
                                serie_num::TEXT
                              )
                              ORDER BY serie_num
                            )
                          ) FROM wish_list
                          WHERE serie = $1 AND ordered != 't'
                        ) AS wish_books,

                        (
                          SELECT
                          JSON_STRIP_NULLS(
                            JSON_AGG(
                              JSONB_BUILD_OBJECT(
                                'name',
                                name,
                                'id',
                                id::TEXT,
                                'number',
                                serie_num::TEXT
                              )
                              ORDER BY serie_num
                            )
                          ) FROM wish_list
                          WHERE serie = $1 AND ordered = 't'
                        ) AS purchased_books

                        FROM series

                        WHERE id = $1`;

                        let result = await pg.query(query, [id]);
                        result = result.rows[0];

                        /*now get the next serie id and prev. book id based on filters received*/
                        /*fetch all stories in wanted order, then get the next and prev. id*/

                        let allBooks = filters ? await this.fetchAllSeries(filters) : null;

                        /*this function may be called without filters*/
                        if(allBooks) {
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
                        return result;
                      }

                      async fetchReadById(id, filters, type) {
                        /*same as "fetch book by id, just different type"*/
                        return this.fetchBookById(...arguments);
                      }

                      async alterBookById(id, bookJson) {
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
                        listed_date = $${++paramsCounter},
                        description = $${++paramsCounter}
                        `;
                        let queryArguments = [bookJson.title, bookJson.year, bookJson.author, bookJson.langOrg, bookJson.lang, bookJson.store.toUpperCase() ,bookJson.isbn, bookJson.type, bookJson.pages, bookJson.asin, bookJson.arrivalDate, bookJson.description];


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
                          let oldStories = await this.fetchCollectionStories(id);
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
                                query = `INSERT INTO stories(name, pages, parent, author) VALUES ($${++paramsCounter},$${++paramsCounter},$${++paramsCounter},`;
                                  queryArguments.push(bookJson.collection[i].title, bookJson.collection[i].pages, id);
                                  if(bookJson.collection[i].author) {//story has author different from collection, add into query
                                    query += `$${++paramsCounter} `;
                                    queryArguments.push(bookJson.collection[i].author);
                                  } else {//same author as collection, set value as NULL
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
                                query = `INSERT INTO stories(name, pages, parent, author) VALUES ($${++paramsCounter},$${++paramsCounter},$${++paramsCounter},`;
                                  queryArguments.push(bookJson.collection[i].title, bookJson.collection[i].pages, id);
                                  if(bookJson.collection[i].author) {//story has author different from collection, add into query
                                    query += `$${++paramsCounter} `;
                                    queryArguments.push(bookJson.collection[i].author);
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
                            this.saveRating(id, bookJson.isbn, bookJson.title, bookJson.author, 'my_books');

                            /********************************************************************************************
                            ALTER STORIES RATING IF COLLECTION
                            *********************************************************************************************/
                            if(bookJson.collection && bookJson.collection.length) {
                              await this.saveCollectionRating(id);
                            }
                          }

                          async alterStoryById(id, storyJson) {
                            /********************************************************************************************
                            GET CURRENT STORY PARENT - IN CASE OF CHANGE - SOME CHANGES IN COLLECTION MAY BE NEEDED
                            *********************************************************************************************/
                            let currentCollection = await this.getStoryCollectionById(id);
                            /********************************************************************************************
                            ALTER STORY IN DB
                            *********************************************************************************************/
                            let paramsCounter = 0;
                            let query = `UPDATE stories SET description=$${++paramsCounter}, name = $${++paramsCounter}, pages = $${++paramsCounter}, asin = $${++paramsCounter} ,parent = $${++paramsCounter}, author `;
                            let queryArguments = [storyJson.description, storyJson.title, storyJson.pages,storyJson.asin, storyJson.collectionId.value];

                            if(storyJson.author) {/*different author than collection*/
                              query += `=$${++paramsCounter} `;
                              queryArguments.push(storyJson.author);
                            } else {/*same author as collection*/
                              query += `= NULL `;
                            }

                            query += ` WHERE id=$${++paramsCounter};`;
                            queryArguments.push(id);
                            await pg.query(query, queryArguments);

                            /********************************************************************************************
                            CHANGE RATING IN DB
                            *********************************************************************************************/
                            await this.saveRating(id, '', storyJson.title, storyJson.actualAuthor, 'stories');

                            /********************************************************************************************
                            IF COLLECTION WAS CHANGED - MAKE NEEDED CHANGES
                            *********************************************************************************************/

                            /*collection wasn't changed - no need to continue*/
                            if(parseInt(currentCollection,10) === parseInt(storyJson.collectionId.value,10)) {
                              return;
                            }

                            /*
                            OLD COLLECTION "LOST" A STORY

                            * CHECK IF ANY STORY LEFT - IF NOT CHANGE THE COLLECTION FLAG TO FALSE
                            * CHECK IF THIS WAS THE ONLY STORY THAT WASN'T READ, IN THIS CASE MARK THIS COLLECTION AS READ
                            */
                            if(await this.getNumberOfStories(currentCollection) === '0') {
                              await pg.query(`UPDATE my_books SET collection = 'f' WHERE id = $1;`, [currentCollection]);
                            }

                            if(await this.allStoriesAreRead(currentCollection)) {
                              await this.markCollectionAsRead(currentCollection);
                            }

                            /*
                            NEW COLLECTION "WON" A STORY
                            * CHECK IF COLLECTION WAS MARKED AS READ AND THE NEW STORY ISN'T - REMOVE THE READ MARK

                            */
                            if(await this.bookMarkedAsRead(storyJson.collectionId.value) && ! await this.allStoriesAreRead(storyJson.collectionId.value)) {/*not all story are read and collection is marked as read*/
                              /*remove read mark*/
                              await this.removeReadMarkFromBook(storyJson.collectionId.value);
                            }
                          }

                          async alterWishById(id, bookJson) {
                            /********************************************************************************************
                            ALTER WISH IN DB
                            *********************************************************************************************/
                            /*general parameters*/
                            let paramsCounter = 0;
                            let query = `UPDATE wish_list SET name = $${++paramsCounter}, year = $${++paramsCounter}, author = $${++paramsCounter}, isbn = $${++paramsCounter}, description = $${++paramsCounter}, asin = $${++paramsCounter}`;

                            let queryArguments = [bookJson.title, bookJson.year, bookJson.author,bookJson.isbn, bookJson.description, bookJson.asin];

                            /*if this wish is part of serie - add serie parameters*/
                            if(bookJson.serie && typeof bookJson.serie.value !== 'undefined' && typeof bookJson.serie.number !== 'undefined') {
                              query += `, serie = $${++paramsCounter}, serie_num = $${++paramsCounter}`;
                              queryArguments.push(bookJson.serie.value,bookJson.serie.number);
                            } else {
                              /*no serie - reset it just in case it was part of serie before*/
                              query += `, serie = NULL, serie_num = NULL`;
                            }

                            query += ` WHERE id = $${++paramsCounter};`;
                            queryArguments.push(id);

                            /*send query*/
                            await pg.query(query, queryArguments);

                            /********************************************************************************************
                            SAVE WISH RATING IN DB - IN CASE THAT THE NEW MODIFICATION IS A CHANGE IN ISBN/TITLE/AUTHOR -> THIS MAY LEAD TO A DIFFERENT RATING
                            *********************************************************************************************/
                            this.saveRating(id, bookJson.isbn, bookJson.title, bookJson.author, 'wish_list');
                          }

                          async markStoryAsRead(id, date, completedPages = null) {
                            /*
                            STEPS:
                            * MARK STORY AS READ
                            * CHECK IF COLLECTION IS COMPLETED, AND MARK AS COMPLETED IF SO
                            */


                            /********************************************************************************************
                            MARK STORY AS READ
                            *********************************************************************************************/
                            let queryParams = [];
                            let queryCounter = 0;
                            let query = `UPDATE stories
                            SET read_order = (
                              (
                                SELECT read_order FROM stories WHERE read_order IS NOT NULL ORDER BY read_order DESC LIMIT 1
                              ) + 1
                            ),
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
                            CHECK IF COLLECTION IS COMPLETED, AND MARK AS COMPLETED IF SO
                            *********************************************************************************************/
                            /*get collection id*/
                            let collectionId = await this.getStoryCollectionById(id);

                            if(await this.allStoriesAreRead(collectionId)) {
                              await this.markCollectionAsRead(collectionId);
                            }
                          }


                          async markBookAsRead(id, date, completedPages = null) {
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

                          async setSeed(seed) {
                            await pg.query(`SELECT SETSEED($1)`, [seed]);
                          }
                        };

                        module.exports = new dbFunctions();
