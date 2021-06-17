const settings = require('../settings.js');
const basicFunctions = require(settings.SOURCE_CODE_BACKEND_BASIC_MODULE_FILE_PATH);

class StoreSearcher {
  ebay(isbn) {
    return `https://www.ebay.com/sch/i.html?_from=R40&_ipg=200&_nkw=${isbn}&_sop=15`;
  }

  amazon(isbn) {
    return `https://www.amazon.com/s?k=${isbn}`;
  }

  thriftbooks(isbn) {
    return `https://www.thriftbooks.com/browse/?b.search=${isbn}#b.s=mostPopular-desc&b.p=1&b.pp=30&b.oos&b.tile`;
  }

  betterworldbooks(isbn) {
    return `https://www.betterworldbooks.com/search/results?Format=Hardcover&p=1&hpp=96&q=${isbn}`;
  }

  abebooks(isbn) {
    return `https://www.abebooks.com/servlet/SearchResults?bi=h&kn=${isbn}`;
  }

  bookdepository(isbn) {
    return `https://www.bookdepository.com/search?searchTerm=${isbn}`;
  }

  icon(store) {
    return `/pic/icon/${store}`;
  }

  find(isbn, store) {
    switch(store) {

      case 'ebay':
      return this.ebay(isbn);
      break;

      case 'abebooks':
      return this.abebooks(isbn);
      break;

      case 'amazon':
      return this.amazon(isbn);
      break;

      case 'bookdepository':
      return this.bookdepository(isbn);
      break;

      case 'thriftbooks':
      return this.thriftbooks(isbn);
      break;

      case 'betterworldbooks':
      return this.betterworldbooks(isbn);
      break;

      default:
      return '';
    }
  }

