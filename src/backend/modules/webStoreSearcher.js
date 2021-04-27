class StoreSearcher {
  ebay(isbn) {
    return `https://www.ebay.com/sch/i.html?_from=R40&_ipg=200&_nkw=${isbn}`;
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
}

module.exports = new StoreSearcher();
