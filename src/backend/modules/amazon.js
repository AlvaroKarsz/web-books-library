const settings = require('../settings.js');
const basic = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);

class AmazonApi {
  constructor() {
    this.BASE_URL = 'https://www.amazon.com/gp/customer-reviews/widgets/average-customer-review/popover/ref=dpx_acr_pop_?asin=';
  }

  generateSettings() {
    /*change cookie param every fetch*/
    return {
      method:'GET',
      headers: {
        "cookie": `ubid-main=${basic.generateRandomNumberString(3)}-${basic.generateRandomNumberString(7)}-${basic.generateRandomNumberString(7)}`,
        "User-Agent": `Mozilla/5.0 ${basic.generateRandomString(15)}`, /*add some random chars to user agent*/
        "cache-control": "max-age=0",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
      }
    };
  }

  async fetchRating(asin) {
    /*asin is required*/
    if(!asin) {
      return null;
    }
    /*make http request, ask text as response*/
    let req = await  basic.doFetch(this.BASE_URL + asin, this.generateSettings(),  {
      text:true,
      timeout: 5000 /*max. 5 secounds*/
    });

    /*not found*/
    if(!req) {
      return null;
    }

    /*
    response example:
    "
    4.7 out of 54.7 out of 5
    879 global ratings
    5 star   79%
    4 star   13%
    3 star   4%
    2 star   2%
    1 star   2%
    See all customer reviews
    "
    IN HTML!!
    */

    /*make 2 rgxs, 1 to fetch ratings, the other one to fetch count*/
    const ratingRGX = /[0-9](\.[0-9])?\s?out?/i;
    const counntRGX = /[0-9]+\s?global/i;

    let rating = req.match(ratingRGX),
    count = req.match(counntRGX);

    /*not found*/
    if(!count || !rating) {
      return null;
    }

    /*get first match*/
    rating = rating[0];
    count = count[0];

    /*remove "out" and "global"*/
    rating = rating.replace(/out/i,'');
    count = count.replace(/global/i,'');

    /*trim data*/
    rating = rating.trim();
    count = count.trim();

    /*return data*/
    return {
      rating: rating,
      count: count
    };
  }
}

module.exports = new AmazonApi();
