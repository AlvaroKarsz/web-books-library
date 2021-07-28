const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  /*fetch all groups from DB, option to use filters*/
  _THIS.fetchAllGroups = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const descriptionFilter = typeof ops.descriptionFilter !== 'undefined' ? unescape(ops.descriptionFilter.toUpperCase()) : null;
    const fromRatingFilter = typeof ops.fromRatingFilter !== 'undefined' ? unescape(ops.fromRatingFilter) : null;
    const toRatingFilter = typeof ops.toRatingFilter !== 'undefined' ? unescape(ops.toRatingFilter) : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;

    let query = `SELECT main.id,
    main.name
    FROM groups main `;

    let filters = [], params = [];

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }

    if(descriptionFilter !== null) {
      filters.push('UPPER(main.description) LIKE $');
      params.push(`%${descriptionFilter}%`);
    }

    if(fromRatingFilter !== null) {
      filters.push('main.goodreads_rating >= $');
      params.push(fromRatingFilter);
    }

    if(toRatingFilter !== null) {
      filters.push('main.goodreads_rating <= $');
      params.push(toRatingFilter);
    }


    let paramCounter = 0; //count number of params

    let conditions = " WHERE ";

    if(filters.length) {//we have filters
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');

      paramCounter = filters.length;
    }


    //remove where if there are no conditions
    conditions = conditions.replace(/\sWHERE\s$/,'');

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
    let count = await pg.query(`SELECT COUNT(1) FROM groups main ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + ++paramCounter + " OFFSET $" + ++paramCounter + ";";
    params.push(limit, offset);

    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*check if this group name is taken*/
  _THIS.checkIfGroupNameExist = async (title, idToExclude = null) => {
    let query = `SELECT EXISTS(SELECT 1 FROM groups WHERE UPPER(name)=$1 `;
    let params = [title.toUpperCase()];
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
  };


  /*alter a group that already exist in DB*/
  _THIS.alterGroupById = async (id, groupJson) => {
    /********************************************************************************************
    ALTER group IN DB
    *********************************************************************************************/
    /*general parameters*/
    let paramsCounter = 0;
    let query = `UPDATE groups SET name = $${++paramsCounter}, description = $${++paramsCounter}`;

    let queryArguments = [groupJson.title, groupJson.description];

    query += ` WHERE id = $${++paramsCounter};`;
    queryArguments.push(id);

    /*send query*/
    await pg.query(query, queryArguments);
  }

  /*insert a new group into DB*/
  _THIS.saveGroup = async (groupJson) => {

    /********************************************************************************************
    INSERT GROUP INTO DB
    *********************************************************************************************/
    /*general parameters*/
    let queryParams = ['name', 'description'];
    let queryArguments = [groupJson.title, groupJson.description];

    /*build SQL query, new group id should be returned in order to use in other tables (if needed)*/
    let query = `INSERT INTO groups(${queryParams.join(",")}) VALUES (${queryParams.map((element, index) => '$' + (index + 1))}) RETURNING id;`;

    /*send query and get group ID*/
    let groupId = await pg.query(query, queryArguments);
    groupId = groupId.rows[0].id;
  }

  /*gets group name, returns ID*/
  _THIS.getGroupdFromTitle = async (name) => {
    const query = "SELECT id FROM groups WHERE UPPER(name)=$1;";
    let result = await pg.query(query, [name.toUpperCase()]);
    result = result.rows[0]['id'];
    return result;
  }

  /*check if group ID exist in DB*/
  _THIS.groupExists = async (id) => {
    let exists = await pg.query(`SELECT EXISTS(SELECT 1 FROM groups WHERE id = $1);`, [id]);
    return exists.rows[0].exists;
  }

  /*fetch all group data*/
  _THIS.fetchGroupById = async (id, filters) => {
    let query = ` SELECT
    main.id AS id,
    main.name AS name,
    main.description AS description,
    main.goodreads_rating AS rating,
    main.goodreads_rating_count AS rating_count,
    main.google_rating AS google_rating,
    main.google_rating_count AS google_rating_count,
    main.amazon_rating AS amazon_rating,
    main.amazon_rating_count AS amazon_rating_count

    FROM groups main

    WHERE main.id = $1
    GROUP BY

    main.id,
    main.name,
    main.description,
    main.google_rating,
    main.amazon_rating_count,
    main.amazon_rating,
    main.google_rating_count,
    main.goodreads_rating_count,
    main.goodreads_rating;`;

    let result = await pg.query(query, [id]);
    result = result.rows[0];

    /*now get the next group id and prev. group id based on filters received*/
    /*fetch all groups in wanted order, then get the next and prev. id*/
    let allGroups = await _THIS.fetchAllGroups(filters);

    /*allGroups.rows will not be defined when this function was called without type argument*/
    if(typeof allGroups.rows !== 'undefined') {
      /*iterate all wished until we reach the one with our ID*/
      for(let i = 0 , l = allGroups.rows.length ; i < l ; i ++ ) {
        if (allGroups.rows[i].id == id) {/*this listing is the one we are looking for*/
          /*
          first get "next id"
          if selected group is the last in the list, grab the first as next, if not just grab the next one
          */
          result.nextListingId = i === allGroups.rows.length - 1 ? allGroups.rows[0].id : allGroups.rows[i + 1].id;
          /*
          get "prev. id"
          if selected group is the first in the list, grab the last as prev., if not just grab the prev. one
          */
          result.prevListingId = i === 0 ? allGroups.rows[allGroups.rows.length - 1].id : allGroups.rows[i - 1].id;

          /*exit loop - wanted data found*/
          break;
        }
      }
    }
    return result;
  }

  /*remove this group ID from all books/wishlists/stories*/
  _THIS.clearGroup = async (id) => {
    await Promise.all([
      pg.query(`UPDATE my_books set "group" = array_remove("group", $1);`, [id]),
      pg.query(`UPDATE wish_list set "group" = array_remove("group", $1);`, [id]),
      pg.query(`UPDATE stories set "group" = array_remove("group", $1);`, [id])
    ]);
  }

  /*delete group from DB*/
  _THIS.deleteGroup = async (id) => {
    await pg.query(`DELETE FROM groups WHERE id = $1;`, [id]);
  }

  /*calculate and save group ratings in DB*/
  _THIS.saveGroupRating = async (id) => {
    /*calculation is based on group's books, calculate average and save as group ratings*/

    /*fetch all relevant ratings*/
    const query = `SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM my_books WHERE $1 = ANY("group")

    UNION

    SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM wish_list WHERE $1 = ANY("group")

    UNION

    SELECT
    goodreads_rating,
    goodreads_rating_count,
    google_rating,
    google_rating_count,
    amazon_rating,
    amazon_rating_count
    FROM stories WHERE $1 = ANY("group")`

    let res = await pg.query(query, [id]);
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
    await _THIS.saveAmazonRating(id, amzn.rating, amzn.count, 'groups');
    await _THIS.saveGoogleRating(id, ggl.rating, ggl.count, 'groups');
    await _THIS.insertGoodReadsRatingIntoDBNoIsbn(id, gdrs.rating, gdrs.count, 'groups');

    /*success*/
    return true;
  }

  /*function to fetch all group names and IDs*/
  _THIS.fetchAllGroupNames = async () => {
    let grps = await pg.query(`SELECT id, name FROM groups;`);
    return grps.rows;
  };

  /*inserts a new memeber to group*/
  _THIS.insertToGroup = async (bookType, bookId, groupId) => {
    let query = 'UPDATE ';
    switch(bookType) {
      case 'books':
      query += `my_books`;
      break;
      case 'wishlist':
      query += `wish_list`;
      break;
      case 'stories':
      query += `stories`;
      break;
    }

    query += ` SET "group" = ARRAY(SELECT DISTINCT UNNEST (ARRAY_APPEND("group", $1))) WHERE id = $2;`;//ignore duplications
    await pg.query(query, [groupId, bookId]);
  };

};
