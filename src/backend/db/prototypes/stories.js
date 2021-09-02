const settings = require('../../settings.js');
const pg = require(settings.SOURCE_CODE_BACKEND_CONNECTION_DATABASE_FILE_PATH);

/*call this file with class name, and it will add new prototypes*/
module.exports = (className) => {

  let _THIS = className.prototype; /*poitner to prototypes, add here new functions*/

  /*check if story ID exist in DB*/
  _THIS.storyExists = async (id) => {
    let exists = await pg.query(`SELECT EXISTS(SELECT 1 FROM stories WHERE id = $1);`, [id]);
    return exists.rows[0].exists;
  }

  /*update story's description*/
  _THIS.changeStoryDescription = async (id, description) => {
    await pg.query('UPDATE stories SET description=$1 WHERE id = $2;', [description, id]);
  }

  /*retrieve story's number of pages from story's ID*/
  _THIS.getStoryPages = async (id) => {
    let res = await pg.query(`SELECT pages FROM stories WHERE id = $1;`, [id]);
    return res.rows[0].pages;
  }

  /*gets story's ID, returns story's parent (collection ID)*/
  _THIS.getStoryCollectionById = async (id) => {
    let res = await pg.query(`SELECT parent FROM stories WHERE id = $1;`, [id]);
    return res.rows[0].parent;
  }

  /*delete all stories from collection*/
  _THIS.deleteCollectionStories = async (collectionId) => {
    await pg.query(`DELETE FROM stories WHERE parent = $1;`, [collectionId]);
  }

  /*get all stories that belongs to a specific collection*/
  _THIS.fetchCollectionStories = async (id) => {
    const query = `SELECT * FROM stories WHERE parent = $1;`;
    let res = await pg.query(query, [id]);
    return res.rows;
  }

  /*get's collection ID (story's parent), and checks if all it stories are read, returns boolean*/
  _THIS.allStoriesAreRead = async (collectionId) => {
    let res = await pg.query(`SELECT COUNT(1) FROM stories WHERE parent = $1 AND read_order IS NULL;`, [collectionId]);
    res = res.rows[0].count;
    return res === '0';//true if all stories are read
  }

  /*change story status from normal (not read) to "read"*/
  _THIS.markStoryAsRead = async (id, date, completedPages = null) => {
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
    let collectionId = await _THIS.getStoryCollectionById(id);

    if(await _THIS.allStoriesAreRead(collectionId)) {
      await _THIS.markCollectionAsRead(collectionId);
    }
  }

  /*get collection id, and save ratings for all collection stories*/
  _THIS.saveCollectionRating = async (bookId) => {
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

    /*amazon and google ratings can be as bulk in parallel (no API key), so fetch all in parallel, and goodreads ratings fetch as one action*/
    let promisesHolder = [];
    for(let i = 0 , l = stories.length ; i < l ; i ++ ) {
      promisesHolder.push(
        _THIS.fetchAndSaveAmzonRating(stories[i].id, 'stories'),
        _THIS.fetchAndSaveGoogleRating('', stories[i].author, stories[i].name, stories[i].id, 'stories')
      );
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
    await _THIS.insertRatingIntoDB(
      typeof stories[i].rating === 'undefined' ? null : stories[i].rating,
      typeof stories[i].rating === 'undefined' ? null : stories[i].count,
      typeof stories[i].rating === 'undefined' ? 'false' : stories[i].isbn,
      stories[i].id,
      'stories');
    }

    /*make sure all amazon and google api calls finished*/
    await Promise.all(promisesHolder);
  }

  /*get number of stories a collection has*/
  _THIS.getNumberOfStories = async (collectionId) => {
    let res = await pg.query(`SELECT COUNT(1) FROM stories WHERE parent = $1;`, [collectionId]);
    return res.rows[0].count;
  }

  /*insert a new story into DB*/
  _THIS.saveStory = async (storyJson) => {
    /*
    Needed actions:
    1) Insert story to DB.
    2) Save the story rating
    */

    /********************************************************************************************
    INSERT STORY INTO DB
    *********************************************************************************************/
    let counter = 0,
    query = `INSERT INTO stories(
      name,
      pages,
      parent,
      description,
      asin,
      goodreads_link,
      author,
      serie,
      serie_num
    ) VALUES (
      $${++coutner},
      $${++coutner},
      $${++coutner},
      $${++coutner},
      ${storyJson.asin ? `$${++coutner}` : 'NULL' },
      ${storyJson.goodReads ? `$${++coutner}` : 'NULL' },
      ${storyJson.author ? `$${++coutner}` : 'NULL' },
      ${storyJson.serie && storyJson.serie.value ? `$${++coutner}` : 'NULL' },
      ${storyJson.serie && storyJson.serie.value ? `$${++coutner}` : 'NULL' }
    )
    RETURNING id;`;//if author is empty, insert NULL insted - indicated to use collection's author

    let queryArguments = [storyJson.title, storyJson.pages, storyJson.collectionId.value, storyJson.description];
    if(storyJson.asin) {
      queryArguments.push(storyJson.asin);
    }
    if(storyJson.goodReads) {
      queryArguments.push(storyJson.goodReads);
    }
    if(storyJson.author) {
      queryArguments.push(storyJson.author);
    }

    if(storyJson.serie && storyJson.serie.value) {
      queryArguments.push(storyJson.serie.value, storyJson.serie.number);
    }

    /*send query and get story ID*/
    let storyId = await pg.query(query, queryArguments);
    storyId = storyId.rows[0].id;

    /********************************************************************************************
    SAVE STORY RATING IN DB
    *********************************************************************************************/
    _THIS.saveRating(storyId, '', storyJson.title, storyJson.actualAuthor, 'stories').then((res) => {
      /*
      if this story is part of a serie, since serie ratings is just it books av. ratings. calculate the new serie ratings.
      IMPORTANT: this action is done AFTER "saveRating" finishes, it may take some time since it search for ratings in external APIs
      */
      if(storyJson.serie && typeof storyJson.serie.value !== 'undefined') {
        _THIS.saveSerieRating(storyJson.serie.value);
      }
    });
  }

  /*alter a story that already exist in DB*/
  _THIS.alterStoryById = async (id, storyJson) => {
    /********************************************************************************************
    GET CURRENT STORY PARENT - IN CASE OF CHANGE - SOME CHANGES IN COLLECTION MAY BE NEEDED
    *********************************************************************************************/
    let currentCollection = await _THIS.getStoryCollectionById(id);
    /********************************************************************************************
    ALTER STORY IN DB
    *********************************************************************************************/
    let paramsCounter = 0;
    let query = `UPDATE stories
    SET description=$${++paramsCounter},
    name = $${++paramsCounter},
    pages = $${++paramsCounter},
    asin = $${++paramsCounter},
    goodreads_link = $${++paramsCounter},
    parent = $${++paramsCounter},
    serie = ${storyJson.serie && storyJson.serie.value ? `$${++paramsCounter}` : 'NULL'},
    serie_num = ${storyJson.serie && storyJson.serie.value ? `$${++paramsCounter}` : 'NULL'},
    author `;
    let queryArguments = [storyJson.description, storyJson.title, storyJson.pages,storyJson.asin, storyJson.goodReads, storyJson.collectionId.value];

    if(storyJson.serie && storyJson.serie.value) {
      queryArguments.push(storyJson.serie.value, storyJson.serie.number);
    }

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
    await _THIS.saveRating(id, '', storyJson.title, storyJson.actualAuthor, 'stories');
    /*
    if this story is part of a serie, since serie ratings is just it books av. ratings. calculate the new serie ratings.
    */
    if(storyJson.serie && typeof storyJson.serie.value !== 'undefined') {
      _THIS.saveSerieRating(storyJson.serie.value);
    }

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
    if(await _THIS.getNumberOfStories(currentCollection) === '0') {
      await pg.query(`UPDATE my_books SET collection = 'f' WHERE id = $1;`, [currentCollection]);
    }

    if(await _THIS.allStoriesAreRead(currentCollection)) {
      await _THIS.markCollectionAsRead(currentCollection);
    }

    /*
    NEW COLLECTION GOT A NEW STORY
    * CHECK IF COLLECTION WAS MARKED AS READ AND THE NEW STORY ISN'T - REMOVE THE READ MARK

    */
    if(await _THIS.checkIfBookIsMarkedAsRead(storyJson.collectionId.value) && ! await _THIS.allStoriesAreRead(storyJson.collectionId.value)) {/*not all story are read and collection is marked as read*/
      /*remove read mark*/
      await _THIS.removeReadMarkFromBook(storyJson.collectionId.value);
    }
  }

  /*fetch all stories from DB, option to pass filters*/
  _THIS.fetchAllStories = async (ops = {}) => {
    const limit = typeof ops.limit !== 'undefined' ? ops.limit : '99999999999';
    const offset = typeof ops.offset !== 'undefined' ? ops.offset : '0';
    const authorFilter = typeof ops.authorFilter !== 'undefined' ? unescape(ops.authorFilter.toUpperCase()) : null;
    const titleFilter = typeof ops.titleFilter !== 'undefined' ? unescape(ops.titleFilter.toUpperCase()) : null;
    const languageFilter = typeof ops.languageFilter !== 'undefined' ? unescape(ops.languageFilter.toUpperCase()) : null;
    const oLanguageFilter = typeof ops.oLanguageFilter !== 'undefined' ? unescape(ops.oLanguageFilter.toUpperCase()) : null;
    const descriptionFilter = typeof ops.descriptionFilter !== 'undefined' ? unescape(ops.descriptionFilter.toUpperCase()) : null;
    const fromPageFilter = typeof ops.fromPageFilter !== 'undefined' ? unescape(ops.fromPageFilter) : null;
    const toPageFilter = typeof ops.toPageFilter !== 'undefined' ? unescape(ops.toPageFilter) : null;
    const fromYearFilter = typeof ops.fromYearFilter !== 'undefined' ? unescape(ops.fromYearFilter) : null;
    const toYearFilter = typeof ops.toYearFilter !== 'undefined' ? unescape(ops.toYearFilter) : null;
    const fromRatingFilter = typeof ops.fromRatingFilter !== 'undefined' ? unescape(ops.fromRatingFilter) : null;
    const toRatingFilter = typeof ops.toRatingFilter !== 'undefined' ? unescape(ops.toRatingFilter) : null;
    const isReadFilter = typeof ops.isReadFilter !== 'undefined' ? ops.isReadFilter : null;
    const serieFilter = typeof ops.serieFilter !== 'undefined' ? unescape(ops.serieFilter.toUpperCase()) : null;
    const isPartSerieFilter = typeof ops.isPartSerieFilter !== 'undefined' ? ops.isPartSerieFilter : null;
    const sortType = typeof ops.sort !== 'undefined' ? unescape(ops.sort) : null;

    let query = `SELECT main.id,
    main.name
    FROM stories main

    LEFT JOIN my_books parent
    ON main.parent = parent.id

    LEFT JOIN series serie_entry
    ON serie_entry.id = main.serie `;

    let filters = [], params = [];
    if(authorFilter !== null) {
      filters.push('UPPER(COALESCE(main.author , parent.author)) LIKE $');
      params.push(`%${authorFilter}%`);
    }

    if(titleFilter !== null) {
      filters.push('UPPER(main.name) LIKE $');
      params.push(`%${titleFilter}%`);
    }

    if(descriptionFilter !== null) {
      filters.push('UPPER(main.description) LIKE $');
      params.push(`%${descriptionFilter}%`);
    }

    if(fromPageFilter !== null) {
      filters.push('main.pages >= $');
      params.push(fromPageFilter);
    }

    if(toPageFilter !== null) {
      filters.push('main.pages <= $');
      params.push(toPageFilter);
    }

    if(fromYearFilter !== null) {
      filters.push('parent.year >= $');
      params.push(fromYearFilter);
    }

    if(toYearFilter !== null) {
      filters.push('parent.year <= $');
      params.push(toYearFilter);
    }

    if(languageFilter !== null) {
      filters.push('UPPER(parent.language) LIKE $');
      params.push(`%${languageFilter}%`);
    }

    if(oLanguageFilter !== null) {
      filters.push('UPPER(parent.original_language) LIKE $');
      params.push(`%${oLanguageFilter}%`);
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

    let conditions = " WHERE ";

    if(filters.length) {//we have filters
      for(let i = 1 , l = filters.length + 1; i < l ; i ++ ) {
        conditions +=  filters[i - 1]  + i + " AND ";
      }
      //remove last AND
      conditions = conditions.replace(/\sAND\s$/,'');

      paramCounter = filters.length;
    }

    if(isReadFilter !== null) {

      if(paramCounter) {/*if filters where applied, 100% there are conditions before this one and we need the AND keyword*/
        conditions += ' AND ';
      }
      conditions += ` main.read_order IS ${isReadFilter && 'NOT' || '' } NULL `;
    }

    if(isPartSerieFilter !== null) {
      if(paramCounter) {/*if filters where applied, 100% there are conditions before this one and we need the AND keyword*/
        conditions += ' AND ';
      }

      conditions += ` main.serie IS ${isPartSerieFilter && 'NOT' || '' } NULL `;
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
      case "rat-c-h":
      query += " COALESCE(main.goodreads_rating_count,0) DESC "
      break;
      case "rat-c-l":
      query += " COALESCE(main.goodreads_rating_count,0) "
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
    let count = await pg.query(`SELECT COUNT(1) FROM stories main LEFT JOIN my_books parent  ON main.parent = parent.id LEFT JOIN series serie_entry ON serie_entry.id = main.serie ${conditions};`, params);
    count = count.rows[0].count;
    //now get books
    query += " LIMIT $" + ++paramCounter + " OFFSET $" + ++paramCounter + ";";
    params.push(limit, offset);


    let res = await pg.query(query, params);
    res = res.rows;
    return {rows:res, count: count};
  }

  /*fetch all story data*/
  _THIS.fetchStoryById = async (id, filters=null) => {
    let query = `SELECT
    my_stories_main.id AS id,
    my_stories_main.name AS name,
    my_stories_main.pages AS pages,
    my_stories_main.goodreads_link AS goodreads_link,
    my_stories_main.author AS story_author,
    my_stories_main.read_date AS read_date,
    my_stories_main.read_order AS read_order,
    my_stories_main.serie AS serie_id,
    my_stories_main.serie_num AS serie_num,
    my_stories_main.completed AS read_completed,
    my_stories_main.asin AS asin,
    series_table.name AS serie,
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

    LEFT JOIN series series_table
    ON my_stories_main.serie = series_table.id

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
    my_stories_main.goodreads_link,
    series_table.name,
    my_stories_entry1.id,
    my_stories_entry1.name,
    my_stories_main.asin,
    my_stories_entry2.id,
    my_stories_main.serie,
    my_stories_main.serie_num,
    my_stories_entry2.name,
    my_stories_main.google_rating,
    my_stories_main.goodreads_rating_count,
    my_stories_main.google_rating_count,
    my_stories_main.amazon_rating_count,
    my_stories_main.amazon_rating,
    my_stories_main.goodreads_rating;`;


    let result = await pg.query(query, [id]);
    result = result.rows[0];

    /*no story with this ID*/
    if(!result) {
      return null;
    }
    /*now get the next story id and prev. book id based on filters received*/
    /*fetch all stories in wanted order, then get the next and prev. id*/

    let allBooks = filters ? await _THIS.fetchAllStories(filters) : null;


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

    /*if this book is part of serie, fetch next and prev. in serie*/
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
          SELECT UNNEST("group") FROM stories WHERE id = $1
        );`;
    let groups = await pg.query(query, [id]);
    result.groups = groups.rows[0].groups;

    return result;
  }

  /*search and save story ratings*/
  _THIS.saveStoryRating = async (id) => {
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
    await _THIS.saveRating(id, '', neededData.name, neededData.author, 'stories');
  }

  /*check if the combination author+title+number of pages already exist in stories DB*/
  _THIS.checkIfStoryAuthorAndTitleAndPagesExistsInStoriesList = async (title, author, pages, idToExclude = null) => {
    let paramsArgs = [];
    let paramsCounter = 0;
    let query = `SELECT EXISTS(SELECT 1 FROM stories WHERE UPPER(name)=$${++paramsCounter} AND pages=$${++paramsCounter} `;
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

  /*retrieve story ID from story title+author+collection ID combination*/
  _THIS.getStoryIdFromAuthorAndTitleAndParentISBN = async (title, author, parentISBN) => {
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

  /*count number of pages of all stories in a specific collection*/
  _THIS.getStoriesPagesSumFromCollection = async (collectionId, storyIdToExclude = null) => {
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

  /*fetch story id based in story's title, number of pages, collection and author*/
  _THIS.getStoryIdFromDetails = async (details) => {
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
};
