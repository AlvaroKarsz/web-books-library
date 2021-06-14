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
    ) AS serie_next_id,

    (
      SELECT name FROM my_books WHERE serie = $5 AND serie_num = $6
      UNION
      SELECT name FROM wish_list WHERE serie = $7 AND serie_num = $8
    ) AS serie_next_name,

    (
      SELECT id FROM my_books WHERE serie = $9 AND serie_num = $10
      UNION
      SELECT id FROM wish_list WHERE serie = $11 AND serie_num = $12
    ) AS serie_prev_id,

    (
      SELECT name FROM my_books WHERE serie = $13 AND serie_num = $14
      UNION
      SELECT name FROM wish_list WHERE serie = $15 AND serie_num = $16
    ) AS serie_prev_name,

    (
      SELECT serie_num FROM my_books WHERE serie = $17 AND serie_num = $18
      UNION
      SELECT serie_num FROM wish_list WHERE serie = $19 AND serie_num = $20
    ) AS serie_next_num,

    (
      SELECT serie_num FROM my_books WHERE serie = $21 AND serie_num = $22
      UNION
      SELECT serie_num FROM wish_list WHERE serie = $23 AND serie_num = $24

    ) AS serie_prev_num,

    (
      SELECT CASE
      WHEN read_order IS NOT NULL THEN 'reads'
      ELSE 'books'
      END
      FROM my_books WHERE serie = $25 AND serie_num = $26
      UNION
      SELECT CASE
      WHEN order_date IS NOT NULL THEN 'purchased'
      ELSE 'wishlist'
      END
      FROM wish_list WHERE serie = $27 AND serie_num = $28
    ) AS serie_prev_type,

    (
      SELECT CASE
      WHEN read_order IS NOT NULL THEN 'reads'
      ELSE 'books'
      END
      FROM my_books WHERE serie = $29 AND serie_num = $30
      UNION
      SELECT CASE
      WHEN order_date IS NOT NULL THEN 'purchased'
      ELSE 'wishlist'
      END
      FROM wish_list WHERE serie = $31 AND serie_num = $32
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
};
