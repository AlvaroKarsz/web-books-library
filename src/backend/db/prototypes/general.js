const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  _THIS.checkIfExistInDB = async (els)  => {
    /*
    check if elements in els exists in DB
    check in books table, wishlist table and stories table

    books: check by ISBN or title and author
    wishlist: check by ISBN or title and author
    story: check by title and author

    each element must include a unique id labeled unique.
    output will be:
    [{unique: , type: book/wish/story/null}]
    so the output will be recognized easly by some unique ID
    */

    let counter = 0, args = [],
    query = `SELECT `, title='', author = '', isbn = '';

    els.forEach((el) => {
      /*prepare data before usage*/
      title = el.title.
      split('(')[0].//remove () if exists
      split(':')[0]. //remove : if exists
      replace(/\s/g,'').//remove whitespaces
      trim().//remove whitespaces
      toLowerCase();//convert lower, used in query

      author = el.author.
      replace(/\s/g,'').//remove whitespaces
      trim().//remove whitespaces
      toLowerCase();//convert lower, used in query

      isbn = el.isbn.
      trim().//remove whitespaces
      toLowerCase();//convert lower, used in query

      query += ` (
        SELECT COALESCE(
          (
            SELECT '/books/' || id
            FROM my_books
            --match condition - if ISBN match, we know its a good match
            WHERE isbn = $${++counter} OR (
              --if ISBN doesn't match, check if title match, if so, check if title is big enough(at least 10 chars) or same author name
              --needed because sometimes author name us written differently
              REPLACE(LOWER(name),' ','') = $${++counter} AND (
                LENGTH(name) > 20
                OR
                REPLACE(LOWER(author),' ','') LIKE $${++counter}
              )
            ) LIMIT 1
          ),
          (
            SELECT '/wishlist/' || id
            FROM wish_list
            --match condition - if ISBN match, we know its a good match
            WHERE isbn = $${++counter} OR (
              --if ISBN doesn't match, check if title match, if so, check if title is big enough(at least 20 chars) or same author name
              --needed because sometimes author name us written differently
              REPLACE(LOWER(name),' ','') = $${++counter} AND (
                LENGTH(name) > 20
                OR
                REPLACE(LOWER(author),' ','') LIKE $${++counter}
              )
            ) LIMIT 1
          ),
          (
            SELECT '/stories/' || id
            FROM stories entry_id
            --story has no ISBN, so check match by title and author
            --if title matches and title is big enough, or same author
            --some stories have no author in stories table, in these cases check collection author
            WHERE REPLACE(LOWER(name),' ','') = $${++counter} AND (
              LENGTH(name) > 20
              OR
              REPLACE(LOWER(author),' ','') LIKE $${++counter}
              OR
              (
                SELECT REPLACE(LOWER(author),' ','') FROM my_books WHERE id = entry_id.parent
              ) LIKE $${++counter}
            ) LIMIT 1
          ),
          ''
        )
      ) AS "${ el.unique }",`;
      /*push arguments to query*/
      args.push(
        isbn,
        title,
        `%${author}%`,
        isbn,
        title,
        `%${author}%`,
        title,
        `%${author}%`,
        `%${author}%`
      );
    });

    /*remove last comma and add ;*/
    query = query.replace(/\,$/, '') + ';';
    let res = await pg.query(query, args);
    res = res.rows[0];

    return res;
  }

  /*get ASIN from DB*/
  _THIS.getAsin = async (id, table) => {
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

  /*save asin in relevant DB table*/
  _THIS.saveAsin = async (asin, id, table) => {
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

  /*deletes google rating from DB*/
  _THIS.clearGoogleRating = async (id, table) => {
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

  /*deletes amazon rating from DB*/
  _THIS.clearAmazonRating = async (id, table) => {
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

  /*saves in DB google ratings*/
  _THIS.saveGoogleRating = async (id, rating, count, table) => {
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

  /*saves in DB amazon ratings*/
  _THIS.saveAmazonRating = async (id, rating, count, table) => {
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

  /*fetches google ratings from google API and saves it in DB*/
  _THIS.fetchAndSaveGoogleRating = async (isbn, author, title, id, tableName) => {
    const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);
    /*call the module's function to fetch ratings*/
    let res = await googleApi.fetchRatings({
      isbn: isbn,
      author: author,
      title: title
    });

    if(!res) {//nothing found, clear google rating for this one
      await _THIS.clearGoogleRating(id, tableName);
    } else {//found - save
      await _THIS.saveGoogleRating(id, res.rating, res.count, tableName);
    }
  }

  /*fetches amazon ratings and saves it in DB*/
  _THIS.fetchAndSaveAmzonRating = async (id, tableName) => {
    const amazonApi = require(settings.SOURCE_CODE_BACKEND_AMAZON_MODULE_FILE_PATH);
    /*call module's function to fetch ratings*/
    let res = await amazonApi.fetchRating(
      await _THIS.getAsin(id, tableName)
    );

    if(!res) {//nothing found, clear google rating for this one
      await _THIS.clearAmazonRating(id, tableName);
    } else {//found - save
      await _THIS.saveAmazonRating(id, res.rating, res.count, tableName);
    }
  }

  /*save in DB goodreads ratings*/
  _THIS.insertRatingIntoDB = async (rating, count, additionalISBN, id, table) => {
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

  /*deletes goodreads rating from DB*/
  _THIS.clearRating = async (id, table) => {
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

  /*fetch ratings from APIs and save in DB,   currently fetches goodreads, google and amazon ratings*/
  _THIS.saveRating = async (id, isbn, title, author, tableName) => {
    /*fetch rating and save it in DB table*/
    /*fetch goodreads and google ratings and amazon ratings*/
    let rating = null, additionalIsbn = null;

    /*try to fetch rating from goodreads api*/
    const goodreads = require(settings.SOURCE_CODE_BACKEND_GOOD_READS_MODULE_FILE_PATH);
    const googleApi = require(settings.SOURCE_CODE_BACKEND_GOOGLE_API_MODULE_FILE_PATH);

    /*
    make a separated google rating fetch & amazon rating fetch
    make it in background, and make wait for it to finish before exiting this function!
    make is without await in order to avoid blocking the function
    */


    let googleRatingResult = _THIS.fetchAndSaveGoogleRating(isbn, author, title, id, tableName);
    let amazonRatingResult = _THIS.fetchAndSaveAmzonRating(id, tableName);

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
          await _THIS.insertRatingIntoDB(ratingWithoutISBN.rating, ratingWithoutISBN.count, null, id, tableName);
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
        return await _THIS.clearRating(id, tableName);
      }
      if(isbn === additionalIsbn) {
        /*isbn found in one of the apis is the same one inserted by user, nothing found in goodreads for this isbn*/
        /*clear rating and return clearRating "exit code"*/

        /*make sure google & amazon rating was fetched before exit*/
        await Promise.all([amazonRatingResult,googleRatingResult]);
        return await _THIS.clearRating(id, tableName);
      }
      /*try to fetch rating with new isbn from google*/
      rating = await goodreads.fetchRating(additionalIsbn);
      if(!rating) {
        /*nothing found for this isbn as well*/
        /*clear rating and return clearRating "exit code"*/

        /*make sure google & amazon rating was fetched before exit*/
        await Promise.all([amazonRatingResult,googleRatingResult]);
        return await _THIS.clearRating(id, tableName);
      }
    }

    await _THIS.insertRatingIntoDB(rating.rating, rating.count, additionalIsbn, id, tableName);
    /*make sure google & amazon ratings were fetcheded before exit*/
    await Promise.all([amazonRatingResult,googleRatingResult]);
    return true;
  }

  /*insert tags into DB*/
  _THIS.saveTags = async (tags, id, table) => {
    let query = 'UPDATE ', params = [], counter = 0;

    /*get table from tableName param*/
    switch(table) {
      case 'my_books':
      query += ' my_books ';
      break;

      case 'wish_list':
      query += ' wish_list ';
      break;

      default: /*unknown param*/
      return null;
    }
    query += `SET tags = `;
    if(tags) {
      query += `$${++counter}`;
      params.push(tags.join(', '));
    } else {
      query += `NULL`;
    }

    query += ` WHERE id = $${++counter};`;
    params.push(id);

    await pg.query(query, params);
  }

  /*set a seed in DB, used to randomize sort types*/
  _THIS.setSeed = async (seed) => {
    await pg.query(`SELECT SETSEED($1)`, [seed]);
  }

  /*delete picture md5sums from cache table in DB*/
  _THIS.deletePictureHashes = async (dataArr) => {
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

  /*insert picture md5sumsto DB*/
  _THIS.savePictureHashes = async (dataArr) => {
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

  /*delete book's picture md5sum from DB*/
  _THIS.deleteMD5 = async (folderName, id) => {
    await pg.query(`DELETE FROM cache WHERE id = $1 AND folder = $2;`, [id, folderName]);
  }

  /*fetch all covers md5sums from DB*/
  _THIS.getAllMD5Hashes = async (folders) => {
    let res = await pg.query(`SELECT folder, id, md5 FROM cache WHERE folder IN (${folders.map((a, i) => {return '$' + (i+1).toString() }).join(',')});`, folders);
    return res.rows;
  }
};
