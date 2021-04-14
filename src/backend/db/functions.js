const pg = require('./connection').pgClient;

class dbFunctions {
  constructor() {}
  async fetchAllBooks(ops = {}) {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT main.id,
    main.name,
    COALESCE(rat.rating,'0') AS rating
    FROM my_books main
    LEFT JOIN ratings rat
    ON rat.id = main.id AND rat.table_name = 'my_books' `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
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
      query += " main.year DESC "
      break;
      case "pub-l":
      query += " main.year "
      break;
      case 'rat-h':
      query += " rat.rating DESC "
      break;
      case "rat-l":
      query += " rat.rating "
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
      default:
      query += ' main.id ';
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
    let query = `SELECT main.id,
    main.name,
    COALESCE(rat.rating,'0') AS rating
    FROM wish_list main
    LEFT JOIN ratings rat
    ON rat.id = main.id AND rat.table_name = 'wish_list' `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
    }
    let conditions = " WHERE main.ordered = 'f' ";

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
      query += " main.name "
      break;
      case "titl-d":
      query += " main.name DESC "
      break;
      case 'pub-h':
      query += " main.year DESC "
      break;
      case "pub-l":
      query += " main.year "
      break;
      case 'rat-h':
      query += " rat.rating DESC "
      break;
      case "rat-l":
      query += " rat.rating "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      default:
      query += ' main.id ';
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
      filters.push('UPPER(main.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
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
      query += ' main.id ';
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
    COALESCE(rat.rating,'0') AS rating
    FROM stories main
    LEFT JOIN ratings rat
    ON rat.id = main.id AND rat.table_name = 'stories'
    LEFT JOIN my_books parent
    ON main.parent = parent.id `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(parent.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
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
      query += " rat.rating DESC "
      break;
      case "rat-l":
      query += " rat.rating "
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
      query += ' main.id ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM stories main ${conditions};`, params);
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
    let query = `SELECT main.id,
    main.name,
    COALESCE(rat.rating,'0') AS rating
    FROM my_books main
    LEFT JOIN ratings rat
    ON rat.id = main.id AND rat.table_name = 'my_books' `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
    }
    let condition = " WHERE main.read_order IS NOT NULL ";
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
      query += " main.year DESC "
      break;
      case "pub-l":
      query += " main.year "
      break;
      case 'rat-h':
      query += " rat.rating DESC "
      break;
      case "rat-l":
      query += " rat.rating "
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
      default:
      query += ' main.id ';
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
    let query = `SELECT main.id,
    main.name,
    COALESCE(rat.rating,'0') AS rating
    FROM wish_list main
    LEFT JOIN ratings rat
    ON rat.id = main.id AND rat.table_name = 'wish_list' `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) ~ $');
      params.push(authorFilter);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) ~ $');
      params.push(titleFilter);
    }
    let conditions = " WHERE main.ordered = 't' ";
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
      query += " main.name "
      break;
      case "titl-d":
      query += " main.name DESC "
      break;
      case 'pub-h':
      query += " main.year DESC "
      break;
      case "pub-l":
      query += " main.year "
      break;
      case 'rat-h':
      query += " rat.rating DESC "
      break;
      case "rat-l":
      query += " rat.rating "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      case 'prc-f':
      query += " main.order_date "
      break;
      case 'prc-l':
      query += " main.order_date DESC "
      break;
      default:
      query += ' main.id ';
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

  async saveBook(bookJson) {
    /*
    Needed actions:
    1) Insert book to DB.
    2) Insert stories to stories table if this is a collection
    3) If this book is preceded by another book, change the "next" coulumn of the preceded book to pointer to this newly inserted bookID.
    4) Save the book rating in ratings table.
    5) Save stories rating in ratings table if this is a collection.
    */

    /********************************************************************************************
    INSERT BOOK INTO DB
    *********************************************************************************************/
    /*general parameters*/
    let queryParams = ['name','year','author','original_language','language','store','isbn','type','pages'];
    let queryArguments = [bookJson.title, bookJson.year, bookJson.author, bookJson.langOrg, bookJson.lang, bookJson.store.toUpperCase() ,bookJson.isbn, bookJson.type, bookJson.pages];

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
      this.saveBookRating(bookId, bookJson.isbn, bookJson.title, bookJson.author, 'my_books');

      /********************************************************************************************
      SAVE STORIES RATING IF COLLECTION
      *********************************************************************************************/
      if(bookJson.collection && bookJson.collection.length) {
        await this.saveCollectionRating(bookId);
      }
    }

    async saveCollectionRating(bookId) {
      const googleApi = require('../modules/googleApi');
      const goodreads = require('../modules/goodReads');

      let query, bookAuthor, stories, ratings, queryParamsArr = [], paramsCount = 0;
      /*
      stories are saved without ISBN, and ISBN is needed in order to fetch ratings.
      the workaround is fetching story title and author, and look for if ISBN exist for this title.
      if ISBN exist, use it in order to fetch the ratings.
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
      fetch ratings for found isbns - remove nulls from isbn arrays
      */
      ratings = await goodreads.fetchRatings(stories.map(a => a.isbn).filter(a => a));

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
      for(let j = 0, s = ratings.length ; j < s ; j ++ ) {
        if(stories[i].isbn === ratings[j].isbn || stories[i].isbn === ratings[j].isbn13) {
          stories[i].rating = ratings[j].average_rating;
          stories[i].count = ratings[j].work_ratings_count;
          break;//next story
        }
      }
    }

    /*
    save data in ratings table.
    the ISBN used to find data shoud be saved in additional_isbn column.
    SPECIAL CASE:
    if rating not found for a story:
    set rating = null, count = null, additional_isbn = false
    So when running an alogrithm to refetch the rating (updated data), the alogrithm will not try again to fetch ratings for these stories.
    When the alogrithm sees additional_isbn = false, this entry will be ignored
    */

    query = "INSERT INTO  ratings(table_name, id, count, rating, additional_isbn) VALUES ";

    for(let i = 0, l = stories.length ; i < l ; i ++ ) {
      /*table name is stories for all stories, id should be posted anyway in order to identify the story*/
      query += `('stories',$${ ++ paramsCount},`;
      queryParamsArr.push(stories[i].id);

      if(typeof stories[i].rating !== 'undefined') {//story has rating, save it + count + additional ISBN
        query += `$${ ++ paramsCount},$${ ++ paramsCount},$${ ++ paramsCount}),`;
        queryParamsArr.push(stories[i].count, stories[i].rating, stories[i].isbn);
      } else {//no ISBN for this story, insert false
        query += `NULL,NULL,'false'),`;
      }
    }

    query = query.replace(/[,]$/,'') + ";";//remove last comma
    await pg.query(query, queryParamsArr);
  }

  async saveBookRating(id, isbn, title, author, tableName) {
    /*fetch rating and save it in ratings cache table*/
    let rating = null, additionalIsbn = null;

    /*try to fetch rating from goodreads api*/
    const goodreads = require('../modules/goodReads');
    rating = await goodreads.fetchRating(isbn);

    if(!rating) {
      /*rating not found by this isbn, try to fetch another isbn from google api based on book title and author*/
      const googleApi = require('../modules/googleApi');
      additionalIsbn = await googleApi.fetchIsbnByTitleAndAuthor(title,author);
      if(!additionalIsbn) {
        /*no luck - no isbn found*/
        return;
      }
      if(isbn === additionalIsbn) {
        /*isbn found in google api is the same one inserted by user, nothing found in goodreads for this isbn*/
        return;
      }
      /*try to fetch ratings with new isbn from google*/
      rating = await goodreads.fetchRating(additionalIsbn);
      if(!rating) {
        /*nothing found for this isbn as well*/
        return;
      }
    }

    let queryArguments = [tableName, id, rating.count, rating.rating],
    query = `INSERT INTO ratings(table_name, id, count, rating, additional_isbn) VALUES($1,$2,$3,$4,`;

      if(additionalIsbn) {
        /*
        google api was used to fetch rating, not the isbn received from user
        save this isbn in additional_isbn column
        */
        queryArguments.push(additionalIsbn);
        query += '$5';
      } else {
        /*isbn from user was used to fetch rating, no additional_isbn for this book*/
        query += 'NULL'
      }
      query += ') ON CONFLICT (id,table_name) DO NOTHING;';
      await pg.query(query, queryArguments);
    }

    async checkIsSerieIdExists(serieId) {
      const query = "SELECT EXISTS(SELECT 1 FROM series WHERE id=$1);";
      let result = await pg.query(query, [serieId]);
      result = result.rows[0]['exists'];
      return result;
    }

    async bookFromSerieExists(serieId, serieNum) {
      const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE serie=$1 AND serie_num=$2);";
      let result = await pg.query(query, [serieId, serieNum]);
      result = result.rows[0]['exists'];
      return result;
    }

    async checkIfBookIdExists(id) {
      const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE id=$1);";
      let result = await pg.query(query, [id]);
      result = result.rows[0]['exists'];
      return result;
    }

    async checkIfIsbnExists(isbn) {
      const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE UPPER(isbn)=$1);";
      let result = await pg.query(query, [isbn.toUpperCase()]);
      result = result.rows[0]['exists'];
      return result;
    }

    async checkIfBookAuthorAndTitleExists(title, author) {
      const query = "SELECT EXISTS(SELECT 1 FROM my_books WHERE UPPER(author)=$1 AND UPPER(name)=$2);";
      let result = await pg.query(query, [author.toUpperCase(), title.toUpperCase()]);
      result = result.rows[0]['exists'];
      return result;
    }

    async getBookIdFromISBN(isbn) {
      const query = "SELECT id FROM my_books WHERE isbn=$1;";
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

    async savePictureHashes(dataArr) {
      let query = `INSERT INTO cache(md5, folder, id) VALUES `, paramCounter = 0, paramArr = [];
      dataArr.forEach((cvr) => {
        query += `($${++ paramCounter},$${++ paramCounter},$${++ paramCounter}),`;
        paramArr.push(cvr.md5,cvr.folder,cvr.id);
      });
      query = query.replace(/[,]$/,'') + " ON CONFLICT (id, folder) DO UPDATE SET md5 = EXCLUDED.md5, timestamp=TIMEZONE('ASIA/JERUSALEM'::TEXT, NOW());";//remove last comma + handle updates
      await pg.query(query, paramArr);
    }
  };

  module.exports = new dbFunctions();
