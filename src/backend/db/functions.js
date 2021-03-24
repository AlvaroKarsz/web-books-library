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
    start by inserting the book to DB
    */
    let queryParams = ['name','year','author','original_language','language','store','isbn','type','pages'];
    let queryArguments = [bookJson.name, bookJson.year, bookJson.author, bookJson.oriLan, bookJson.lang, bookJson.store.toUpperCase() ,bookJson.isbn, bookJson.type, bookJson.pages];

    if(typeof bookJson.serie !== 'undefined' && bookJson.serie) {
      queryParams.push('serie','serie_num');
      queryArguments.push(bookJson.serie,bookJson.serie_number);
    }

    if(typeof bookJson.collection !== 'undefined' && bookJson.collection) {
      queryParams.push('collection');
      queryArguments.push(true);
    }

    if(typeof bookJson.followed !== 'undefined' && bookJson.followed) {
      queryParams.push('next');
      queryArguments.push(bookJson.followed);
    }

    let query = `INSERT INTO my_books(${queryParams.join(",")}) VALUES (${queryParams.map((element, index) => '$' + (index + 1))}) RETURNING id;`;

    let bookId = await pg.query(query, queryArguments);
    bookId = bookId.rows[0].id;

    /*
    if this was a collection insert stories to story table
    */
    if(typeof bookJson.collection !== 'undefined' && bookJson.collection) {
      let counter = 0;
      query = 'INSERT INTO stories(name, pages, parent) VALUES ';
      queryArguments.length = 0;//reset queryArguments array
      bookJson.collection.forEach((stry) => {
        queryArguments.push(stry.name, stry.pages, bookId);
        query += `($${++counter},$${++counter},$${++counter}),`;
      });
      query = query.replace(/[,]$/,'') + ";";//remove last comma
      await pg.query(query, queryArguments);
    }

    /*
    if this book is preceded by another book, change the "next" coulumn in the preceded book to pointer to this newly inserted bookID
    */

    if(typeof bookJson.preceded !== 'undefined' && bookJson.preceded) {
      queryArguments.length = 0;//reset queryArguments array
      query = `UPDATE my_books SET next = $1 WHERE id = $2;`;
      queryArguments.push(bookId, bookJson.preceded);
      await pg.query(query, queryArguments);
    }

    /*
    save the book rating in ratings table
    ignore errors, action success not depends on rating fetching and saving.
    by calling saveRating function without "await" if will return a promise and keep running in background
    */
    this.saveRating(bookId, bookJson.isbn, bookJson.name, bookJson.author, 'my_books');

    return true;
  }

  async saveRating(id, isbn, title, author, tableName) {
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
  };

  module.exports = new dbFunctions();


  /*

  import json
  import requests
  from functions import *


  def fetchAllBooks(db,settings):
  db.execute("SELECT * FROM " + settings['db']['books_table'] + ";")
  return [item for item, in db]

  def fetchAllSeries(db,settings):
  db.execute("SELECT * FROM " + settings['db']['series_table'] + ";")
  return  db.fetchall()


  def updateSerieById(db,settings,json,id):
  sql = '''
  UPDATE  ''' + settings['db']['series_table'] + '''
  SET
  name = %s,
  author = %s

  WHERE id = %s;
  '''

  db.execute(sql,[json['name'],json['author'],id])


  def updateBookById(db,settings,json,id):
  #update main table
  args = [json['name'],json['year'],json['author'],json['oriLan'],json['lang'],json['store'].upper(),json['isbn'],json['type'],json['pages']]
  sql = '''
  UPDATE ''' + settings['db']['books_table'] + '''
  SET
  name = %s,
  year = %s,
  author = %s,
  original_language = %s,
  language = %s,
  store = %s,
  isbn = %s,
  type = %s,
  pages = %s
  '''
  if 'next' in json:
  sql += ''',next = %s'''
  args.append(json['next'])

  if 'serie' in json:
  sql += ",serie = %s,serie_num = %s"
  args += [json['serie']['id'],json['serie']['number']]

  if 'collection' in json:
  sql += ",collection = %s"
  args.append(True)

  sql += '''
  WHERE id = %s
  '''
  args.append(id)
  db.execute(sql,args)

  #update prev if exists
  if 'prev' in json:
  sql = '''
  UPDATE ''' + settings['db']['books_table'] + '''
  SET next = %s
  WHERE id = %s
  '''
  args = [id,json['prev']]
  db.execute(sql,args)

  #delete prev. collection if this new book is not a colletion, in this case collection that are not anymore will not have any stories attached
  if 'collection' not in json:
  sql = '''DELETE FROM ''' + settings['db']['stories_table'] +  ''' WHERE parent = %s;'''
  db.execute(sql,[id])
  else:
  #if this is a collection, fetch all prev. stories and diff between prev. state and current state
  sql = '''SELECT * FROM ''' + settings['db']['stories_table'] +  ''' WHERE parent = %s;'''
  db.execute(sql,[id])
  prevRows = db.fetchall()
  columns = db.description
  prevStories = postgresResultToColumnRowJson(columns,prevRows)
  breakMainLoop = False
  for newStory in json['collection']:
  breakMainLoop = False #reset
  if newStory['id']: #has id - updated story - else new story that needs to be inserted
  for prevStory in prevStories:
  if int(prevStory['id']) == int(newStory['id']):
  sql = '''UPDATE ''' + settings['db']['stories_table'] + ''' SET name=%s, pages=%s WHERE id=%s;'''
  db.execute(sql,[newStory['name'],newStory['pages'], newStory['id']])
  breakMainLoop = True
  break
  if breakMainLoop:
  continue
  else :
  sql = '''INSERT INTO ''' + settings['db']['stories_table'] + '''(name, pages, parent) VALUES(%s,%s,%s);'''
  db.execute(sql,[newStory['name'],newStory['pages'], id])


  def insertNewBook(db,settings,json):
  values = "(name,year,author,original_language,language,store,isbn,type,pages"
  arguments = [json['name'],json['year'],json['author'],json['oriLan'],json['lang'],json['store'].upper(),json['isbn'],json['type'],json['pages']]
  if 'serie' in json:
  values += ",serie,serie_num"
  arguments += [json['serie']['id'],json['serie']['number']]
  if 'collection' in json:
  values += ",collection"
  arguments.append(True)
  if 'next' in json:
  values += ",next"
  arguments.append(json['next'])

  values += ")"

  sql = '''
  INSERT INTO ''' + settings['db']['books_table'] + values +  '''
  VALUES(''' + addMultipleS(len(arguments)) + ''')
  RETURNING id;
  '''

  db.execute(sql,arguments)
  id = db.fetchone()[0]

  if 'collection' in json:
  sql = '''
  INSERT INTO ''' + settings['db']['stories_table'] + '''
  (name,pages,parent) VALUES  ''' + jsonToValues(len(json['collection']),3) + ''';'''
  json['collection'] = addValueToEachJson(json['collection'],'id',id)
  args = convertJsonToFlatArray(json['collection'])
  db.execute(sql,args)

  if 'prev' in json:
  sql = '''
  UPDATE ''' + settings['db']['books_table'] + '''
  SET next = %s
  WHERE id = %s
  '''
  args = [id,json['prev']]
  db.execute(sql,args)


  #try to save the rating in ratings table - on error just continue
  googleIsbn = None #in case that provided isbn not exists in goodreads, and google isbn does
  ratingDict = fetchRating(json['isbn'],settings)
  if not ratingDict or not ratingDict['count'] or not ratingDict['rating']:#could not fetch - try another isbn from google api
  googleIsbn = getISBNfromGoogleApiTitle(json['name'],json['author'],settings)
  if googleIsbn and googleIsbn.isdigit():
  ratingDict = fetchRating(googleIsbn,settings)
  else:
  googleIsbn = None #reset

  if ratingDict and ratingDict['count'] and ratingDict['rating']:#could fetch
  db.execute("""INSERT INTO """ + settings['db']['ratings_table'] + """(table_name, id, count, rating, additional_isbn) VALUES ('""" + settings['db']['books_table'] +  """',%s,%s,%s, """ + ("""'""" + googleIsbn + """'""" if googleIsbn else 'NULL')  + """) ON CONFLICT (id,table_name) DO NOTHING;""",[id,ratingDict['count'],ratingDict['rating']])

  return id


  def jsonToValues(totalArguments,numOfArgumentsEach):
  return (("(" + addMultipleS(numOfArgumentsEach) + "),") * totalArguments)[:-1]


  def addMultipleS(num):
  return ("%s," * num)[:-1]

  def convertJsonToFlatArray(arr):
  return [item for items in map(lambda a: a.values(),arr) for item in items]

  def addValueToEachJson(arr,key,val):
  for miniJson in arr:
  miniJson[key] = val
  return arr

  def getBookNames(db,settings):
  sql = '''
  SELECT
  t1.id,
  REGEXP_REPLACE(
  CONCAT_WS(
  ' - ',
  CONCAT_WS(' ',t2.name,t1.serie_num),
  t1.name || ' - ' || t1.author || '(' || t1.year || ')'
),
'^\s-\s',
''
)

FROM ''' +  settings['db']['books_table'] + '''  t1
LEFT JOIN ''' + settings['db']['series_table'] + ''' t2
ON t2.id =t1.serie
ORDER BY t1.id;'''
db.execute(sql);
return db.fetchall()


def previousBookAlreadyHaveFollow(db,settings,previuos,currentID):
sql = '''
SELECT EXISTS(
SELECT 1 FROM ''' + settings['db']['books_table'] + '''
WHERE id = %s AND next IS NOT NULL '''
args = [previuos]
if currentID:
sql += ''' AND next != %s '''
args += [currentID]
sql += '''  );'''
db.execute(sql,args);
return db.fetchone()[0]


def buildJsonFromSingleRow(columns,row):
i = 0
size = len(columns)
rowTemp = {}
while i < size:
rowTemp[columns[i]] = row[i]
i += 1
return rowTemp

def postgresResultToColumnRowJson(columns,rows):
columns = list( map( lambda a: a[0], [ list(x) for x in columns ] ))
return list (map( lambda row : buildJsonFromSingleRow(columns,row) , rows)  )

def fetchMyLibrary(db,settings):
sql = """
SELECT
main.id,
main.name,
main.author,
main.pages,
main.year,
COALESCE(rat.rating,'0') AS rating
-- if no rating exists - set as zero
FROM """ + settings['db']['books_table'] + """ main

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON main.id = rat.id AND rat.table_name = '""" + settings['db']['books_table'] + """'

ORDER BY
main.id;
"""
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def fetchBookById(db,settings,id):
sql = """
SELECT
my_books_main.id AS id,
my_books_main.name AS name,
my_books_main.year AS year,
my_books_main.author AS author,
my_books_main.store AS store,
my_books_main.language AS language,
my_books_main.original_language AS o_language,
my_books_main.isbn AS isbn,
my_books_main.type AS type,
my_books_main.pages AS pages,
my_books_main.read_order AS read,
my_books_main.read_date AS read_date,
my_books_main.listed_date AS listed_date,
my_books_main.serie_num AS serie_num,
my_books_main.completed AS read_completed,
series_table.name AS serie,
my_books_entry1.id AS next_id,
my_books_entry1.name AS next_name,
my_books_entry1.author AS next_author,
my_books_entry2.id AS prev_id,
my_books_entry2.name AS prev_name,
my_books_entry2.author AS prev_author,
ratings_entry.rating AS rating,
ratings_entry.count AS rating_count,
JSON_STRIP_NULLS(
JSON_AGG(
JSONB_BUILD_OBJECT(
'name',
stories_table.name,
'pages',
stories_table.pages,
'id',
stories_table.id
)
)
) AS stories

FROM """ + settings['db']['books_table'] + """ my_books_main

LEFT JOIN """ +  settings['db']['books_table'] + """ my_books_entry1
ON my_books_main.next = my_books_entry1.id

LEFT JOIN """ + settings['db']['series_table']  + """ series_table
ON my_books_main.serie = series_table.id

LEFT JOIN """ + settings['db']['stories_table']  + """ stories_table
ON my_books_main.id = stories_table.parent

LEFT JOIN """ +  settings['db']['books_table'] + """ my_books_entry2
ON my_books_main.id = my_books_entry2.next

LEFT JOIN """ + settings['db']['ratings_table'] + """ ratings_entry
ON my_books_main.id = ratings_entry.id AND ratings_entry.table_name = '""" + settings['db']['books_table'] + """'

WHERE my_books_main.id = %s
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
my_books_main.read_order,
my_books_main.serie_num,
my_books_main.completed,
series_table.name,
my_books_main.listed_date,
my_books_entry1.id,
my_books_entry1.name,
my_books_entry1.author,
my_books_entry2.id,
my_books_entry2.name,
my_books_entry2.author,
ratings_entry.rating,
ratings_entry.count
"""
db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def markStoryAsReaded(db,settings,storyID,date, pages):
#first mark story as readed
pages = pages if pages else None #null if not relevant
sql = '''
UPDATE ''' + settings['db']['stories_table'] + '''
SET readed_date = %s,
completed = %s,
read_order =
(
(
SELECT read_order FROM ''' + settings['db']['stories_table'] + '''
WHERE read_order IS NOT NULL
ORDER BY read_order DESC
LIMIT 1
) + 1
)
WHERE id=%s RETURNING (
(
SELECT COUNT(1) FROM  ''' + settings['db']['stories_table'] + '''
WHERE readed_date IS NOT NULL
) + 1
);'''
db.execute(sql,[date,pages,storyID])
readedStory = db.fetchone()[0]
readedBook = None
#now check if the collection is completed, if so mark it as readed too
sql = '''SELECT id,readed_date FROM ''' + settings['db']['stories_table'] + ''' WHERE parent =
(
SELECT parent FROM ''' +  settings['db']['stories_table'] + ''' WHERE id = %s
);'''

db.execute(sql,[storyID])
rows = db.fetchall()
columns = db.description
storiesFromSameCollection = postgresResultToColumnRowJson(columns,rows)
updateCollectionFlag = True
#check if all stories were readed
for story in storiesFromSameCollection:
if not story['readed_date']:
updateCollectionFlag = False
break

if updateCollectionFlag:
#find the dates range
fromD = None
toD = None
tmp = None
def compareDbDates(date1,date2,biggerFlag):
if not date1:
return date2
if not date2:
return date1
monthsStrength = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] #higher index - latest month
date1Month = ''.join(list(filter(lambda x: x.isalpha(), date1)))
date2Month = ''.join(list(filter(lambda x: x.isalpha(), date2)))
date1Year = ''.join(list(filter(lambda x: not x.isalpha(), date1)))
date2Year = ''.join(list(filter(lambda x: not x.isalpha(), date2)))

if date1Year > date2Year:
return date1 if biggerFlag else date2
if date1Year < date2Year:
return date2 if biggerFlag else date1
#equal year - check month
if monthsStrength.index(date1Month) > monthsStrength.index(date2Month):
return date1 if biggerFlag else date2
if monthsStrength.index(date1Month) < monthsStrength.index(date2Month):
return date2 if biggerFlag else date1
#equal - return each one - no difference
return date1


for story in storiesFromSameCollection:
tmp = story['readed_date'].replace(' ','').lower().split('-')
for date in tmp:
toD = compareDbDates(toD,date,True)
fromD = compareDbDates(fromD,date,False)

#add white space after month
fromD = fromD[:3] + ' ' + fromD[3:]
toD = toD[:3] + ' ' + toD[3:]

#capitalizate month first letter
fromD = fromD[0].upper() + fromD[1:]
toD = toD[0].upper() + toD[1:]
fullDateString = (fromD + ' - ' + toD) if fromD != toD else fromD
sql = '''UPDATE ''' + settings['db']['books_table'] + '''
SET read_order =
(
(
SELECT read_order FROM ''' + settings['db']['books_table'] + '''
WHERE read_order IS NOT NULL
ORDER BY read_order DESC
LIMIT 1
) + 1
),
read_date = %s
WHERE id =
(
SELECT parent FROM ''' + settings['db']['stories_table'] + ''' WHERE id = %s
)
RETURNING read_order;
'''
db.execute(sql,[fullDateString,storyID])
readedBook = db.fetchone()[0]


return {'book':readedBook, 'story':readedStory}


def markBookAsReaded(db,settings,bookID,date, pages):
#first mark it stories as readed
sql = '''UPDATE ''' + settings['db']['stories_table'] + '''
SET readed_date = %s,
read_order = (
SELECT read_order FROM ''' + settings['db']['stories_table'] + ''' WHERE read_order IS NOT NULL ORDER BY read_order DESC LIMIT 1
) + 1

WHERE id =
(
SELECT id FROM ''' + settings['db']['stories_table'] + ''' WHERE parent = %s AND read_order IS NULL ORDER BY id ASC LIMIT 1
)
RETURNING id;
'''
keepGoing = True
while keepGoing:
db.execute(sql,[date,bookID])
keepGoing = db.rowcount


pages = pages if pages else None #so it will be null in DB
sql = '''UPDATE ''' + settings['db']['books_table'] + '''
SET read_order =
(
(
SELECT read_order FROM ''' + settings['db']['books_table'] + '''
WHERE read_order IS NOT NULL
ORDER BY read_order DESC
LIMIT 1
) + 1
),
read_date = %s,
completed = %s
WHERE id = %s
RETURNING read_order;
'''
db.execute(sql,[date,pages,bookID])
return db.fetchone()[0]


def markWishAsOrdered(db,settings,bookID,store):
date = makeReadableTime()
sql = '''
UPDATE ''' + settings['db']['wish_table'] + '''
SET
ordered = 't',
store = %s,
order_date = %s
WHERE id = %s;
'''
try:
db.execute(sql,[store.upper(),date,bookID])
return True
except Exception as err:
return err


def markThisBookSecondOrder(db,settings,bookID,store):
date = makeReadableTime()
sql = '''
UPDATE ''' + settings['db']['wish_table'] + '''
SET order_date_2 = %s,store = %s
WHERE id = %s;
'''
try:
db.execute(sql,[date,store.upper(),bookID])
return True
except Exception as err:
return err


def markThisBookAsNotPurchased(db,settings,id):
sql = '''
UPDATE ''' + settings['db']['wish_table'] + '''
SET order_date_2 = NULL,
order_date = NULL,
ordered = 'f',
store = NULL
WHERE id = %s;
'''
try:
db.execute(sql,[id])
return True
except Exception as err:
return err



def fetchAllMySeries(db,settings):
sql = '''
SELECT
ser.id,
ser.name,
ser.author,
(
SELECT COUNT(1)
FROM ''' + settings['db']['books_table'] + '''
WHERE serie = ser.id
) AS books,
(
SELECT COUNT(1)
FROM ''' + settings['db']['books_table'] + '''
WHERE serie = ser.id AND read_order IS NOT NULL
) AS books_read,
(
SELECT COUNT(1)
FROM ''' + settings['db']['wish_table'] + '''
WHERE serie = ser.id
) AS wish_books
FROM ''' + settings['db']['series_table'] + ''' ser
ORDER BY ser.id;
'''
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def fetchSerieById(db,settings,id):
sql = '''
SELECT
ser.id,
ser.name,
ser.author,
(
SELECT COUNT(1)
FROM ''' + settings['db']['books_table'] + '''
WHERE serie = ser.id
) AS books,
(
SELECT COUNT(1)
FROM ''' + settings['db']['books_table'] + '''
WHERE serie = ser.id AND read_order IS NOT NULL
) AS books_read,
(
SELECT COUNT(1)
FROM ''' + settings['db']['wish_table'] + '''
WHERE serie = ser.id AND order_date IS NULL
) AS wish_books,
(
SELECT COUNT(1)
FROM ''' + settings['db']['wish_table'] + '''
WHERE serie = ser.id AND order_date IS NOT NULL
) AS purchased_books
FROM ''' + settings['db']['series_table'] + ''' ser
WHERE id = %s
'''
db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def fetchAllMyStories(db,settings):
sql = """
SELECT
self.id,
self.name,
self.pages,
COALESCE(self.read_order,9999999) AS read,
parent.author,
parent.name AS parent_name,
parent.year,
COALESCE(rat.rating,'0') AS rating
-- if no rating exists - set as zero
FROM """ + settings['db']['stories_table'] + """ self

LEFT JOIN """ + settings['db']['books_table'] + """ parent
ON self.parent = parent.id

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON self.id = rat.id AND rat.table_name = '""" + settings['db']['stories_table'] + """'

ORDER BY
self.id;
"""
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def fetchMyReadList(db,settings):
sql = """
SELECT
main.id,
main.name,
main.author,
main.pages,
main.year,
main.read_order AS read,
COALESCE(rat.rating,'0') AS rating
-- if no rating exists - set as zero
FROM """ + settings['db']['books_table'] + """ main

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON main.id = rat.id AND rat.table_name = '""" + settings['db']['books_table'] + """'

WHERE read_order IS NOT NULL
ORDER BY
read_order;
"""
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def fetchStoryById(db,settings,id):
sql = """
SELECT
my_stories_main.id AS id,
my_stories_main.name AS name,
my_stories_main.pages AS pages,
my_stories_main.readed_date AS read_date,
my_stories_main.read_order AS read,
my_stories_main.completed AS read_completed,
my_books_main.year AS year,
my_books_main.name AS parent_name,
my_books_main.author AS author,
my_books_main.language AS language,
my_books_main.listed_date AS listed_date,
my_books_main.original_language AS o_language,
my_stories_entry1.id AS next_id,
my_stories_entry1.name AS next_name,
my_stories_entry2.id AS prev_id,
my_stories_entry2.name AS prev_name,
ratings_e.rating AS rating,
ratings_e.count AS rating_count

FROM """ + settings['db']['stories_table'] + """ my_stories_main

LEFT JOIN  """ + settings['db']['books_table'] + """ my_books_main
ON my_stories_main.parent = my_books_main.id

LEFT JOIN """ +  settings['db']['stories_table'] + """ my_stories_entry1
ON my_stories_entry1.id = (
SELECT id FROM """ + settings['db']['stories_table'] + """ aa
WHERE aa.parent = my_stories_main.parent
AND
aa.id > my_stories_main.id
ORDER BY aa.id ASC
LIMIT 1
)

LEFT JOIN """ +  settings['db']['stories_table'] + """ my_stories_entry2
ON my_stories_entry2.id = (
SELECT id FROM """ + settings['db']['stories_table'] + """ aaa
WHERE aaa.parent = my_stories_main.parent
AND
aaa.id < my_stories_main.id
ORDER BY aaa.id DESC
LIMIT 1
)

LEFT JOIN  """ + settings['db']['ratings_table'] + """ ratings_e
ON my_stories_main.id = ratings_e.id AND ratings_e.table_name = '""" + settings['db']['stories_table'] +  """'

WHERE my_stories_main.id = %s
GROUP BY
my_stories_main.id,
my_stories_main.name,
my_stories_main.pages,
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
my_stories_entry2.id,
my_stories_entry2.name,
ratings_e.rating,
ratings_e.count;
"""
db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def fetchReadById(db,settings,id):
sql = """
SELECT
main.id,
main.name,
main.year,
main.author,
main.language,
main.original_language AS o_language,
main.isbn,
main.type,
main.listed_date,
main.pages,
main.read_order AS read,
main.read_date,
rat.rating AS rating,
rat.count AS rating_count,
JSON_STRIP_NULLS(
JSON_AGG(
JSONB_BUILD_OBJECT(
'name',
stories_table.name,
'pages',
stories_table.pages
)
)
) AS stories
FROM """ + settings['db']['books_table'] + """ main

LEFT JOIN """ + settings['db']['stories_table']  + """ stories_table
ON main.id = stories_table.parent

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON main.id = rat.id AND rat.table_name = '""" + settings['db']['books_table'] + """'

WHERE main.id = %s
GROUP BY
main.id,
main.name,
main.year,
main.author,
main.listed_date,
main.language,
main.original_language,
main.isbn,
main.type,
main.pages,
main.read_order,
main.read_date,
rat.rating,
rat.count;
"""
db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def fetchMyWishlist(db,settings):
sql = """
SELECT
main.id,
main.name,
main.author,
main.year,
COALESCE(rat.rating,'0') AS rating
-- if no rating exists - set as zero
FROM """ + settings['db']['wish_table'] + """ main

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON main.id = rat.id AND rat.table_name = '""" + settings['db']['wish_table'] + """'

WHERE ordered='f'
ORDER BY
main.id;
"""
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)

def fetchMyOrderedlist(db,settings):
sql = """
SELECT
main.id,
main.name,
main.author,
main.year,
main.order_date AS order_date,
COALESCE(rat.rating,'0') AS rating
-- if no rating exists - set as zero
FROM """ + settings['db']['wish_table'] + """ main

LEFT JOIN """ + settings['db']['ratings_table'] + """ rat
ON main.id = rat.id AND rat.table_name = '""" + settings['db']['wish_table'] + """'

WHERE ordered='t'
ORDER BY
main.id;
"""
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def fetchWishById(db,settings,id):
sql = """
SELECT
main.id AS id,
main.name AS name,
main.isbn AS isbn,
main.year AS year,
main.author AS author,
main.store AS store,
main.ordered AS ordered,
main.serie_num AS serie_num,
series.name AS serie,
ratings_e.rating AS rating,
ratings_e.count AS rating_count

FROM """ + settings['db']['wish_table'] + """ main

LEFT JOIN  """ + settings['db']['series_table'] + """ series
ON main.serie = series.id

LEFT JOIN  """ + settings['db']['ratings_table'] + """ ratings_e
ON main.id = ratings_e.id AND ratings_e.table_name = '""" + settings['db']['wish_table'] +  """'

WHERE main.id = %s
GROUP BY

main.id,
main.name,
main.year,
main.author,
main.store,
main.ordered,
main.serie_num,
series.name,
ratings_e.rating,
ratings_e.count;"""

db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def fetchOrderedById(db,settings,id):
sql = """
SELECT
main.id AS id,
main.name AS name,
main.isbn AS isbn,
main.year AS year,
main.store AS store,
main.author AS author,
main.order_date AS order_date,
main.ordered AS ordered,
main.order_date_2 AS order_date_2,
main.serie_num AS serie_num,
series.name AS serie,
ratings_e.rating AS rating,
ratings_e.count AS rating_count

FROM """ + settings['db']['wish_table'] + """ main

LEFT JOIN  """ + settings['db']['series_table'] + """ series
ON main.serie = series.id

LEFT JOIN  """ + settings['db']['ratings_table'] + """ ratings_e
ON main.id = ratings_e.id AND ratings_e.table_name = '""" + settings['db']['wish_table'] +  """'

WHERE main.id = %s
GROUP BY
main.id,
main.store,
main.name,
main.year,
main.ordered,
main.author,
main.order_date,
main.order_date_2,
main.serie_num,
series.name,
ratings_e.rating,
ratings_e.count;
"""
db.execute(sql,[id])
rows = [db.fetchone()]
columns = db.description
return postgresResultToColumnRowJson(columns,rows)[0]


def removeBookFromWishList(db,settings,id):
#first all - remove from rating table - if fails just keep going
db.execute("""DELETE FROM """ +  settings['db']['ratings_table'] + """ WHERE id=%s AND table_name='""" + settings['db']['wish_table'] + """';""",[id])

sql = '''
DELETE FROM ''' + settings['db']['wish_table'] + '''
WHERE id = %s;
'''
try:
db.execute(sql,[id])
return True
except Exception as err:
return err


def insertNewWish(db,settings,objs):
values = "(name,year,author,isbn"
arguments = [objs['name'],objs['year'],objs['author'],objs['isbn']]
if 'store' in objs and objs['store']:
values += ",store"
arguments += [objs['store']]

if 'serie' in objs:
values += ",serie,serie_num"
arguments += [objs['serie']['id'],objs['serie']['number']]

values += ")"

sql = '''
INSERT INTO ''' + settings['db']['wish_table'] + values +  '''
VALUES(''' + addMultipleS(len(arguments)) + ''') RETURNING id;
'''
try:
db.execute(sql,arguments)
id = db.fetchone()[0]

#try to save the rating in ratings table - on error just continue
googleIsbn = None #in case that provided isbn not exists in goodreads, and google isbn does
ratingDict = fetchRating(objs['isbn'],settings)
if not ratingDict or not ratingDict['count'] or not ratingDict['rating']:#could not fetch - try another isbn from google api
googleIsbn = getISBNfromGoogleApiTitle(objs['name'],objs['author'],settings)
if googleIsbn and googleIsbn.isdigit():
ratingDict = fetchRating(googleIsbn,settings)

if ratingDict and ratingDict['count'] and ratingDict['rating']:#could fetch
db.execute("""INSERT INTO """ + settings['db']['ratings_table'] + """(table_name, id, count, rating,additional_isbn) VALUES (%s,%s,%s,%s, """ + ("""'""" + googleIsbn + """'""" if googleIsbn else 'NULL')  + """) ON CONFLICT (id,table_name) DO NOTHING;""",[settings['db']['wish_table'],id,ratingDict['count'],ratingDict['rating']])

return id
except Exception as err:
return err


def updateWishById(db,settings,json,id):
sql = '''
UPDATE  ''' + settings['db']['wish_table'] + '''
SET
name = %s,
year = %s,
author = %s,
isbn = %s
'''
args = [json['name'],json['year'],json['author'],json['isbn']]

if 'store' in json and json['store']:
sql += ''',store = %s'''
args += [json['store']]

if 'serie' in json:
sql += ''',serie = %s ,serie_num = %s'''
args += [json['serie']['id'],json['serie']['number']]

sql += '''
WHERE id = %s;'''
args +=[id]
db.execute(sql,args)




def insertNewSerie(db,settings,json):
sql = '''
INSERT INTO ''' + settings['db']['series_table'] +  '''(name,author)
VALUES(%s,%s) RETURNING id;
'''
try:
db.execute(sql,[json['name'],json['author']])
id = db.fetchone()[0]
return id
except Exception as err:
return err


def deleteFromWishList(db,settings,id):
if not id:
return 'Error, wish list id is not a number'
#first all - remove from rating table - if fails just keep going
db.execute("""DELETE FROM """ +  settings['db']['ratings_table'] + """ WHERE id=%s AND table_name='""" + settings['db']['wish_table'] + """';""",[id])

sql = '''
DELETE FROM ''' + settings['db']['wish_table'] + '''
WHERE id=%s;
'''
try:
db.execute(sql,[id])
return True
except Exception as err:
return err


def getStoriesFromParent(db,settings,parentId):
query = '''
SELECT id,name FROM ''' + settings['db']['stories_table'] + '''
WHERE parent =  %s'''
try:
db.execute(query,[parentId])
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)
except Exception as err:
return False


def deleteFromWSeriesList(db,settings,id):
if not id:
return 'Error, serie id is not a number'
sql = '''
DELETE FROM ''' + settings['db']['series_table'] + '''
WHERE id=%s;
'''
try:
db.execute(sql,[id])
return True
except Exception as err:
return err

def markBookAsUnReadSql(db,settings,id):
sql = '''
UPDATE ''' + settings['db']['books_table'] + '''
SET read_order = NULL, read_date = NULL
WHERE id = %s;
'''
try:
db.execute(sql,[id])
return True
except Exception as err:
return err


def makeStats(db,settings):
sql = '''
SELECT
(
SELECT
JSON_AGG(total_agg)
FROM
(
SELECT
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
) total_agg
) AS total,

(
SELECT
JSON_AGG(language_agg)
FROM
(
SELECT
language AS language,
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
GROUP BY language
) language_agg
) AS language,


(
SELECT
JSON_AGG(type_agg)
FROM
(
SELECT
(CASE WHEN type = 'P' THEN 'Paperback' ELSE CASE WHEN type = 'H' THEN 'Hardcover' ELSE 'Hardcover no Dustjaket'END  END)  AS type,
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
GROUP BY type
) type_agg
) AS type,


(
SELECT
JSON_AGG(serie_agg)
FROM
(
SELECT
series_entry.name AS serie,
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + ''' books_entry
LEFT JOIN ''' + settings['db']['series_table'] + ''' series_entry
ON series_entry.id = books_entry.serie
WHERE books_entry.serie IS NOT NULL
GROUP BY series_entry.name
) serie_agg
) AS serie,


(
SELECT
JSON_AGG(author_agg)
FROM
(
SELECT
author AS author,
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
GROUP BY author
) author_agg
) AS author,


(
SELECT
JSON_AGG(stories_agg)
FROM
(
SELECT
COUNT(1) AS total_stories,
SUM(stories_entry.pages) AS total_pages,
SUM(CASE WHEN parent_entry.read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_stories,
SUM(CASE WHEN  parent_entry.read_order IS NOT NULL THEN stories_entry.pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['stories_table'] + ''' stories_entry
LEFT JOIN ''' + settings['db']['books_table'] + ''' parent_entry
ON stories_entry.parent = parent_entry.id
) stories_agg
) AS stories,


(
SELECT
JSON_AGG(date_agg)
FROM
(
SELECT
UPPER(read_date) AS date,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
WHERE read_date IS NOT NULL
GROUP BY UPPER(read_date)
) date_agg
) AS read_date,


(
SELECT
JSON_AGG(list_agg)
FROM
(
SELECT
SUBSTRING(listed_date::text FROM '[0-9]{4}\-[0-9]{2}') AS date,
COUNT(1) AS books
FROM ''' + settings['db']['books_table'] + '''
GROUP BY SUBSTRING(listed_date::text FROM '[0-9]{4}\-[0-9]{2}')
) list_agg
) AS list_date,


(
SELECT
JSON_AGG(publication_agg)
FROM
(
SELECT
SUBSTRING(year::text FROM '[0-9]{3}') || '0' AS year,
COUNT(1) AS total_books,
SUM(pages) AS total_pages,
SUM(CASE WHEN read_order IS NOT NULL THEN 1 ELSE 0 END) AS readed_books,
SUM(CASE WHEN  read_order IS NOT NULL THEN pages ELSE 0 END) AS readed_pages
FROM ''' + settings['db']['books_table'] + '''
GROUP BY SUBSTRING(year::text FROM '[0-9]{3}')
) publication_agg
) AS publication;
'''
db.execute(sql)
rows = db.fetchall()
columns = db.description
return postgresResultToColumnRowJson(columns,rows)


def updateMD5_inCache(db,settings,md5,folder,pictureId):
sql = '''INSERT INTO ''' + settings['db']['cache_table'] + ''' (id, folder, md5) VALUES ( %s, %s, %s )
ON CONFLICT (id, folder) DO UPDATE SET
md5=%s,
"timestamp" = TIMEZONE('ASIA/JERUSALEM'::TEXT, NOW());'''
db.execute(sql,[str(pictureId), folder, md5, md5])


def removeFromCache(db,settings, id, folder):
sql = '''DELETE FROM ''' + settings['db']['cache_table'] + ''' WHERE id=%s AND folder=%s;'''
db.execute(sql,[str(id), folder])


def fetchCache(db, settings):
db.execute('''SELECT md5, id, folder FROM ''' + settings['db']['cache_table'] + ''';''')
rows = db.fetchall()
columns = db.description
data = postgresResultToColumnRowJson(columns,rows)
outputDict = {}

for cache in data:
if(cache['folder'] not in outputDict):
outputDict[cache['folder']] = {}
outputDict[cache['folder']][str(cache['id'])] = cache['md5']

return outputDict


def cacheRatings(db,settings):
output = {'status':True,'count':''}
data = []
googleIsbnFetch = []#push here books without ratings - and try the google api isbn
#first fetch ISBNS
#books:
db.execute("""SELECT id, isbn,name,author, '""" + settings['db']['books_table'] + """' AS table_name FROM """ + settings['db']['books_table'] + """;""")
rows = db.fetchall()
columns = db.description
data += postgresResultToColumnRowJson(columns,rows)
#wishlist:
db.execute("""SELECT id, isbn,name,author, '""" + settings['db']['wish_table'] + """' AS table_name FROM """ + settings['db']['wish_table'] + """;""")
rows = db.fetchall()
columns = db.description
data += postgresResultToColumnRowJson(columns,rows)
#stories:
db.execute("""SELECT main.id, main.name,books_e.author, '""" + settings['db']['stories_table'] + """' AS table_name, '' AS isbn FROM """ + settings['db']['stories_table'] + """ main LEFT JOIN """ + settings['db']['books_table'] + """ books_e ON books_e.id = main.parent;""")
rows = db.fetchall()
columns = db.description
data += postgresResultToColumnRowJson(columns,rows)

#fetch isbns from ratings table - some isbns not exists in goodreads DB, so ratings table have a column with additional isbns to replace these
db.execute("""SELECT additional_isbn, id, table_name FROM """ + settings['db']['ratings_table'] + """ WHERE additional_isbn IS NOT NULL;""")
rows = db.fetchall()
columns = db.description
additionalIsbns = postgresResultToColumnRowJson(columns,rows)

#replace isbns with additional_isbn, if additional_isbn exists
for bk in additionalIsbns:
for index, mainBook in enumerate(data):
if mainBook['id'] == bk['id'] and mainBook['table_name'] == bk['table_name']: #match
data[index]['isbn'] = bk['additional_isbn']
break

#some additional_isbn are "false" - remove them from list and ignore them
data = [s for s in data if s['isbn'] != 'false']

#create isbn string to fetch goodreads API
isbnString = list(map(lambda a : a['isbn'] ,data))
#now remove empty isbns from stories
isbnString = list(filter(None, isbnString))

#fetch ratings from API
fetchedRatingsFromAPI = fetchRatingsByIsbnArr(isbnString, settings)
if fetchedRatingsFromAPI == False:
output['status'] = False
return output

output['count'] = (len(fetchedRatingsFromAPI))
#iterate api result and keep the rating data in data ARRAY
FoundFlag = False
for book in data:
FoundFlag = False#reset
for ratingResult in fetchedRatingsFromAPI:
#make sure the format is right - numbers and number with one dot - if so - no need to escape value before inserting to DB
if book['isbn'] == ratingResult['isbn'] or book['isbn'] == ratingResult['isbn13']:#match
if isinstance(ratingResult['work_ratings_count'], int) and ratingResult['average_rating'].replace('.','',1).isdigit():#good format
book['rating'] = ratingResult['average_rating']
book['count'] = ratingResult['work_ratings_count']
FoundFlag = True
break
if not FoundFlag:
#if we here - isbn not found for this book - try to fetch isbn from google api, then fetch the ratings again
googleIsbnFetch.append({'name':book['name'],'author':book['author'], 'id':book['id'], 'table_name':book['table_name']})


#fetch google isbns if needed
if len(googleIsbnFetch):
temp = ''
newIsbns = []
for bk in googleIsbnFetch:
temp = '' #reset
temp = getISBNfromGoogleApiTitle(bk['name'],bk['author'],settings)
if temp and temp.isdigit():#found and valid
bk['temp_isbn'] = temp#save isbn
newIsbns.append(temp)#push to arr
if len(newIsbns):#new isbns found - fetch rating from goodreads api
#fetch ratings from API
fetchedRatingsFromAPI = fetchRatingsByIsbnArr(newIsbns, settings)
if fetchedRatingsFromAPI == False:
output['status'] = False
return output

#iterate isbns and add these new ratings
for ratingResult in fetchedRatingsFromAPI:
for book in googleIsbnFetch:
if 'temp_isbn' not in book:
continue
if book['temp_isbn'] == ratingResult['isbn'] or book['temp_isbn'] == ratingResult['isbn13']:#match
if isinstance(ratingResult['work_ratings_count'], int) and ratingResult['average_rating'].replace('.','',1).isdigit():#good format
book['rating'] = ratingResult['average_rating']
book['count'] = ratingResult['work_ratings_count']

#iterate all fetches and append to "data" the new founds
for book in googleIsbnFetch:
if 'rating' in book and 'count' in book and book['rating'] and book['count']:#rating found from google isbn
for mainBookObj in data:
if mainBookObj['id'] == book['id'] and mainBookObj['table_name'] == book['table_name']:#match
mainBookObj['count'] = book['count']
mainBookObj['rating'] = book['rating']
mainBookObj['temp_isbn'] = book['temp_isbn']#save temp isbn in ratings table - so next time we will use this isbn instead of the one from the table's DB
break

#iterate all books and set additional_isbns as "false" if no ratings found - so next time we'll skip it
for idx, book in enumerate(data):
if 'rating' not in book or 'count' not in book:
data[idx]['temp_isbn'] = 'false'#this will indicate to ignore the book next time

#insert rating to DB table
sql = '''INSERT INTO ''' + settings['db']['ratings_table'] + ''' AS main (id, table_name, rating, count, additional_isbn) VALUES '''

for book in data:
if 'rating' in book and 'count' in book:
sql += """('""" + str(book['id']) + """','""" + book['table_name']  + """','""" + book['rating']  + """','""" + str(book['count'])
if 'temp_isbn' in book:#book has temp isbn
sql += """','""" + str(book['temp_isbn']) + """'),"""
else:#no temp isbn
sql += """',NULL),"""
else:#no rating
sql += """('""" + str(book['id']) + """','""" + book['table_name']  + """',NULL,NULL,"""
if 'temp_isbn' in book:#book has temp isbn - save it
sql += """'""" + book['temp_isbn'] + """'),"""
else: # no temp isbn
sql += """NULL),"""

sql = sql[:-1] #remove last comma

sql += """ ON CONFLICT (table_name, id) DO UPDATE SET count = EXCLUDED.count, rating = EXCLUDED.rating, additional_isbn = COALESCE(EXCLUDED.additional_isbn,main.additional_isbn);"""

db.execute(sql)
return output

*/
