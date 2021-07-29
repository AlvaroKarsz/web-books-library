const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  /*check if wish ID exist in DB*/
  _THIS.wishExists = async (id) => {
    let exists = await pg.query(`SELECT EXISTS(SELECT 1 FROM wish_list WHERE id = $1);`, [id]);
    return exists.rows[0].exists;
  }

  /*check if ISBN exist in wishlist, option to exclude a wish ID*/
  _THIS.checkIfIsbnExistsInWishList = async (isbn, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM wish_list WHERE UPPER(isbn)=$1 `;
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

  /*gets wish ISBN, returns ID*/
  _THIS.getWishIdFromISBN = async (isbn) => {
    const query = "SELECT id FROM wish_list WHERE isbn=$1;";
    let result = await pg.query(query, [isbn]);
    result = result.rows[0]['id'];
    return result;
  }

  /*update wish's description*/
  _THIS.changeWishDescription = async (id, description) => {
    await pg.query('UPDATE wish_list SET description=$1 WHERE id = $2;', [description, id]);
  }

  /*change wish status from normal to "purchased"*/
  _THIS.markWishAsPurchased = async (id,store) => {
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

  /*change wish status from "purchased" to normal wish*/
  _THIS.cancelPurchaseMark = async (id) => {
    let query = `UPDATE wish_list
    SET store = NULL,
    order_date = NULL,
    ordered = 'f'
    WHERE id = $1;`;
    await pg.query(query, [id]);
  }

  /*insert a new wish into DB wishlist*/
  _THIS.saveWish = async (bookJson) => {
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

    /*if tags was received, add it to query*/
    if(bookJson.tags) {
      queryParams.push('tags');
      queryArguments.push(bookJson.tags);
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
    _THIS.saveRating(wishId, bookJson.isbn, bookJson.title, bookJson.author, 'wish_list').then((res) => {
      /*
      if this book is part of a serie, since serie ratings is just it books av. ratings. calculate the new serie ratings. tags are fetched from books as well
      IMPORTANT: this action is done AFTER "saveRating" finishes, it may take some time since it search for ratings in external APIs
      */
      if(bookJson.serie && typeof bookJson.serie.value !== 'undefined') {
        _THIS.saveSerieRating(bookJson.serie.value);
        _THIS.saveSerieTags(bookJson.serie.value);
      }
    });
  }

  /*alter a wish that already exist in DB wishlist*/
  _THIS.alterWishById = async (id, bookJson) => {
    /********************************************************************************************
    ALTER WISH IN DB
    *********************************************************************************************/
    /*general parameters*/
    let paramsCounter = 0;
    let query = `UPDATE wish_list SET name = $${++paramsCounter}, year = $${++paramsCounter}, author = $${++paramsCounter}, isbn = $${++paramsCounter}, description = $${++paramsCounter}, asin = $${++paramsCounter}, tags = $${++paramsCounter}`;

    let queryArguments = [bookJson.title, bookJson.year, bookJson.author,bookJson.isbn, bookJson.description, bookJson.asin, bookJson.tags];

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
    _THIS.saveRating(id, bookJson.isbn, bookJson.title, bookJson.author, 'wish_list').then((res) => {
      /*
      if this book is part of a serie, since serie ratings is just it books av. ratings. calculate the new serie ratings. tags are fetched from books as well
      IMPORTANT: this action is done AFTER "saveRating" finishes, it may take some time since it search for ratings in external APIs
      */
      if(bookJson.serie && typeof bookJson.serie.value !== 'undefined') {
        _THIS.saveSerieRating(bookJson.serie.value);
        _THIS.saveSerieTags(bookJson.serie.value);
      }
    });
  }

  /*fetch all wishlist that are not marked as purchased, option to pass filters*/
  _THIS.fetchAllWishes = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const isbnFilter = typeof ops.isbnFilter !== 'undefined' ? unescape(ops.isbnFilter.toUpperCase()) : null;
    const tagsFilter = typeof ops.tagsFilter !== 'undefined' ? unescape(ops.tagsFilter.toUpperCase()) : null;
    const descriptionFilter = typeof ops.descriptionFilter !== 'undefined' ? unescape(ops.descriptionFilter.toUpperCase()) : null;
    const fromYearFilter = typeof ops.fromYearFilter !== 'undefined' ? unescape(ops.fromYearFilter) : null;
    const toYearFilter = typeof ops.toYearFilter !== 'undefined' ? unescape(ops.toYearFilter) : null;
    const fromRatingFilter = typeof ops.fromRatingFilter !== 'undefined' ? unescape(ops.fromRatingFilter) : null;
    const toRatingFilter = typeof ops.toRatingFilter !== 'undefined' ? unescape(ops.toRatingFilter) : null;
    const serieFilter = typeof ops.serieFilter !== 'undefined' ? unescape(ops.serieFilter.toUpperCase()) : null;
    const isPartSerieFilter = typeof ops.isPartSerieFilter !== 'undefined' ? ops.isPartSerieFilter : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;

    let query = `SELECT main.id,
    main.name
    FROM wish_list main

    LEFT JOIN series serie_entry
    ON serie_entry.id = main.serie `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }

    if(isbnFilter !== null) {
      filters.push('UPPER(main.isbn) LIKE $');
      params.push(`%${isbnFilter}%`);
    }

    if(tagsFilter !== null) {
      filters.push('UPPER(main.tags) LIKE $');
      params.push(`%${tagsFilter}%`);
    }

    if(descriptionFilter !== null) {
      filters.push('UPPER(main.description) LIKE $');
      params.push(`%${descriptionFilter}%`);
    }

    if(fromYearFilter !== null) {
      filters.push('main.year >= $');
      params.push(fromYearFilter);
    }

    if(toYearFilter !== null) {
      filters.push('main.year <= $');
      params.push(toYearFilter);
    }

    if(fromRatingFilter !== null) {
      filters.push('main.goodreads_rating >= $');
      params.push(fromRatingFilter);
    }

    if(toRatingFilter !== null) {
      filters.push('main.goodreads_rating <= $');
      params.push(toRatingFilter);
    }

    if(serieFilter !== null) {
      filters.push('UPPER(serie_entry.name) LIKE $');
      params.push(`%${serieFilter}%`);
    }


    let paramCounter = 0; //count number of params

    let conditions = " WHERE main.ordered = 'f' AND ";

    if(filters.length) {//we have filters
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }

      paramCounter = filters.length;
    }

    //remove last AND
    conditions = conditions.replace(/\sAND\s$/,'');

    if(isPartSerieFilter !== null) {
      conditions += ` AND main.serie IS ${isPartSerieFilter && 'NOT' || '' } NULL `;
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
      query += " COALESCE(main.goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(main.goodreads_rating,'0') "
      break;
      case "rat-c-h":
      query += " COALESCE(main.goodreads_rating_count,0) DESC "
      break;
      case "rat-c-l":
      query += " COALESCE(main.goodreads_rating_count,0) "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM wish_list main LEFT JOIN series serie_entry ON serie_entry.id = main.serie ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + ++paramCounter + " OFFSET $" + ++paramCounter + ";";
    params.push(limit, offset);

    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*fetch all wishlist books that are marked as purchased, option to pass filters*/
  _THIS.fetchAllPurchased = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const isbnFilter = typeof ops.isbnFilter !== 'undefined' ? unescape(ops.isbnFilter.toUpperCase()) : null;
    const tagsFilter = typeof ops.tagsFilter !== 'undefined' ? unescape(ops.tagsFilter.toUpperCase()) : null;
    const descriptionFilter = typeof ops.descriptionFilter !== 'undefined' ? unescape(ops.descriptionFilter.toUpperCase()) : null;
    const fromYearFilter = typeof ops.fromYearFilter !== 'undefined' ? unescape(ops.fromYearFilter) : null;
    const toYearFilter = typeof ops.toYearFilter !== 'undefined' ? unescape(ops.toYearFilter) : null;
    const fromRatingFilter = typeof ops.fromRatingFilter !== 'undefined' ? unescape(ops.fromRatingFilter) : null;
    const storeFilter = typeof ops.storeFilter !== 'undefined' ? unescape(ops.storeFilter.toUpperCase()) : null;
    const toRatingFilter = typeof ops.toRatingFilter !== 'undefined' ? unescape(ops.toRatingFilter) : null;
    const serieFilter = typeof ops.serieFilter !== 'undefined' ? unescape(ops.serieFilter.toUpperCase()) : null;
    const isPartSerieFilter = typeof ops.isPartSerieFilter !== 'undefined' ? ops.isPartSerieFilter : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;

    let query = `SELECT main.id,
    main.name
    FROM wish_list main

    LEFT JOIN series serie_entry
    ON serie_entry.id = main.serie `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(main.author) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }

    if(isbnFilter !== null) {
      filters.push('UPPER(main.isbn) LIKE $');
      params.push(`%${isbnFilter}%`);
    }

    if(tagsFilter !== null) {
      filters.push('UPPER(main.tags) LIKE $');
      params.push(`%${tagsFilter}%`);
    }

    if(descriptionFilter !== null) {
      filters.push('UPPER(main.description) LIKE $');
      params.push(`%${descriptionFilter}%`);
    }

    if(fromYearFilter !== null) {
      filters.push('main.year >= $');
      params.push(fromYearFilter);
    }

    if(toYearFilter !== null) {
      filters.push('main.year <= $');
      params.push(toYearFilter);
    }

    if(storeFilter !== null) {
      filters.push('UPPER(main.store) LIKE $');
      params.push(`%${storeFilter}%`);
    }

    if(fromRatingFilter !== null) {
      filters.push('main.goodreads_rating >= $');
      params.push(fromRatingFilter);
    }

    if(toRatingFilter !== null) {
      filters.push('main.goodreads_rating <= $');
      params.push(toRatingFilter);
    }

    if(serieFilter !== null) {
      filters.push('UPPER(serie_entry.name) LIKE $');
      params.push(`%${serieFilter}%`);
    }


    let paramCounter = 0; //count number of params

    let conditions = " WHERE main.ordered = 't' AND ";

    if(filters.length) {//we have filters
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }

      paramCounter = filters.length;
    }

    //remove last AND
    conditions = conditions.replace(/\sAND\s$/,'');

    if(isPartSerieFilter !== null) {
      conditions += ` AND main.serie IS ${isPartSerieFilter && 'NOT' || '' } NULL `;
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
      query += " COALESCE(main.goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(main.goodreads_rating,'0') "
      break;
      case "rat-c-h":
      query += " COALESCE(main.goodreads_rating_count,0) DESC "
      break;
      case "rat-c-l":
      query += " COALESCE(main.goodreads_rating_count,0) "
      break;
      case 'lst-l':
      query += " main.id "
      break;
      case 'lst-f':
      query += " main.id DESC "
      break;
      case 'prc-f':
      query += " main.order_date::DATE DESC "
      break;
      case 'prc-l':
      query += " main.order_date::DATE "
      break;
      default:
      query += ' RANDOM() ';
      break;
    }
    //first get count
    let count = await pg.query(`SELECT COUNT(1) FROM wish_list main LEFT JOIN series serie_entry ON serie_entry.id = main.serie ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + ++paramCounter + " OFFSET $" + ++paramCounter + ";";
    params.push(limit, offset);

    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*fetch all wish data*/
  _THIS.fetchWishById = async (id, filters, type) => {
    let query = ` SELECT
    main.id AS id,
    main.name AS name,
    main.isbn AS isbn,
    main.year AS year,
    main.tags AS tags,
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
    main.tags,
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
      allWishes = await _THIS.fetchAllWishes(filters);
    } else if (type === 'purchase') {//fetch from purchased list
      allWishes = await _THIS.fetchAllPurchased(filters);
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
    /*
    if this book is part of serie, fetch next and prev. in serie
    */
    if(result.serie) {
      //merge results with serie results
      result = {...result, ... await _THIS.getAdjacentInSeries(result.serie_id, result.serie_num)};
    }
    /*now fetch book groups (if any)*/
    query = `SELECT JSON_STRIP_NULLS(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'name',
              name,
              'id',
              id
            )
          )
        ) AS groups
        FROM "groups" WHERE id IN (
          SELECT UNNEST("group") FROM wish_list WHERE id = $1
        );`;
    let groups = await pg.query(query, [id]);
    result.groups = groups.rows[0].groups;
    return result;
  }

  /*search and save ratings for a book from wishlist*/
  _THIS.saveWishRating = async (id) => {
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
    return await _THIS.saveRating(id, neededData.isbn, neededData.name, neededData.author, 'wish_list');
  }

  /*check if a book with this title+author+publication year already exist in wishlist*/
  _THIS.checkIfBookAuthorAndTitleAndYearExistsInWishList = async (title, author, year, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM wish_list WHERE UPPER(author)=$1 AND UPPER(name)=$2 AND year=$3 `;
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

  /*delete a book from wishlist*/
  _THIS.deleteWish = async (id) => {
    /*
    before the wish is deleted from wishlist, check if wish is part of a series.
    Since serie ratings is just it books av. ratings. calculate the new serie ratings.
    */
    let serie = await pg.query(`SELECT serie FROM wish_list WHERE id = $1;`, [id]);
    serie = serie.rows[0].serie;

    /*delete the wish from wishlist*/
    await pg.query(`DELETE FROM wish_list WHERE id = $1;`, [id]);

    /*is wish is part of serie  -calculate new ratings & tags for serie*/
    if(serie) {
      _THIS.saveSerieRating(serie);
      _THIS.saveSerieTags(serie);
    }
  }

  /*count how many books in wishlist are part of this serie*/
  _THIS.getWishesCountFromSerie = async (id) => {
    let count = await pg.query(`SELECT COUNT(1) FROM wish_list WHERE serie = $1;`, [id]);
    return count.rows[0].count;
  }

};
