const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  /*check if serie ID exist in DB*/
  _THIS.serieExists = async (id) => {
    let exists = await pg.query(`SELECT EXISTS(SELECT 1 FROM series WHERE id = $1);`, [id]);
    return exists.rows[0].exists;
  }

  /*get next book and prev. book in serie*/
  _THIS.getAdjacentInSeries = async (serie, num) => {
    /*gets serie and serie num, returns next and prev. in serie*/
    let query = `SELECT
    (
      SELECT id FROM my_books WHERE serie = $1 AND serie_num = $2
      UNION
      SELECT id FROM wish_list WHERE serie = $3 AND serie_num = $4
      UNION
      SELECT id FROM stories WHERE serie = $5 AND serie_num = $6
    ) AS serie_next_id,

    (
      SELECT name FROM my_books WHERE serie = $7 AND serie_num = $8
      UNION
      SELECT name FROM wish_list WHERE serie = $9 AND serie_num = $10
      UNION
      SELECT name FROM stories WHERE serie = $11 AND serie_num = $12
    ) AS serie_next_name,

    (
      SELECT id FROM my_books WHERE serie = $13 AND serie_num = $14
      UNION
      SELECT id FROM wish_list WHERE serie = $15 AND serie_num = $16
      UNION
      SELECT id FROM stories WHERE serie = $17 AND serie_num = $18
    ) AS serie_prev_id,

    (
      SELECT name FROM my_books WHERE serie = $19 AND serie_num = $20
      UNION
      SELECT name FROM wish_list WHERE serie = $21 AND serie_num = $22
      UNION
      SELECT name FROM stories WHERE serie = $23 AND serie_num = $24
    ) AS serie_prev_name,

    (
      SELECT serie_num FROM my_books WHERE serie = $25 AND serie_num = $26
      UNION
      SELECT serie_num FROM wish_list WHERE serie = $27 AND serie_num = $28
      UNION
      SELECT serie_num FROM stories WHERE serie = $29 AND serie_num = $30
    ) AS serie_next_num,

    (
      SELECT serie_num FROM my_books WHERE serie = $31 AND serie_num = $32
      UNION
      SELECT serie_num FROM wish_list WHERE serie = $33 AND serie_num = $34
      UNION
      SELECT serie_num FROM stories WHERE serie = $35 AND serie_num = $36
    ) AS serie_prev_num,

    (
      SELECT CASE
      WHEN read_order IS NOT NULL THEN 'reads'
      ELSE 'books'
      END
      FROM my_books WHERE serie = $37 AND serie_num = $38
      UNION
      SELECT CASE
      WHEN order_date IS NOT NULL THEN 'purchased'
      ELSE 'wishlist'
      END
      FROM wish_list WHERE serie = $39 AND serie_num = $40
      UNION
      SELECT 'stories' FROM stories WHERE serie = $41 AND serie_num = $42
    ) AS serie_prev_type,

    (
      SELECT CASE
      WHEN read_order IS NOT NULL THEN 'reads'
      ELSE 'books'
      END
      FROM my_books WHERE serie = $43 AND serie_num = $44
      UNION
      SELECT CASE
      WHEN order_date IS NOT NULL THEN 'purchased'
      ELSE 'wishlist'
      END
      FROM wish_list WHERE serie = $45 AND serie_num = $46
      UNION
      SELECT 'stories' FROM stories WHERE serie = $47 AND serie_num = $48
    ) AS serie_next_type;`;

    let seriesResult = await pg.query(query, [
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) - 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1,
      serie,
      parseInt(num,10) + 1
    ]);

    seriesResult = seriesResult.rows[0];
    return seriesResult;
  }

  /*fetch all series from DB, option to use filters*/
  _THIS.fetchAllSeries = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;
    let query = `SELECT
    main.id,
    main.name,
    (
      (
        SELECT COUNT(1)
        FROM my_books
        WHERE serie = main.id
      )
      +
      (
        SELECT COUNT(1)
        FROM stories
        WHERE serie = main.id
      )
    ) AS owned_books,
    (
      (
        SELECT COUNT(1)
        FROM my_books
        WHERE serie = main.id AND read_order IS NOT NULL
      )
      +
      (
        SELECT COUNT(1)
        FROM stories
        WHERE serie = main.id AND read_order IS NOT NULL
      )
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
      case 'rat-h':
      query += " COALESCE(goodreads_rating,'0') DESC "
      break;
      case "rat-l":
      query += " COALESCE(goodreads_rating,'0') "
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

  /*fetch all serie data*/
  _THIS.fetchSerieById = async (id, filters=null) => {
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
      ) FROM stories
      WHERE serie = $1
    ) AS stories_list,

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
      )  FROM stories
      WHERE serie = $1 AND read_order IS NOT NULL
    ) AS stories_read,

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
    ) AS purchased_books,

    goodreads_rating_count AS rating_count,
    goodreads_rating AS rating,
    google_rating AS google_rating,
    google_rating_count AS google_rating_count,
    amazon_rating AS amazon_rating,
    amazon_rating_count AS amazon_rating_count

    FROM series

    WHERE id = $1`;

    let result = await pg.query(query, [id]);
    result = result.rows[0];

    /*now get the next serie id and prev. book id based on filters received*/
    /*fetch all stories in wanted order, then get the next and prev. id*/

    let allBooks = filters ? await _THIS.fetchAllSeries(filters) : null;

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

  /*delete book serie (just serie without books) from DB*/
  _THIS.deleteSerie = async (id) => {
    await pg.query(`DELETE FROM series WHERE id = $1;`, [id]);
  }

  /*check if a serie with this title and author already exsit in DB*/
  _THIS.checkIfSerieAuthorAndTitleExistsInSeriesList = async (title, author, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM series WHERE UPPER(author)=$1 AND UPPER(name)=$2 `;
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

  /*check if a serie with this ID exists in DB*/
  _THIS.checkIsSerieIdExists = async (serieId) => {
    const query = `SELECT EXISTS(SELECT 1 FROM series WHERE id=$1);`;
    let result = await pg.query(query, [serieId]);
    result = result.rows[0]['exists'];
    return result;
  }

  /*get serie ID based on serie title and author*/
  _THIS.getSerieIdFromTitleAndAuthor = async (title, author) => {
    let res = await pg.query(`SELECT id FROM series WHERE LOWER(name) = $1 AND LOWER(author) = $2;`, [title.toLowerCase(), author.toLowerCase()]);
    return res.rows[0].id;
  }

  /*insert a new book serie into DB*/
  _THIS.saveSerie = async (serieJson) => {
    await pg.query(`INSERT INTO series(name, author) VALUES($1,$2);`, [serieJson.title, serieJson.author]);
  }

  /*alter a serie that already exist in DB*/
  _THIS.alterSerieById = async (id, serieJson) => {
    await pg.query(`UPDATE series SET name = $1, author = $2 WHERE id = $3;`, [serieJson.title, serieJson.author, id]);
  }

  /*fetch all series, each serie in a full string format*/
  _THIS.fetchSeriesForHtml = async () => {
    let res = await pg.query(`SELECT (name || ' by ' || author) AS text, id FROM series;`);
    return res.rows;
  }

  /*calculate and save serie ratings in DB*/
  _THIS.saveSerieRating = async (id) => {
    /*calculation is based on serie's books, calculate average and save as serie ratings*/

    /*fetch all relevant ratings*/
    const query = `SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM my_books WHERE serie = $1

    UNION

    SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM wish_list WHERE serie = $2

    UNION

    SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM stories WHERE serie = $3;`

    let res = await pg.query(query, [id, id, id]);
    res = res.rows;

    /*vars to save ratings*/
    let gdrs = {
      rating: 0,
      count: 0
    },
    ggl = {
      rating: 0,
      count: 0
    },
    amzn = {
      rating: 0,
      count: 0
    };

    /*iterate through DB output and calculate weighted av.*/
    for(let i = 0 , s = res.length;  i < s ; i ++ ) {
      if(res[i].goodreads_rating) {
        gdrs.rating += parseFloat(res[i].goodreads_rating) * res[i].goodreads_rating_count;
        gdrs.count += parseInt(res[i].goodreads_rating_count);
      }

      if(res[i].google_rating) {
        ggl.rating += parseFloat(res[i].google_rating) * res[i].google_rating_count;
        ggl.count += parseInt(res[i].google_rating_count);
      }

      if(res[i].amazon_rating) {
        amzn.rating += parseFloat(res[i].amazon_rating) * res[i].amazon_rating_count;
        amzn.count += parseInt(res[i].amazon_rating_count);
      }
    }

    /*divide by number of votes*/
    if(gdrs.count) {
      gdrs.rating = gdrs.rating / gdrs.count;
    }

    if(ggl.count) {
      ggl.rating = ggl.rating / ggl.count;
    }

    if(amzn.count) {
      amzn.rating = amzn.rating / amzn.count;
    }

    /*save 2 numbers after decimal point*/

    if(gdrs.rating) {
      gdrs.rating = gdrs.rating.toFixed(2);
    }

    if(ggl.rating) {
      ggl.rating = ggl.rating.toFixed(2);
    }

    if(amzn.rating) {
      amzn.rating = amzn.rating.toFixed(2);
    }

    /*save results in DB*/
    await _THIS.saveAmazonRating(id, amzn.rating, amzn.count, 'series');
    await _THIS.saveGoogleRating(id, ggl.rating, ggl.count, 'series');
    await _THIS.insertSerieGoodReadsRatingIntoDB(id, gdrs.rating, gdrs.count, 'series');

    /*success*/
    return true;
  }

  /*check if a book in serie's location already exist*/
  _THIS.serieNumExist = async (serieId, serieNum) => {
    const query = `SELECT
    id as id,
    'book' AS type
    FROM my_books
    WHERE serie=$1 AND serie_num = $2

    UNION

    SELECT
    id as id,
    'wish' AS type
    FROM wish_list
    WHERE serie=$3 AND serie_num = $4

    UNION

    SELECT
    id as id,
    'story' AS type
    FROM stories
    WHERE serie=$5 AND serie_num = $6;`;

    let result = await pg.query(query, [serieId, serieNum,serieId, serieNum,serieId, serieNum]);
    return result.rows[0];
  }

};