  getFetchSettings() {
    return {
      method:'GET',
      headers: {
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ${basicFunctions.generateRandomString(15)}`, //add random strings
        "cache-control": "max-age=0",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "cookie": "",
        "referer": "",
        "sec-ch-ua": '"Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "cross-site",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      }
    };
  }

  async getCheapestBookDepository(isbn) {
    /*gets ISBN and search for the cheapest sale*/

    /*search in bookdepository*/

    /*make the http request, and ask for text response*/
    let req = await basicFunctions.doFetch(this.bookdepository(isbn), this.getFetchSettings(), {
      text:true,
      timeout: 5000 /*max 5 sec*/
    });

    /*no response*/
    if(!req) {
      return {
        icon: this.icon('bookdepository'),
        link: this.bookdepository(isbn),
        price: 'Unavailable'
      };
    }

    /*
    search for: <span class="sale-price">X</span>
    */

    /*regexp to extract price*/
    const rgx = /\<span class\=\"sale\-price\"\>(.*?)\<\/span\>/;



    let match = req.match(rgx);

    if(!match) {/*no price*/
      return {
        icon: this.icon('bookdepository'),
        link: this.bookdepository(isbn),
        price: 'Unavailable'
      };
    }


    match = match[0]
    .replace('<span class="sale-price">','')
    .replace('</span>','');

    return {
      price: match,
      icon: this.icon('bookdepository'),
      shipping: '0',
      link: this.bookdepository(isbn)
    };

  }

  async getCheapestEbay(isbn) {
    /*gets ISBN and search for the cheapest sale*/


    /*search in ebay*/

    /*make the http request, and ask for text response*/
    let req = await basicFunctions.doFetch(this.ebay(isbn), this.getFetchSettings(), {
      text:true,
      timeout: 5000 /*max 5 sec*/
    });

    /*no response*/
    if(!req) {
      return {
        icon: this.icon('ebay'),
        link: this.ebay(isbn),
        price: 'Unavailable'
      };
    }


    /*
    search for:
    price:
    search for: <span class="s-item__price">X</span> and for
    shipping fee:
    <span class="s-item__shipping s-item__logisticsCost">X</span>
    */

    /*regexp to extract price*/
    const rgxPrice = /\<span class\=\"?s\-item\_\_price\"?\>(.*?)\<\/span\>/;
    /*regexp to extract shipping fee*/
    const rgxShip = /\<span class\=\"s\-item\_\_shipping s\-item\_\_logisticsCost\"\>(.*?)\<\/span\>/;


    let price = req.match(rgxPrice);

    if(!price) { /*no price found*/
      return {
        icon: this.icon('ebay'),
        link: this.ebay(isbn),
        price: 'Unavailable'
      };
    }

    price = price[0]
    .replace('<span class=s-item__price>','')
    .replace('</span>','');



    let shippingFee = req.match(rgxShip);

    if(shippingFee) {/*if shipping fee found, grab the relevant one*/
      shippingFee = shippingFee[0]
      .replace('<span class="s-item__shipping s-item__logisticsCost">','')
      .replace('</span>','')
      .replace(/(shipping|\+|estimate)/gi, '')
      .trim()
    }

    let output = {
      price: price,
      icon: this.icon('ebay'),
      link: this.ebay(isbn)

    };

    if(shippingFee) {
      output.shipping = shippingFee;
    } else {
      output.shipping = 'Check in Link';
    }

    return output;
  }

  async getCheapestAbeBooks(isbn) {
    /*gets ISBN and search for the cheapest sale*/



    /*make the http request, and ask for text response*/
    let req = await basicFunctions.doFetch(this.abebooks(isbn), this.getFetchSettings(), {
      text:true,
      timeout: 5000 /*max 5 sec*/
    });

    /*no response*/
    if(!req) {
      return {
        icon: this.icon('abebooks'),
        link: this.abebooks(isbn),
        price: 'Unavailable'
      };
    }

    /*
    search for:
    <p class="item-price" id="item-price-1">X</p>
    */

    /*regexp to extract price*/
    const rgxPrice = /\<p class\=\"item\-price\" id\=\"item\-price\-1\"\>(.*?)\<\/p\>/;


    let price = req.match(rgxPrice);

    if(!price) { /*no price found*/
      return {
        icon: this.icon('abebooks'),
        link: this.abebooks(isbn),
        price: 'Unavailable'
      };
    }

    price = price[0]
    .replace('<p class="item-price" id="item-price-1">','')
    .replace('</p>','');

    return {
      icon: this.icon('abebooks'),
      price: price,
      shipping: 'Check in Link',
      link: this.abebooks(isbn)
    };
  }

  async getCheapestThriftBooks(isbn) {
    /*gets ISBN and search for the cheapest sale*/



    /*make the http request, and ask for text response*/
    let req = await basicFunctions.doFetch(this.thriftbooks(isbn), this.getFetchSettings(), {
      text:true,
      timeout: 5000 /*max 5 sec*/
    });

    /*no response*/
    if(!req) {
      return {
        icon: this.icon('thriftbooks'),
        link: this.thriftbooks(isbn),
        price: 'Unavailable'
      };
    }

    /*
    search for:
    <div class="WorkSelector-bold">Hardcover</div><div class=""><span>X - X</span>
    */

    /*regexp to extract price*/
    const rgxPrice = /\<div class\=\"WorkSelector\-bold\"\>(Hardcover|Paperback|Mass\sMarket\sPaperback|Library\sBinding)\<\/div\>\<div class\=\"\"\>\<span\>\$(.*?)\<\/span\>/;

    let price = req.match(rgxPrice);

    if(!price) { /*no price found*/
      return {
        icon: this.icon('thriftbooks'),
        link: this.thriftbooks(isbn),
        price: 'Unavailable'
      };
    }

    price = price[0]
    .replace(/\<div class\=\"WorkSelector\-bold\"\>(Hardcover|Paperback|Mass\sMarket\sPaperback|Library\sBinding)\<\/div\>\<div class\=\"\"\>\<span\>/,'')
    .replace('</span>','');

    /*it may be a range, $P1 - $P2, keep the first price*/
    price = price
    .split(" - ")[0];

    return {
      price: price,
      icon: this.icon('thriftbooks'),
      shipping: 'Check in Link',
      link: this.thriftbooks(isbn)
    };
  }

  async findPrices(isbn) {
    /*search for prices in all relevant stores*/
    /*make requests in parallel*/
    let prices = await Promise.all([
      this.getCheapestThriftBooks(isbn),
      this.getCheapestAbeBooks(isbn),
      this.getCheapestBookDepository(isbn),
      this.getCheapestEbay(isbn)
    ]);

    /*make output*/
    let output = {};

    if(prices[0]) {
      output.ThriftBooks = prices[0];
    }

    if(prices[1]) {
      output.AbeBooks = prices[1];
    }

    if(prices[2]) {
      output.BookDepository = prices[2];
    }

    if(prices[3]) {
      output.Ebay = prices[3];
    }

    return output;

  }

}

module.exports = new StoreSearcher();
