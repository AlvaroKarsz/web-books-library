function validValue(val) {
  return isString(validValue) ? val.trim() : val;
}

function isElement(element) {
  return element instanceof Element || element instanceof HTMLDocument;
}

function isString(a) {
  return typeof a === 'string';
}

function sleep(t) {
  return new Promise(res => setTimeout(res, t));
}

function addValueToInput(data, inp) {
  if(data) {
    inp.value = data;
  }
}


async function doHttpRequest(url, settings = null) {
  let request = null;
  try {
    request = await fetch(url, settings);
    request = await request.json();
  } catch (e) {
    request = null
  }
  return request;
}

function removeUrlParamsAndRedirect() {
  window.location.href = window.location.href.split("?")[0];
}

function setUrlParams(params, path = window.location.href) {
  let url = path.split('?')[0] + '?';
  for(let val in params) {
    url += val + '=' + params[val] + '&';
  }
  url = url.replace(/([&]|[?])$/,'');//remove last & or ?
  window.location.href = url;
}

function removeUrlParam(paramName) {
  let params = getUrlParams();
  delete params[paramName];

  let url = window.location.href.split('?')[0] + '?';
  for(let val in params) {
    url += val + '=' + params[val] + '&';
  }
  url = url.replace(/([&]|[?])$/,'');//remove last & or ?
  window.history.pushState({}, "", url);
}

function getUrlParams() {
  let currentURL = window.location.href.split('?')[0];
  let params = new URLSearchParams(window.location.search),
  result = {};
  for(let val of params) result[val[0]] = val[1];
  return result;
}

function getIdFromUrl() {
  let id  = window.location.pathname.split('/').pop();//get last element from url
  id = /[0-9]+/.test(id) ? id : null;//if id has no numbers - this is not a valid one
  return id;
}

class Loader {
  constructor(parent, ops = {}) {
    this.parent = parent;
    this.classCSS = ops.classLoader || 'bottom-loader';
    this.overlayClass = ops.overlayClass || 'main-olay';
    this.numberOfInnerDivs = 8;
    this.ops = ops;

    if(ops.autoPost || ops.autoShow) {
      this.build();
      if(!ops.autoShow) {
        this.hide();
      }

    }
  }

  build() {
    this.makeHolder();
    for(let i = 0 ; i < this.numberOfInnerDivs ; i ++ ) {
      this.makeEmptyDiv();
    }
    if(this.ops.message && !this.ops.noMessage) {//make message p
      this.makeMessage();
    }
    this.post();
  }

  makeHolder() {
    if(this.ops.withOverlay) {
      this.overlay = document.createElement('DIV');
      this.overlay.className = this.overlayClass;
      this.parent.appendChild(this.overlay);
      this.parent = this.overlay;
    }
    this.holder = document.createElement('DIV');
    this.holder.className = this.classCSS;
    if(this.ops.cssForceLoader) {
      for(let i in this.ops.cssForceLoader) {
        this.forceCSS(this.holder, i, this.ops.cssForceLoader[i]);
      }
    }
  }

  makeMessage() {
    this.messageP = document.createElement('P');
    this.messageP.innerHTML = this.ops.message;
    if(this.ops.messageClass) {
      this.messageP.className = this.ops.messageClass;
    }
    if(this.ops.messageForceStyle) {
      for(let i in this.ops.messageForceStyle) {
        this.forceCSS(this.messageP, i, this.ops.messageForceStyle[i]);
      }
    }
  }

  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  makeEmptyDiv() {
    this.holder.appendChild(document.createElement('DIV'));
  }

  post() {
    this.parent.appendChild(this.holder);
    if(this.messageP) {
      this.parent.appendChild(this.messageP);
    }
  }

  hide() {
    this.holder.style.display = 'none';
    if(this.messageP) {
      this.messageP.style.display = 'none';
    }
    if(this.overlay) {
      this.parent.style.display = 'none';
    }
  }

  show() {
    this.holder.style.display = 'block';
    if(this.messageP) {
      this.messageP.style.display = 'block';
    }
    if(this.overlay) {
      this.parent.style.display = 'block';
    }
    this.bringFront();
  }

  bringFront() {
    if(this.overlay) {
      this.forceCSS(this.overlay, 'z-index', '9999');
    }
  }

  delete() {
    this.holder.remove();
    if(this.messageP) {
      this.messageP.remove();
    }
    if(this.overlay) {
      this.parent.remove();
    }
  }
}

class Image {
  constructor(src, parent) {
    this.src = src;
    this.parent = parent;
    this.selectResolver = null;
    this.selectPromise = new Promise((res) => {
      this.selectResolver = res;
    });
  }

  build() {
    this.image = document.createElement('IMG');
    this.image.src = this.src;
    this.post();
    this.listen();
    return this.selectPromise;
  }

  post() {
    this.parent.appendChild(this.image);
  }

  hide() {
    this.image.style.display = 'none';
  }

  show() {
    this.image.style.display = 'block';
  }

  delete() {
    this.image.remove();
  }

  listen() {
    this.image.onclick = () => {
      this.selectResolver(this.src);
    };
  }
}

class ConfirmWithPic {
  constructor(ops = {}) {
    this.src = ops.src || '';
    this.message = ops.message || 'Are you confirm?';
    this.okMessage = ops.ok || 'OK';
    this.cancelMessage = ops.cancel || 'Cancel';
    this.exitClass = ops.exitClass || 'close-confirm-popup';
    this.overlayClass = ops.overlayClass || 'confirm-overlay';
    this.buttonClass = ops.buttonClass || 'black-white-button';
    this.popupClass = ops.popupClass || 'confirm-popup';
    this.buttonHolderClass = ops.buttonHolderClass || 'confirm-popup-buttons-holder';
  }

  make() {
    this.build();
    this.post();
    return this.listenToButtons();
  }

  build() {
    this.popup = document.createElement('DIV');
    this.overlay = document.createElement('DIV');
    this.overlay.className = this.overlayClass;
    this.popup.className = this.popupClass;
    this.buildPopup();
    this.overlay.appendChild(this.popup);
  }

  kill() {
    this.overlay.remove();
  }

  post() {
    document.body.appendChild(this.overlay);
  }

  buildPopup() {
    this.makeCloseButton();
    this.makePopupMessage();
    this.makePopupPicture();
    this.makePopupButtons();
  }

  makePopupMessage() {
    let message = document.createElement('P');
    message.innerHTML = this.message;
    this.popup.appendChild(message);
  }

  makePopupPicture() {
    let img = document.createElement('IMG');
    img.src = this.src;
    this.popup.appendChild(img);
  }

  makeCloseButton() {
    this.exitButton = document.createElement('BUTTON');
    this.exitButton.innerHTML = 'X';
    this.exitButton.className = this.exitClass;
    this.popup.appendChild(this.exitButton);
  }

  makePopupButtons() {
    this.makeButtonHolder();
    this.makeOkButton();
    this.makeCancelButton();
  }

  makeButtonHolder() {
    this.buttonHolder = document.createElement('DIV');
    this.buttonHolder.className = this.buttonHolderClass;
    this.popup.appendChild(this.buttonHolder);
  }

  makeOkButton() {
    this.okButton = document.createElement('BUTTON');
    this.okButton.innerHTML = this.okMessage;
    this.okButton.className = this.buttonClass;
    this.buttonHolder.appendChild(this.okButton);
  }

  makeCancelButton() {
    this.cancelButton = document.createElement('BUTTON');
    this.cancelButton.innerHTML = this.cancelMessage;
    this.cancelButton.className = this.buttonClass;
    this.buttonHolder.appendChild(this.cancelButton);
  }

  listenToButtons() {
    return new Promise((resolve, reject) => {
      this.okButton.onclick = () => {
        this.kill();
        resolve();
      };
      this.cancelButton.onclick = () => {
        this.kill();
        reject();
      };
      this.exitButton.onclick = () => {
        this.kill();
        reject();
      };
    });
  }
}

class CoverAutoSearch {
  constructor(parent,  opts = {}) {
    this.covers = [];
    this.coversPromises = [];
    this.parent = parent;
    this.imagesHolder = document.createElement('DIV');
    this.imagesHolder.className = 'folder-pictures-holder';
    this.loaderMessage = opts.loaderMessage || 'Searching for you in the internet...';
    this.loaderClass = opts.loaderClass || 'loader-p-text';
    this.searchButtonClass = opts.searchButtonClass || 'black-white-button';
    this.selectMessageClass = opts.coverSelectorSelectMessageClass || 'auto-search-select-message';
    this.selectedPictureClass = opts.selectedPictureClass || 'auto-search-selected-img';
    this.coverSelectorPointer = opts.coverSelector;
    this.coverSelectorSelectMessageClassForce = opts.coverSelectorSelectMessageClassForce || '';
    this.getSearchCoverParamsCallback = opts.getSearchCoverParamsCallback;
    this.selectedPicture = '';
    this.clickToSelectMessage = 'Click at the wanted cover';
    this.selectedImageMessage = 'Cover Selected';
    this.makeSearchButton();
    this.makeSelectMessage();
    this.makeLoader();
    this.listenToSearchClick();
    this.parent.appendChild(this.imagesHolder);
  }

  clearSelectionParam() {
    this.selectedPicture = '';
  }

  show() {
    this.parent.style.display = 'block';
  }

  hide() {
    this.parent.style.display = 'none';
  }

  setSelectedMessage() {
    this.selectMessage.innerHTML = this.selectedImageMessage;
  }

  setClickCoverMessage() {
    this.selectMessage.innerHTML = this.clickToSelectMessage;
  }

  showCovers() {
    this.covers.forEach((cvr) => {
      this.coversPromises.push(new Image(cvr,this.imagesHolder).build());
    });
    this.selectCoverOnConfirm();
  }

  async selectCoverOnConfirm() {
    let selected = await Promise.race(this.coversPromises);
    this.clear();
    this.saveSelectedCover(selected);
    this.buildSelectedPictureView();
  }

  saveSelectedCover(selected) {
    this.selectedPicture = selected;
  }

  getSelected() {
    return this.selectedPicture;
  }

  buildSelectedPictureView() {
    this.setSelectedMessage();
    this.showSelectMessage();
    let img = document.createElement('IMG');
    img.src = this.selectedPicture;
    img.className = this.selectedPictureClass;
    this.parent.appendChild(img);
  }

  makeSelectMessage() {
    this.selectMessage = document.createElement('P');
    this.selectMessage.innerHTML = this.clickToSelectMessage;
    this.selectMessage.className = this.selectMessageClass;
    this.forceCSS(this.selectMessage, 'margin', '5px 0');
    if(this.coverSelectorSelectMessageClassForce) {
      for(let i in this.coverSelectorSelectMessageClassForce) {
        this.forceCSS(this.selectMessage, i, this.coverSelectorSelectMessageClassForce[i]);
      }
    }
    this.hideSelectMessage();//hidden by default
    this.parent.appendChild(this.selectMessage);
  }


  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  hideSelectMessage() {
    this.selectMessage.style.display = 'none';
  }

  showSelectMessage() {
    this.selectMessage.style.display = 'block';
  }

  clear() {
    this.clearSelectionParam();
    this.clearImages();
    this.clearCoverLinks();
    this.hideSelectMessage();
    this.setClickCoverMessage();
  }

  listenToSearchClick() {
    this.searchButton.onclick = async () => {
      this.clear();
      this.showLoader();
      await this.fetchCovers();
      this.hideLoader();
      if(this.noCovers()) {
        return;
      }
      this.showSelectMessage();
      this.showCovers();
    };
  }

  search() {
    this.searchButton.click();
  }

  async fetchCovers() {
    let httpReq = '',
    requestBody = {},
    searchParams = this.getSearchCoverParamsCallback(),
    title = searchParams.title || null,
    isbn = searchParams.isbn || null,
    author = searchParams.author || null;
    if(this.emptyCoverSearchParam(title) && this.emptyCoverSearchParam(isbn) && this.emptyCoverSearchParam(author)) {
      this.alert('Please fill required values');
      return;
    }
    if(this.emptyCoverSearchParam(title) && this.emptyCoverSearchParam(isbn)) {//can't search based on author only
      this.alert('Please fill required values');
      return;
    }
    if(title) {
      requestBody.title = title;
    }
    if(isbn) {
      requestBody.isbn = isbn;
    }
    if(author) {
      requestBody.author = author;
    }

    httpReq = await doHttpRequest('/search/cover/', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' }
    });
    if(!httpReq) {
      this.alert('Error fetching server');
      return;
    }
    if(!Array.isArray(httpReq)) {
      this.alert('Unexpeted server response');
      return;
    }
    if(!httpReq.length) {
      this.alert('Nothing found');
      return;
    }
    this.covers = httpReq;
  }

  noCovers() {
    return !this.covers.length;
  }

  emptyCoverSearchParam(a) {
    return !a;
  }

  alert(m) {
    this.coverSelectorPointer.setError(m);
  }

  clearCoverLinks() {
    this.covers.length = 0;
    this.coversPromises.length = 0;
  }

  clearImages() {
    [...this.parent.getElementsByTagName('IMG')].forEach(a => a.remove());
  }

  makeSearchButton() {
    this.searchButton = document.createElement('BUTTON');
    this.searchButton.type = 'button';
    this.searchButton.className = this.searchButtonClass;
    this.searchButton.innerHTML = 'Search';
    this.parent.appendChild(this.searchButton);
  }

  makeLoader() {
    this.loader = new Loader(this.parent, {
      message: this.loaderMessage,
      messageClass: this.loaderClass,
      messageForceStyle: this.coverSelectorSelectMessageClassForce
    });
    this.loader.build();
    this.hideLoader();
  }

  hideLoader() {
    this.loader.hide();
  }

  showLoader() {
    this.loader.show();
  }
}


class CoverUploader {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.inputFileClass = opts.inputFileClass || 'hidden-file-uploader';
    this.inputFileAccept = opts.inputFileAccept || '.png, .jpg, .jpeg';
    this.inputButtonClass = opts.inputButtonClass || 'black-white-button';
    this.selectMessageClass = opts.selectMessageClass || 'auto-search-select-message';
    this.selectedImageClass = opts.selectedImageClass || 'uploaded-picture-img';
    this.pasteTAClass = opts.pasteTAClass || 'text-area-paste-handler';
    this.file = '';
    this.build();
  }

  show() {
    this.parent.style.display = 'block';
  }

  hide() {
    this.parent.style.display = 'none';
  }

  build() {
    this.addFileInput();
    this.addUploadButton();
    this.addPasteElement();
    this.makeSelectionMessage();
    this.makeImageHolder();
    this.redirectClickToInput();
    this.handleFileInput();
    this.handlePaste();
  }

  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  addPasteElement() {
    this.pasteEl = document.createElement('TEXTAREA');
    this.pasteEl.placeholder = 'or Paste Screenshot here (Ctrl + V)';
    this.pasteEl.className = this.pasteTAClass;
    this.parent.appendChild(this.pasteEl);
  }

  handlePaste() {
    this.pasteEl.onkeydown = (e) => {//stop user from typing into it
      if(e.key === 'Control') {//user typed control key, allow it
        return;
      }
      if(e.key === 'v' && e.ctrlKey) {//user typed ctrl + v
        return;
      }
      e.preventDefault();
      this.pasteEl.value = '';
    };

    this.pasteEl.onpaste = (e) => {
      e.preventDefault();
      let pastedData = e.clipboardData.items;
      //get last file (if any)
      for(let i = pastedData.length - 1 ; i > -1 ; i-- ) {
        if(pastedData[i].kind === 'file') {//this is a file
          //set file and exit
          this.set(pastedData[i].getAsFile());
          return;
        }
      }
    };
  }

  makeSelectionMessage() {
    this.selectMessage = document.createElement('P');
    this.selectMessage.innerHTML = 'Cover Selected';
    this.forceCSS(this.selectMessage, 'margin', '5px 0');
    this.selectMessage.className = this.selectMessageClass;
    this.hideSelectMessage();//hidden by default
    this.parent.appendChild(this.selectMessage);
  }

  hideSelectMessage() {
    this.selectMessage.style.display = 'none';
  }

  showSelectMessage() {
    this.selectMessage.style.display = 'block';
  }

  set(file) {
    this.file = file;
    let reader = new FileReader();
    reader.onload = (evt) => {
      this.showSelectMessage();
      this.addImage(evt.target.result);
    };
    reader.readAsDataURL(file);
  }


  handleFileInput() {
    this.inputFile.onchange = (e) => {
      if(!this.inputFile.files || !this.inputFile.files[0]) {
        return;//no files
      }
      this.set(this.inputFile.files[0]);
    };
  }


  makeImageHolder() {
    this.image = document.createElement('IMG');
    this.image.className = this.selectedImageClass;
    this.hideImage();//by default
    this.parent.appendChild(this.image);
  }

  showImage() {
    this.image.style.display = 'unset';
  }

  hideImage() {
    this.image.style.display = 'none';
    this.image.src = '';
  }

  getSelected(asFile = false) {

    return asFile ? this.file : this.image.getAttribute('src');
  }

  addImage(img) {
    this.image.src = img;
    this.showImage();
  }

  setSrc(src) {
    this.showSelectMessage();
    this.addImage(src);
  }

  redirectClickToInput() {
    this.button.onclick = () => {
      this.triggerInput();
    };
  }

  triggerInput() {
    this.inputFile.click();
  }

  addUploadButton() {
    this.button = document.createElement('BUTTON');
    this.button.type = 'button';
    this.button.className = this.inputButtonClass;
    this.button.innerHTML = 'Upload Picture';
    this.parent.appendChild(this.button);
  }

  addFileInput() {
    this.inputFile = document.createElement('INPUT');
    this.inputFile.type = 'file';
    this.inputFile.setAttribute('accept', this.inputFileAccept);
    this.inputFile.className = this.inputFileClass;
    this.parent.appendChild(this.inputFile);
  }
}

class CoverSelector {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.title = opts.title || '';
    this.titleClass = opts.titleClass || 'main-title-insert';
    this.featuresHolderClass = opts.featuresHolderClass || 'insert-pic-body';
    this.coverSearchClass = opts.coverSearchClass || 'auto-search-pic-uploader';
    this.checkBoxGroupClass = opts.checkBoxGroupClass || 'checkbox-group';
    this.checkBoxLabelClass = opts.checkBoxLabelClass || 'radio-button-container';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || 'radio-button-checkmark';
    this.errorClass = opts.errorClass || 'cover-uploader-error-main';
    this.coverSelectorSelectMessageClassForce = opts.coverSelectorSelectMessageClassForce || '';
    this.buttonHolderTableCoverSelectorClass = opts.buttonHolderTableCoverSelectorClass || null;
    this.selectedImageClassForUploder = opts.selectedImageClassForUploder || null;
    this.tabHolderCssForce = opts.tabHolderCssForce || null;
    this.getSearchCoverParamsCallback = opts.getSearchCoverParamsCallback;
    this.defaultPictureClass = opts.selectedImageClassForUploder || 'uploaded-picture-img';
    this.getAsFile = opts.getAsFile || null;
    this.uploadTitle = 'Upload/Paste';
    this.searchTitle = 'Search';
    this.noSearch = opts.noSearch || false;
    this.urlTitle = 'Link';
    this.errorIsShown = false;
    this.defaultCover = null;
    this.build();
  }

  hide() {
    this.tabsPointer.hide();
    this.titleElement.style.display = 'none';
    this.killDropZone();
  }

  show() {
    this.tabsPointer.show();
    this.titleElement.display = 'block';
    this.activateDropZone();
  }

  build() {
    this.buildTitle();
    this.buildOptionChanger();
    this.buildActionHolder();
    this.makeFeatures();
    this.makeErrorDiv();
    this.activateDropZone();
  }

  killDropZone() {
    this.parent.ondragenter = this.parent.ondragleave = this.parent.ondragover = this.parent.ondrop = null;
  }

  set(src) {
    //user asks for a default value to be set
    //add a new tab - default (and focus)
    const defaultTabName = 'Default';
    this.tabsPointer.addTab(defaultTabName, {
      focus: true
    });
    //get tab and set inside the default picture
    this.buildDefaultPicture(src ,this.tabsPointer.getTab(defaultTabName));
    this.defaultCover = src;
  }

  getDefault() {//return default cover if exists (may be null)
    return this.defaultCover;
  }

  buildDefaultPicture(src, parent) {
    let img = document.createElement('IMG');
    img.src = src;
    img.className = this.defaultPictureClass;
    parent.appendChild(img);
  }

  buildOptionChanger() {
    let ops = [this.uploadTitle, this.urlTitle];
    if(!this.noSearch) {
      ops.push(this.searchTitle);
    }
    this.tabsPointer = new Tabs(this.parent, ops, {
      buttonHolderClass: this.buttonHolderTableCoverSelectorClass,
      default: this.uploadTitle,
      forceCss: this.tabHolderCssForce
    });
    this.tabsPointer.set();
  }


  activateDropZone() {
    this.parent.ondragenter = (e) => {this.dragEnterEvent(e)};
    this.parent.ondragleave = (e) => {this.dragLeaveEnent(e)};
    this.parent.ondragover = (e) => {this.dragOverEnent(e)};
    this.parent.ondrop = (e) => {this.dragDropEvent(e)};
  }

  dragEnterEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    this.showDropZone();
  }

  setTitle(e) {
    this.titleElement.innerHTML = e;
  }

  dragOverEnent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  showDropZone() {
    this.setTitle("Drop it like it's hot!");
    this.parent.style.border = '4px dashed blue';
    this.parent.style.borderRadius = '20px';
  }

  hideDropZone(e, force = false) {
    if(force || this.cursorIsOutside(e)) {
      this.setTitle("");
      this.parent.style.border = '';
      this.parent.style.borderRadius = '';
    }
  }

  cursorIsOutside(e) {
    if(!e) {//no event passed - ignore this test
      return false;
    }
    let bounderies = this.parent.getBoundingClientRect();
    return e.clientY < bounderies.top || e.clientY >= bounderies.bottom || e.clientX < bounderies.left || e.clientX >= bounderies.right;
  }

  dragLeaveEnent(e) {
    e.preventDefault();
    e.stopPropagation();
    this.hideDropZone(e);
  }

  dragDropEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    this.hideDropZone(e, true);//force
    this.handleDroppedFiles(e.dataTransfer.files);
  }

  handleDroppedFiles(files) {
    if(files.length !== 1) {
      this.setError("Please drop just 1 file");
      return;
    }

    if(!/^image/.test(files[0].type)) {
      this.setError("Item not allowed, Images only");
      return;
    }

    this.saveDroppedFile(files[0]);
  }

  makeErrorDiv() {
    this.errorDiv = document.createElement('DIV');
    this.errorDiv.className = this.errorClass;
    this.errorDiv.innerHTML = 'Error';
    this.parent.appendChild(this.errorDiv)
  }

  setError(err) {
    if(this.errorIsCurrentlyShown()) {
      this.hideError();
    }
    this.errorDiv.innerHTML = err;
    this.showError();
    setTimeout(() => {
      this.hideError();
    }, 3000);
  }

  showError() {
    this.errorIsShown = true;
    this.errorDiv.style.display = 'block';
  }

  hideError() {
    this.errorIsShown = false;
    this.errorDiv.style.display = 'none';
  }

  errorIsCurrentlyShown() {
    return this.errorIsShown;
  }


  buildActionHolder() {
    this.featuresHolder = document.createElement('DIV');
    this.featuresHolder.className = this.featuresHolderClass;
    this.parent.appendChild(this.featuresHolder);
  }

  makeFeatures() {
    this.makeUploader();
    if(!this.noSearch) {
      this.makeSearcher();
    }
    this.makeLinkFetcher();
  }

  getSelected() {
    let activeFeature = this.tabsPointer.getActiveName();
    if(activeFeature === '') {//nothing selected
      return '';
    }
    if(activeFeature === this.uploadTitle) {
      return this.coverUploader.getSelected(this.getAsFile);
    }
    if(activeFeature === this.searchTitle) {
      return this.coverSearcher.getSelected();
    }
    if(activeFeature === this.urlTitle) {
      return this.linkFetcher.getSelected();
    }
    return '';//nothing
  }

  makeUploader() {
    this.coverUploader = new CoverUploader(this.tabsPointer.getTab(this.uploadTitle), {
      selectedImageClass: this.selectedImageClassForUploder
    });
  }

  saveDroppedFile(file) {
    //show relevant tab and save picture
    this.tabsPointer.focus(this.uploadTitle);
    this.sendFileToUploader(file);
  }

  sendFileToUploader(file) {
    this.coverUploader.set(file);
  }

  sendFileSrcToUploader(src) {
    this.tabsPointer.focus(this.uploadTitle);
    this.coverUploader.setSrc(src);
  }

  search() {
    this.tabsPointer.focus(this.searchTitle);
    this.coverSearcher.search();
  }

  makeSearcher() {
    this.coverSearcher =  new CoverAutoSearch(this.tabsPointer.getTab(this.searchTitle), {
      getSearchCoverParamsCallback: this.getSearchCoverParamsCallback,
      coverSelector: this,
      coverSelectorSelectMessageClassForce: this.coverSelectorSelectMessageClassForce,
      selectedPictureClass : this.selectedImageClassForUploder
    });
  }

  makeLinkFetcher() {
    this.linkFetcher = new LinkFetcher(this.tabsPointer.getTab(this.urlTitle), {
      imageClass: this.selectedImageClassForUploder
    });
  }

  showUploader() {
    this.coverUploader.show();
  }

  hideUploader() {
    this.coverUploader.hide();
  }


  showSearcher() {
    this.coverSearcher.show();
  }

  hideSearcher() {
    this.coverSearcher.hide();
  }


  buildCheckbox(txt, autoSelect = false) {
    let div = document.createElement('DIV'),
    label = document.createElement('LABEL'),
    input = document.createElement('INPUT'),
    span = document.createElement('SPAN'),
    p = document.createElement('P');
    input.type = 'checkbox';
    if(autoSelect) {
      input.checked = true;
    }
    p.innerHTML = txt;
    span.className = this.checkBoxSpanClass;
    label.className = this.checkBoxLabelClass;
    div.appendChild(label);
    label.appendChild(input);
    label.appendChild(span);
    div.appendChild(p);
    this.checkBoxHolder.appendChild(div);
    return input;
  }

  buildTitle() {
    this.titleElement = document.createElement('P');
    this.titleElement.innerHTML = this.title;
    this.titleElement.className = this.titleClass;
    this.parent.appendChild(this.titleElement);
  }
}

class LinkFetcher {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.src = '';
    this.holderClass = opts.holderClass || 'link-fetcher-main-class';
    this.buttonText = opts.buttonText || 'Fetch';
    this.buttonClass = opts.buttonClass || 'black-white-button';
    this.inputPlaceholder = opts.inputPlaceholder || 'Enter Picture Link';
    this.imageClass = opts.imageClass || 'link-fetcher-main-class-img';
    this.build();
    this.activate();
  }

  activate() {
    this.button.onclick = () => {
      this.getImg();
      this.setImg();
    };

    this.input.onkeyup = (k) => {
      if(k.keyCode === 13) {//enter
        this.getImg();
        this.setImg();
      }
    };
  }

  getSelected() {
    return this.src;
  }

  getImg() {
    let src = this.input.value;
    if(!src) {
      return;
    }
    this.src = src;
  }

  setImg() {
    if(this.src) {
      this.img.src = this.src;
      this.showImg();
    }
  }

  build() {
    this.body = document.createElement('DIV');
    this.input = document.createElement('INPUT');
    this.button = document.createElement('BUTTON');
    this.img = document.createElement('IMG');

    this.img.className = this.imageClass;
    this.body.className = this.holderClass;
    this.button.className = this.buttonClass;
    this.button.innerHTML = this.buttonText;
    this.input.placeholder = this.inputPlaceholder;
    this.body.appendChild(this.input);
    this.body.appendChild(this.button);
    this.body.appendChild(this.img);
    this.parent.appendChild(this.body);
    this.hideImg();
  }

  hideImg() {
    this.img.style.display = 'none';
  }

  showImg() {
    this.img.style.display = 'block';
  }
}


class Tabs {
  constructor(parent, values = [], opts = {}) {
    this.parent = parent;
    this.values = values;
    this.tabs = {};
    this.buttonHolderClass = opts.buttonHolderClass || 'tabs-buttons-holder';
    this.forceCss = opts.forceCss || null;
    this.defaultTab = opts.default || '';
    this.selected = '';
    this.setIndexer();
  }

  setIndexer() {//make global with other Tabs class
    if(typeof window.tabIndexHolderCustom === 'undefined') {
      window.tabIndexHolderCustom = 0;
    }
  }

  getIndex() {
    return ++window.tabIndexHolderCustom;
  }

  set() {
    this.buildSkeleton();
    this.buildTabs();
    this.activate();
    //set the default one active
    if(this.defaultTab) {
      this.setActive(this.tabs[this.defaultTab].tab,this.tabs[this.defaultTab].label, this.defaultTab);
    }
  }

  hide() {
    this.mainHolder.style.display = 'none';
  }

  show() {
    this.mainHolder.style.display = 'block';
  }

  buildSkeleton() {
    this.mainHolder = document.createElement('DIV');
    this.buttonHolder = document.createElement('DIV');
    this.tabsHolder = document.createElement('DIV');
    this.mainHolder.className = 'tabs';
    this.tabsHolder.className = 'tabs-holder';
    this.buttonHolder.className = this.buttonHolderClass;

    if(this.forceCss) {
      for(let prop in this.forceCss) {
        this.forceCSS(this.buttonHolder, prop, this.forceCss[prop]);
      }
    }
    this.mainHolder.appendChild(this.buttonHolder);
    this.mainHolder.appendChild(this.tabsHolder);
    this.parent.appendChild(this.mainHolder);
  }

  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  buildTabs() {
    this.values.forEach((tab, index) => {
      this.buildSingleTab(tab, index === 0);
    });
  }

  buildSingleTab(tabName, autoChecked) {
    this.tabs[tabName] = {};
    this.buildTabButton(tabName, autoChecked);
    this.buildTabBody(tabName);
    if(autoChecked) {//marked by default
      this.setActive(this.tabs[tabName].tab,this.tabs[tabName].label);
    }
  }

  buildTabButton(name, checked = false) {
    let inp = document.createElement('INPUT'),
    label = document.createElement('LABEL'),
    buttonName = `tab-btn-enumeration-${ this.getIndex() }`;
    label.innerHTML = name;
    label.className = 'tab-btn';
    label.setAttribute('for',buttonName);
    inp.type = 'radio';
    inp.className = 'btn-inp-tab';
    inp.id = buttonName;
    inp.checked = checked;
    this.buttonHolder.appendChild(inp);
    this.buttonHolder.appendChild(label);
    this.tabs[name].input = inp;
    this.tabs[name].label = label;
  }

  buildTabBody(name) {
    let tab = document.createElement('DIV');
    tab.className = `tab`;
    this.tabsHolder.appendChild(tab);
    this.tabs[name].tab = tab;
  }

  removeFocus() {
    for(let t in this.tabs) {
      this.cancelActive(this.tabs[t].tab,this.tabs[t].label);
    }
  }


  setActive(tab,label,name) {
    tab.style.display = 'block';
    label.setAttribute('marked','t');
    this.selected = name;
  }

  getActiveName() {
    return this.selected;
  }

  cancelActive(tab,label) {
    tab.style.display = 'none';
    label.removeAttribute('marked');
  }

  getTab(name) {
    return this.tabs[name].tab;
  }

  focus(name) {
    this.tabs[name].input.click();
  }

  addTab(name, options) {
    //add new tab in "real time"
    //make GUI
    if(options.focus) {//remove current focus
      this.removeFocus();
    }
    this.buildSingleTab(name, options.focus);
    //reactivate so it will listen to the new one as well
    this.reactivate();
  }

  reactivate() {
    this.stop();
    this.activate();
  }

  stop() {
    for(let tab in this.tabs) {
      this.tabs[tab].input.onclick = null;
    }
  }

  activate() {
    for(let tab in this.tabs) {
      this.tabs[tab].input.onclick = () => {
        for(let tab2 in this.tabs) {//hide all tabs but the seleced one
          if(tab === tab2) {
            this.setActive(this.tabs[tab2].tab,this.tabs[tab2].label, tab2);
          } else {
            this.cancelActive(this.tabs[tab2].tab,this.tabs[tab2].label);
          }
        }
      };
    }
  }
}

class Selector {
  constructor(parent, opts) {
    this.parent = parent;
    this.additionalInputs = opts.additionalInputs;
    this.withFilter = opts.withFilter;
    this.title = opts.title;
    this.selectName = opts.selectName;
    this.actionScript = opts.actionScript || null;
    this.options = this.actionScript ? this.fetchOptions() : null;
    this.mainHolderClass = opts.mainHolderClass || 'insert-line-book-select';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || 'radio-button-checkmark';
    this.checkBoxLabelClass = opts.checkBoxLabelClass || 'radio-button-container';
    this.titleClassName = opts.titleClassName || 'main-title-cbox';
    this.toggleBodyClass = opts.toggleBodyClass || 'hide-div';
    this.ignoreCheckBox = opts.ignoreCheckBox || false;
    this.inputElement = opts.inputElement || 'select';
    this.inputType = opts.inputType || null;
    this.reverseCheckBox = opts.reverseCheckBox || false;
    this.defaultChecked = opts.defaultChecked || false;
    this.returnOnlyValue = opts.returnOnlyValue || false;
    this.returns = [];
    this.buildSkeleton();
    this.activate();
  }

  activate() {
    this.toggleElementOnChange();
    if(this.withFilter) {
      this.activateFilter();
    }
  }

  buildSkeleton() {
    this.makeMainHolder();
    this.makeCheckbox();
    this.makeToggleBody();
    if(this.ignoreCheckBox) {//if checkbox is ignored - toggled body should be on
      this.showDiv();
    }
    if(this.defaultChecked) {
      this.checkbox.checked = true;
    }
    this.addContentToToggleBody();
    this.makeAdditionals();
  }

  makeAdditionals() {
    if(! this.additionalInputs || ! Array.isArray(this.additionalInputs) || ! this.additionalInputs.length) {
      return;
    }
    let p, inp;
    this.additionalInputs.forEach((i) => {
      p = document.createElement('P');
      inp = document.createElement('INPUT');
      inp.type = i.type;
      p.innerHTML = i.name;
      this.toggleBody.appendChild(p);
      this.toggleBody.appendChild(inp);
      this.returns.push({
        name: i.returnName,
        inp: inp
      });
    });
  }

  makeMainHolder() {
    this.mainHolder = document.createElement('DIV');
    this.mainHolder.className = this.mainHolderClass;
    this.parent.appendChild(this.mainHolder);
  }

  toggleElementOnChange() {
    if(!this.ignoreCheckBox) {
      this.checkbox.onchange = () => {
        if(this.checkbox.checked) {
          if(this.reverseCheckBox) {
            this.hideDiv();
          } else {
            this.showDiv();
          }
        } else {
          if(this.reverseCheckBox) {
            this.showDiv();
          } else {
            this.hideDiv();
          }
        }
      };
    }
  }

  makeCheckbox() {
    let div = document.createElement('DIV'),
    label = document.createElement('LABEL'),
    span = document.createElement('SPAN'),
    p = document.createElement('P');
    this.checkbox = document.createElement('INPUT');
    this.checkbox.type = 'checkbox';
    p.innerHTML = this.title;
    span.className = this.checkBoxSpanClass;
    label.className = this.checkBoxLabelClass;
    p.className = this.titleClassName;
    div.appendChild(label);
    label.appendChild(this.checkbox);
    label.appendChild(span);
    div.appendChild(p);
    this.mainHolder.appendChild(div);
    if(this.ignoreCheckBox) {
      div.style.display = 'none';
    }
  }

  showDiv() {
    this.toggleBody.style.display = 'block';
  }

  hideDiv() {
    this.toggleBody.style.display = 'none';
  }

  makeToggleBody() {
    this.toggleBody = document.createElement('DIV');
    this.toggleBody.className = this.toggleBodyClass;
    this.mainHolder.appendChild(this.toggleBody);
  }

  addContentToToggleBody() {
    if(this.withFilter && this.inputElement.toLowerCase() === 'select') {
      this.makeFilter();
    }
    this.makeSelect();
  }

  makeFilter() {
    let p = document.createElement('P');
    this.filter = document.createElement('INPUT');
    this.filter.type = 'text';
    p.innerHTML = 'Filter: ';
    this.toggleBody.appendChild(p);
    this.toggleBody.appendChild(this.filter);
  }

  activateFilter() {
    this.filter.onkeyup = () => {
      let val = this.filter.value,
      options = [...this.select.getElementsByTagName('OPTION')];
      this.clearSelect();
      //hide non matches
      options.filter(a => !this.insensitiveInclude(a.innerText, val)).forEach(a => a.style.display = 'none');
      //show matched
      options.filter(a => this.insensitiveInclude(a.innerText, val)).forEach(a => a.style.display = 'block');
    };
  }

  insensitiveInclude(str, needle) {
    return str.toUpperCase().includes(needle.toUpperCase());
  }

  makeSelect() {
    let p = document.createElement('P');
    this.select = document.createElement(this.inputElement);
    if(this.inputType) {
      this.select.setAttribute('type', this.inputType);
    }
    this.select.setAttribute('main','t');
    p.innerHTML = this.selectName;
    this.toggleBody.appendChild(p);
    this.toggleBody.appendChild(this.select);
    this.addSelectOptions();
    this.returns.push({
      name: 'value',
      inp: this.select
    });
  }

  set(data) {
    if(this.options) {
      Promise.resolve(this.options).then((opts) => {
        this.checkbox.click();
        for(let i = 0 , l = this.returns.length ; i < l ; i ++ ) {
          if(typeof data[this.returns[i].name] !== 'undefined') {
            this.returns[i].inp.value = data[this.returns[i].name];
          }
        }
      });
    } else {
      this.checkbox.click();
      this.select.value = data;
    }
  }

  get() {
    if(( !this.checkbox.checked && !this.reverseCheckBox || this.checkbox.checked && this.reverseCheckBox) && !this.ignoreCheckBox) {//not selected and should not be ignored
      return null;
    }

    if(this.returnOnlyValue) {
      return this.select.value;
    }

    let output = {};
    this.returns.forEach((a) => {
      output[a.name] = a.inp.value;
    });
    return output;
  }

  clearSelect() {
    this.select.value = '';
  }

  addSelectOptions() {
    if(this.options) {
      let optionsStr = '<option value="">-- SELECT --</option>';
      Promise.resolve(this.options).then((opts) => {
        opts.forEach((opt) => {
          optionsStr += `<option value="${opt.id}">${opt.text}</option>`;
          this.select.innerHTML = optionsStr;
        });
      });
    }
  }

  async fetchOptions() {
    let httpReq = await doHttpRequest(this.actionScript, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if(!httpReq) {
      console.error('Error fetching server');
      return [];
    }
    return httpReq;
  }
}


class AutoFill {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.buttonClass = opts.buttonClass || 'black-white-button';
    this.errorClass = opts.errorClass || 'main-error-box';
    this.buttonText = opts.buttonText || 'Auto Search';
    this.loaderMessageClass = opts.loaderMessageClass || 'auto-search-loader-text';
    this.checkParamsCallback = opts.checkParamsCallback;
    this.getParamsCallback = opts.getParamsCallback;
    this.actionScript = opts.actionScript;
    this.checkParamsErrorMessage = opts.checkParamsErrorMessage || 'Error';
    this.inputsToFill = opts.inputsToFill || {};
    this.collectionPointer = opts.collectionPointer || null;
    this.hooks = opts.hooks || null;
    this.errorIsShown = false;
    this.build();
    this.activate();
  }

  addInputsToFill(inps) {
    this.inputsToFill = inps;
  }

  build() {
    this.makeButton();
    this.makeErrorBox();
    this.makeLoader();
  }

  makeLoader() {
    this.loader = new Loader(this.parent, {
      noMessage: true,
      cssForceLoader: {
        position:'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex:'50'
      }
    });
    this.loader.build();
    this.hideLoader();
  }

  disableButton() {
    this.btn.disabled = true;
  }

  enableButton() {
    this.btn.disabled = false;
  }

  showLoader() {
    this.loader.show();
  }

  hideLoader() {
    this.loader.hide();
  }

  makeButton() {
    this.btn = document.createElement('BUTTON');
    this.btn.className = this.buttonClass;
    this.btn.innerHTML = this.buttonText;
    this.btn.type = 'button';
    this.parent.appendChild(this.btn);
  }

  makeErrorBox() {
    this.errorDiv = document.createElement('DIV');
    this.errorDiv.className = this.errorClass;
    this.errorDiv.innerHTML = 'Error';
    this.parent.appendChild(this.errorDiv);
  }

  setError(err) {
    if(this.errorIsCurrentlyShown()) {
      this.hideError();
    }
    this.errorDiv.innerHTML = err;
    this.showError();
    setTimeout(() => {
      this.hideError();
    }, 4000);
  }

  showError() {
    this.errorIsShown = true;
    this.errorDiv.style.display = 'block';
  }

  hideError() {
    this.errorIsShown = false;
    this.errorDiv.style.display = 'none';
  }

  errorIsCurrentlyShown() {
    return this.errorIsShown;
  }

  manualTrigger() {
    this.btn.click();
  }

  activate() {
    this.btn.onclick = () => {
      if(!this.checkParamsCallback()) {
        this.setError(this.checkParamsErrorMessage);
        return;
      }
      //run "before" hook if exist
      if(this.hooks && this.hooks.before) {
        this.hooks.before();
      }
      this.action(this.getParamsCallback());
    };
  }

  action(params) {
    this.showLoader();
    this.disableButton();
    doHttpRequest(this.actionScript, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { 'Content-Type': 'application/json' }
    }).then((res) => {
      this.hideLoader();
      this.enableButton();
      if(res === null) {
        this.setError("Error fetching server");
      } else {
        this.fillInputs(res);
      }
    });
  }

  hide() {
    this.parent.style.display = 'none';
  }

  show() {
    this.parent.style.display = 'block';
  }

  fillInputs(values) {
    /*
    there are 2 input types
    1. normal HTML element, input/select/textare, just add value to it
    2. something like: {object: class pointer, prototype: class prototype} call the class prototype with value
    */
    for(let val in this.inputsToFill) {
      if(val in values) {
        if(isElement(this.inputsToFill[val])) {//if this is a DOM, just add to it value
          this.inputsToFill[val].value = values[val];
        } else if (typeof this.inputsToFill[val] === 'object' && this.inputsToFill[val].object && this.inputsToFill[val].prototype) { //class
          this.inputsToFill[val].object[this.inputsToFill[val].prototype](values[val]);
        }
      }
    }

    if(values.collection && values.collection.length && this.collectionPointer) {
      this.collectionPointer.clearStories();//clear prev. stories
      values.collection.forEach(a => this.collectionPointer.newStoryTitle(a));
    }
  }
}

class CoverChanger {
  constructor(opts = {}) {
    this.fetchDataEndPoint = opts.fetchScript || null;
    this.saveDataEndPoint = opts.saveScript || null;
    this.picture = opts.pic || null;

    if(!this.fetchDataEndPoint || !this.saveDataEndPoint) {
      return;
    }

    this.loader = opts.loader || null;
    this.messager = opts.messager || null;
    this.parent = opts.parent || document.body;
    this.overlayClass = opts.overlayClass || 'confirm-overlay';
    this.popupClass = opts.popupClass || 'cover-changer-style-popup';
    this.titleClass = opts.titleClass || '';
    this.saveClass = opts.saveClass || 'black-white-button';
    this.headerClass = opts.headerClass || 'cover-changer-header-class';
    this.buttonCloseClass = opts.buttonCloseClass || 'black-white-button';
    this.make();
  }

  async make() {
    await this.fetchDetails();
    this.makeSkeleton();
    this.makeCoverElement();
    this.makeSaveButton();
    this.hide();
    this.activate();
  }

  activate() {
    this.closeBtn.onclick = () => {
      this.hide();
    };

    this.saveButton.onclick = () => {
      this.save();
    };
  }

  async save() {
    this.showLoader();
    let coverSelected = this.coverSelector.getSelected();
    if(!coverSelected) {//nothing new selected
      this.hideLoader();
      this.hide();
      return;
    }
    //post data
    let req = await doHttpRequest(this.saveDataEndPoint, {
      method: 'POST',
      body: jsonToFormData({
        cover: coverSelected
      })
    });
    this.hideLoader();
    if(!req) {//error
      this.showError();
    } else {//success
      this.showSuccess();
    }
  }

  showError() {
    if(this.messager) {
      this.messager.setError('General Error');
    }
  }

  showSuccess() {
    document.location.reload();
  }

  showLoader() {
    if(this.loader) {
      this.loader.show();
    }
  }

  hideLoader() {
    if(this.loader) {
      this.loader.hide();
    }
  }

  makeSaveButton() {
    this.saveButton = document.createElement('BUTTON');
    this.saveButton.className = this.saveClass;
    this.saveButton.innerHTML = 'Save';
    this.popup.appendChild(this.saveButton);
  }

  async fetchDetails() {
    let fetchR = await doHttpRequest(this.fetchDataEndPoint);
    if(!fetchR) {
      this.searchParams = null;
      return;
    }
    let searchParams = {};
    if(fetchR.name) {
      searchParams.title = fetchR.name;
    }
    if(fetchR.author || fetchR.story_author) {//story_author is more accurate than author in case of stories
      searchParams.author = fetchR.story_author ? fetchR.story_author : fetchR.author;
    }
    if(fetchR.isbn && fetchR.isbn.length < 14) { //some ebooks without isbn may have an unique long id instead isbn - internal unique id
      searchParams.isbn = fetchR.isbn;
    }
    this.searchParams = searchParams;
  }

  makeCoverElement() {
    this.coverSelector = new CoverSelector(this.popup, {
      getSearchCoverParamsCallback: () => {
        return this.searchParams;
      },
      tabHolderCssForce: {
        width: '440px',
        margin: '0 auto'
      },
      getAsFile: true
    });

    if(this.picture) {//add default pic
      this.coverSelector.set(this.picture);
    }
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  show() {
    this.overlay.style.display = 'block';
  }

  makeSkeleton() {
    this.overlay = document.createElement('DIV');
    this.popup = document.createElement('DIV');
    this.overlay.className = this.overlayClass;
    this.popup.className = this.popupClass;
    this.overlay.appendChild(this.popup);
    this.parent.appendChild(this.overlay);
    this.makePopupHeader();
  }

  makePopupHeader() {
    let header = document.createElement('DIV');
    this.titleEl = document.createElement('DIV');
    this.closeBtn = document.createElement('BUTTON');
    header.className = this.headerClass;
    this.titleEl.className = this.titleClass;
    this.closeBtn.className = this.buttonCloseClass;
    this.titleEl.innerHTML = 'Change Cover';
    this.closeBtn.innerHTML = 'X';
    header.appendChild(this.titleEl);
    header.appendChild(this.closeBtn);
    this.popup.appendChild(header);
  }

}

class BooksDisplayer {
  constructor(opts = {}) {
    this.parent = opts.parent || document.body;
    this.mainClass = opts.mainClass || 'books-displayer-main';
    this.titleClass = opts.titleClass || 'books-displayer-title';
    this.bodyClass = opts.bodyClass || 'books-displayer-body';
    this.olayClass = opts.olayClass || 'confirm-overlay';
    this.bookClassName = opts.bookClassName || 'books-displayer-book-holder';
    this.exitClass = opts.exitClass || 'close-book-displayer-popup';
    this.bookIndicatorClass = opts.bookIndicatorClass || 'books-displayer-exist-marker';
    this.descButtonClass = opts.descButtonClass || 'black-white-button';
    this.singleBookContentClass = opts.singleBookContentClass || 'books-displayer-book-content';
    this.singleBookDescClass = opts.singleBookDescClass || 'books-displayer-book-description';
    this.title = opts.title || 'Title';
    this.starCode = '&#x2605;';
    this.starClass = 'rating-star';
    this.partialStarClass = 'partial-rating-star';
    this.starsTitleClass = 'rating-star-title';
    this.ratingsStarsHolderClass = 'rating-star-main-holder';
    this.maxRatingStars = 5;
    this.make();
    this.hide();
  }

  display(books) {
    if(!books || !Array.isArray(books)) {
      return;
    }
    books.forEach((bk) => {
      this.buildBook(bk);
    });
    this.show();
    this.activate();
  }

  activate() {
    this.closeOnBodyClick();
    this.closeOnButtonClick();
  }

  closeOnButtonClick() {
    this.exitButton.onclick = () => {
      this.close();
    };
  }

  close() {
    this.clear();
    this.hide();
    this.deactivate();
  }

  deactivate() {
    document.body.onclick = null;
    this.exitButton.onclick = null;
  }

  closeOnBodyClick() {
    document.body.onclick = (clkEvt) => {
      if(clkEvt.target !== this.popup && !this.popup.contains(clkEvt.target)) {
        this.close();
      }
    };
  }

  buildBook(bookEl) {
    let body = document.createElement('DIV');
    body.className = this.bookClassName;
    this.buildRedirector(body, bookEl);
    let title = document.createElement('DIV');
    title.innerHTML = bookEl.title;
    body.appendChild(title);

    let content = document.createElement('DIV');
    content.className = this.singleBookContentClass;
    if(bookEl.author) {
      content.innerHTML += 'Author: ' + bookEl.author + '<br>';
    }

    if(bookEl.series) {
      content.innerHTML += 'Serie: <b>' + bookEl.series;
      if(bookEl.serieLocation) {
        content.innerHTML += ' (' + bookEl.serieLocation + ')<b><br>';
      } else {
        content.innerHTML += '<b><br>';
      }
    }

    if(bookEl.isbn) {
      content.innerHTML += 'ISBN: ' + bookEl.isbn + '<br>';
    }

    if(bookEl.year) {
      content.innerHTML += 'Publication Year: ' + bookEl.year + '<br>';
    }

    let img = document.createElement('IMG');
    img.src = bookEl.cover ? bookEl.cover : '/pic/blank';//blank picture if no cover received
    body.appendChild(img);
    this.buildRatingElement(body, bookEl.rating, bookEl.rating_count);
    body.appendChild(content);

    //if description exists, show it, else add option to search for description
    let descriptionInp = document.createElement('DIV');
    descriptionInp.className = this.singleBookDescClass;

    if(bookEl.description) {
      descriptionInp.innerHTML = 'Description<br><br>' + bookEl.description;
      body.appendChild(descriptionInp);
    } else {
      //add description searcher
      let descSearcher = document.createElement('BUTTON');
      descSearcher.className = this.descButtonClass;
      descSearcher.innerHTML = 'Search Description';

      body.appendChild(descSearcher);

      //search description onclick
      descSearcher.onclick = async () => {
        descSearcher.style.display = 'none';//hide button
        descSearcher.onclick = null;//remove search listener

        //make a loader
        let loader = new Loader(body, {
          autoPost: true,
          autoShow: true,
          noMessage: true,
          cssForceLoader: {
            transform: 'scale(0.6)',
            margin: '0 auto'
          }
        });
        //fetch description searcher route
        let req = await doHttpRequest('/search/description/', {
          method: 'POST',
          body: JSON.stringify({
            isbn: bookEl.isbn,
            title: bookEl.title.split('(')[0].split('#')[0].trim(),
            author: bookEl.author
          }),
          headers: { 'Content-Type': 'application/json' }
        });
        //kill loader
        loader.delete();
        //show description
        if(req) {
          descriptionInp.innerHTML = 'Description<br><br>' + req;
        } else {//nothing found
          descriptionInp.innerHTML = 'No Description';
        }
        body.appendChild(descriptionInp);
        descSearcher.remove();//remove search button
      };
    }
    this.bodyHolder.appendChild(body);
  }

  buildRedirector(parent, data) {
    let holder = document.createElement('DIV'),
    icon = document.createElement('I'),
    p = document.createElement('P');
    holder.className = this.bookIndicatorClass;
    holder.appendChild(icon);
    holder.appendChild(p);
    if(data.exist) {//book exists, add redirector to book's page
      icon.className = 'fa fa-certificate';
      if(/book/.test(data.exist)) {//owned book
        p.innerHTML = 'Owned Book';
      } else if (/wish/.test(data.exist)) { // in wishlist
        p.innerHTML = 'in Wishlist';
      } else if (/stor/.test(data.exist)) {//owned story
        p.innerHTML = 'Owned Story';
      } else {//will never happen
        p.innerHTML = 'Unknown';
      }
      holder.setAttribute('onclick', 'window.location = "' + data.exist + '"');

    } else { //not exists - option to save
      icon.className = 'fa fa-plus';
      p.innerHTML = 'Add to Wishlist';
      holder.setAttribute('onclick', 'window.location = "/insert/wishlist?isbn=' +
      encodeURIComponent(data.isbn) +
      '&title=' + encodeURIComponent(data.title.split('(')[0].split('#')[0].trim()) +
      '&author=' + encodeURIComponent(data.author.trim()) +
      (data.serieID ? '&serie=' + encodeURIComponent(data.serieID) : '') +
      (data.serieLocation ? '&location=' + encodeURIComponent(data.serieLocation) : '') +
      '"');
    }
    parent.appendChild(holder);
  }

  clear() {
    this.bodyHolder.innerHTML = '';
  }

  buildRatingElement(holder, rating=0, ratingCount=0) {

    let width, htmlStr = `<div class="${this.ratingsStarsHolderClass}">`;

    for(let i = 1 ; i <= this.maxRatingStars ; i ++ ) {
      width =
      isBiggerOrEqualInt(rating, i) ?
      /*if the index is smaller (or equal) int that rating, star shold be full*/
      '100%' :
      /*else, if index is bigger by more than 1 int, should be 0, else. should be partial*/
      (
        isBiggerInt(i, toInt(rating) + 1) ?
        '0%' :
        /*in this case, star should be partial painted, for example: index is 3 and rating is 3.87*/
        getDecimalPartOfNumber(rating) * 100 + '%'
      );
      htmlStr += `<div class="${this.starClass}">${this.starCode}<div class="${this.partialStarClass}" style = "width: ${width};">${this.starCode}</div></div>`;
    }
    /*now add to output the rating data*/
    htmlStr += `<p class="${this.starsTitleClass}">${rating} (${addCommasToNum(ratingCount)})</p></div>`;

    holder.innerHTML += htmlStr;
  }

  make() {
    this.makeSkeleton();
    this.makeCloseButton();
    this.makeTitle();
    this.makeBody();
  }

  makeCloseButton() {
    this.exitButton = document.createElement('BUTTON');
    this.exitButton.innerHTML = 'X';
    this.exitButton.className = this.exitClass;
    this.popup.appendChild(this.exitButton);
  }


  hide() {
    this.overlay.style.display = 'none';
  }

  show() {
    this.overlay.style.display = 'block';
  }

  makeSkeleton() {
    this.overlay = document.createElement('DIV');
    this.popup = document.createElement('DIV');
    this.popup.className = this.mainClass;
    this.overlay.className = this.olayClass;
    this.parent.appendChild(this.overlay);
    this.overlay.appendChild(this.popup);
  }

  makeTitle() {
    this.titleHolder = document.createElement('DIV');
    this.titleHolder.className = this.titleClass;
    this.titleHolder.innerHTML = this.title;
    this.popup.appendChild(this.titleHolder);
  }

  makeBody() {
    this.bodyHolder = document.createElement('DIV');
    this.bodyHolder.className = this.bodyClass;
    this.popup.appendChild(this.bodyHolder);
  }

}
class Confirm {
  constructor(opts = {}) {
    this.parent = opts.parent || document.body;
    this.mainClass = opts.mainClass || 'my-confirm';
    this.subjectClass = opts.subjectClass || 'my-confirm-subject';
    this.bodyClass = opts.bodyClass || 'my-confirm-body';
    this.buttonHolderClass = opts.buttonHolderClass || 'my-confirm-button-holder';
    this.OKbuttonClass = opts.OKbuttonClass || 'black-white-button';
    this.CancelButtonClass = opts.CancelButtonClass || 'black-white-button';
    this.make();
    this.hide();
  }

  hide() {
    this.popup.style.display = 'none';
  }

  show() {
    this.popup.style.display = 'block';
  }

  ask(params = {}) {
    let subject = params.subject || 'Subject',
    content = params.content || 'Content',
    ok = params.ok || 'OK',
    cancel = params.cancel || 'Cancel';

    //set buttons text
    this.okBtn.innerHTML = ok;
    this.cancelBtn.innerHTML = cancel;

    //set subject
    this.subjectHolder.innerHTML = subject;

    //set content
    this.bodyHolder.innerHTML = content;

    //show
    this.show();

    //return promise
    return new Promise((resolve) => {
      this.okBtn.onclick = () => {
        this.killPromiseListeners();
        this.hide();
        resolve(true);
        return;
      };
      this.cancelBtn.onclick = () => {
        this.killPromiseListeners();
        this.hide();
        resolve(false);
        return;
      };

      //if body was clicked outside popup - return false
      document.body.onclick = (clkEvt) => {
        if(clkEvt.target !== this.popup && !this.popup.contains(clkEvt.target)) {
          this.killPromiseListeners();
          this.hide();
          resolve(false);
          return;
        }
      };

    });
  }

  killPromiseListeners() {
    this.okBtn.onclick = null;
    this.cancelBtn.onclick = null;
    document.body.onclick = null;
  }

  make() {
    this.makeSkeleton();
    this.makeSubject();
    this.makeBody();
    this.makeButtons();
  }

  makeButtons() {
    let buttonHolder = document.createElement('DIV');
    buttonHolder.className = this.buttonHolderClass;
    this.popup.appendChild(buttonHolder);

    //make buttons
    this.okBtn = document.createElement('BUTTON');
    this.okBtn.className = this.OKbuttonClass;
    buttonHolder.appendChild(this.okBtn);

    this.cancelBtn = document.createElement('BUTTON');
    this.cancelBtn.className = this.CancelButtonClass;
    buttonHolder.appendChild(this.cancelBtn);
  }

  makeBody() {
    this.bodyHolder = document.createElement('DIV');
    this.bodyHolder.className = this.bodyClass;
    this.popup.appendChild(this.bodyHolder);
  }

  makeSubject() {
    this.subjectHolder = document.createElement('DIV');
    this.subjectHolder.className = this.subjectClass;
    this.popup.appendChild(this.subjectHolder);
  }

  makeSkeleton() {
    this.popup = document.createElement('DIV');
    this.popup.className = this.mainClass;
    this.parent.appendChild(this.popup);
  }

}

class Messager {
  constructor(opts = {}) {
    this.parent = opts.parent || document.body;
    this.errorClass = opts.errorClass || 'messager-holder-error';
    this.messageClass = opts.messageClass || 'messager-holder-normal';
    this.isShown = false;
    this.makeSkeleton();
  }

  show() {
    this.isShown = true;
    this.div.style.display = 'block';
  }

  hide() {
    this.isShown = false;
    this.div.style.display = 'none';
  }

  isCurrentlyShown() {
    return this.isShown;
  }

  set() {
    if(this.isCurrentlyShown()) {
      this.hide();
    }
    this.show();
    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  makeSkeleton() {
    this.div = document.createElement('DIV');
    this.setErrorClass();
    this.parent.appendChild(this.div)
  }

  setError(m) {
    this.div.innerHTML = m;
    this.setErrorClass();
    this.set();
  }

  setMessage(m) {
    this.div.innerHTML = m;
    this.setMessageClass();
    this.set();
  }

  setErrorClass() {
    this.div.className = this.errorClass;
  }

  setMessageClass() {
    this.div.className = this.messageClass;
  }
}

function buildFormData(formData, data, parentKey) {
  if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
    });
  } else {
    const value = data == null ? '' : data;
    formData.append(parentKey, value);
  }
}

function jsonToFormData(data) {
  const formData = new FormData();
  buildFormData(formData, data);
  return formData;
}

async function doBackUp(folder) {
  /*open dialog box*/
  let dialog = new BackupDialog({title:folder.toUpperCase()});
  dialog.build();
  dialog.addLine("Sending request to bring up the Websocket Server");

  /*init the websocket server and get the server's port*/
  let port = await doHttpRequest('/websocket/init');
  if(!port) {
    dialog.addLine("Error - Could not get Websocket Server port from Web Server", {type:'error'});
    return;
  }

  if(port === 'busy') {
    dialog.addLine("Error - Websocket server is busy, try again later", {type:'error'});
    return;
  }

  /*create ws client*/
  let ws = await createWebSocketClient(`ws://${window.location.hostname}:${port}`);
    /*send ws pointer to dialog (if needs to send a stop command)*/
    dialog.setWS(ws);
    /*send to ws the wanted folder*/
    ws.send(folder);
    /*on message show it in dialog*/
    ws.onmessage = async (msg) => {
      msg = JSON.parse(msg.data);
      /*error*/
      if(msg.error) {
        dialog.addLine(msg.error, {type:'error'});
      } else if(msg.message){/*normal*/
        dialog.addLine(msg.message);
      } else if (msg.bold) {/*bold message*/
        dialog.addLine(msg.bold, {type:'bold'});
      } else if (msg.prompt) {/*promprt question to user*/
        ws.send(
          `response:${await dialog.addLine(msg.prompt, {type:'prompt'})}`
        );
      } else if (msg.link) { /*make a tag to user*/
        dialog.addLine(msg.link, {type:'link'});
      }

    };
  }

  async function createWebSocketClient(url) {
    return new Promise((resolve) => {
      let ws = new WebSocket(url);
      ws.onopen = () => {
        resolve(ws);
      };
    });
  }

  class PopUp {
    constructor(ops = {}) {
      this.isHtml = ops.html || false;
      this.parent = ops.parent || document.body;
      this.title = ops.title || 'Title';
      this.body = ops.body || 'body';
      this.buttonText = ops.buttonText || 'OK';
      this.overlayClass = ops.overlayClass || 'main-overlay';
      this.popupClass = ops.popupClass || 'general-popup';
      this.popupTitleClass = ops.popupTitleClass || 'general-popup-title';
      this.bodyClass = ops.bodyClass || 'general-popup-body';
      this.popupCloseClass = ops.popupCloseClass || 'general-popup-close';
      this.popupButtonClass = ops.popupButtonClass || 'black-white-button';
      this.build();
      this.activate();
    }

    build() {
      this.buildSkeleton();
      this.setTitle();
      this.setBody();
    }

    activate() {
      //close button click - remove popup
      this.popupClose.onclick = () => {
        this.kill();
      };
      //popup button click - remove popup
      this.popupButton.onclick = () => {
        this.kill();
      };
      //html body click - close popup if click is outside popup
      document.body.onclick = (clkEvt) => {
        if(clkEvt.target !== this.popup && !this.popup.contains(clkEvt.target)) {
          document.body.onclick = null;//remove event listener
          this.kill();
        }
      };
    }

    kill() {
      this.overlay.remove();
    }

    setTitle() {
      this.popupTitle.innerHTML = this.title;
    }

    setBody() {
      if(this.isHtml) {
        this.popupBody.innerHTML = this.body;
      } else {
        this.popupBody.textContent = this.body;
      }
    }

    buildSkeleton() {
      this.overlay = document.createElement('DIV');
      this.overlay.className = this.overlayClass;
      this.popup = document.createElement('DIV');
      this.popup.className = this.popupClass;
      this.popupTitle = document.createElement('DIV');
      this.popupTitle.className = this.popupTitleClass;
      this.popupClose = document.createElement('BUTTON');
      this.popupClose.className = this.popupCloseClass;
      this.popupClose.innerHTML = 'X';
      this.popupBody = document.createElement('DIV');
      this.popupBody.className = this.bodyClass;
      this.popupButton = document.createElement('BUTTON');
      this.popupButton.className = this.popupButtonClass;
      this.popupButton.innerHTML = this.buttonText;
      this.popup.appendChild(this.popupClose);
      this.popup.appendChild(this.popupTitle);
      this.popup.appendChild(this.popupBody);
      this.popup.appendChild(this.popupButton);
      this.overlay.appendChild(this.popup);
      this.parent.appendChild(this.overlay);
    }
  }

  class BackupDialog {
    constructor(ops = {}) {
      this.MAX_ELEMENTS = 500;
      this.title = ops.title || '';
      this.ws = ops.ws || null;
    }

    setWS(ws) {
      this.ws = ws;
    }

    build() {
      this.overlay = document.createElement('DIV');
      this.overlay.className = 'main-overlay';
      this.dialog = document.createElement('DIV');
      this.dialog.className = 'backup-dialog';
      this.dialogTitle = document.createElement('DIV');
      this.dialogTitle.className = 'backup-dialog-title';
      this.dialogTitle.innerHTML = 'Backup Process -' + this.title;
      this.dialogClose = document.createElement('BUTTON');
      this.dialogClose.className = 'backup-dialog-close-button';
      this.dialogClose.innerHTML = 'X';
      this.dialogBody = document.createElement('DIV');
      this.dialogBody.className = 'backup-dialog-body';
      this.dialog.appendChild(this.dialogClose);
      this.dialog.appendChild(this.dialogTitle);
      this.dialog.appendChild(this.dialogBody);
      this.overlay.appendChild(this.dialog);
      document.body.appendChild(this.overlay);
      this.activateCloseButton();
    }

    activateCloseButton() {
      this.dialogClose.onclick = () => {
        this.kill();
        this.stopWS();/*send stop command to websocket*/
      };
    }

    stopWS() {
      if(this.ws) {
        if(this.ws.readyState === 1) {//open
          this.ws.send('stop');
        }
      }
    }

    kill() {
      this.overlay.remove();
    }

    addLine(line, ops = {}) {

      let div = document.createElement('DIV');
      div.innerHTML = line;

      if(ops.type && ops.type === 'error') {/*error message*/
        div.style.color = 'rgba(255,0,0,0.8)';
      }

      if(ops.type && ops.type === 'bold') {/*bold message*/
        div.style.fontWeight = 'bolder';
        div.style.fontSize = '22px';
      }

      if(ops.type && ops.type === 'link') {/*a tag*/
        let a = document.createElement('A');
        a.href = line;
        a.target = 'blank';
        a.innerHTML = line;
        div.innerHTML = '';//clear line, will be displayed in a tag
        div.appendChild(a);
      }

      this.dialogBody.appendChild(div);

      if(this.dialogBody.childElementCount > this.MAX_ELEMENTS) {
        this.dialogBody.removeChild(this.dialogBody.children[0]);
      }
      this.scrollBottom();

      if(ops.type && ops.type === 'prompt') {/*pormpt message*/
        let inp = document.createElement('INPUT');
        inp.setAttribute("autocomplete","off");
        inp.setAttribute("autocorrect","off");
        inp.setAttribute("autocapitalize","off");
        inp.setAttribute("spellcheck","false");

        div.appendChild(inp);
        inp.focus();
        return new Promise((resolve) => {
          inp.onkeyup = (k) => {
            if(k.keyCode !== 13) {
              return;
            }
            /*convert input to inactive and remove listener*/
            inp.disabled = true;
            inp.onkeyup = null;
            resolve(inp.value);
          };
        });

      }

    }

    scrollBottom() {
      this.dialogBody.scrollTop = this.dialogBody.scrollHeight - this.dialogBody.clientHeight;
    }
  }

  class MembersAdd {
    constructor(ops = {}) {
      this.groupId = ops.groupId;
    }

    show() {}
  }

  function toInt(a, base=10) {
    return parseInt(a, base);
  }

  function isBiggerInt(a, b) {
    return this.toInt(a) > this.toInt(b);
  }

  function isEqualInt(a, b) {
    return this.toInt(a) === this.toInt(b);
  }

  function isBiggerOrEqualInt(a, b) {
    return isBiggerInt(a,b) || isEqualInt(a,b);
  }

  function getDecimalPartOfNumber(num) {
    return Number((num - Math.trunc(num)).toFixed(3));
  }

  function addCommasToNum(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function openWindowWithoutFocus(url) {
    window.open(window.location.href);
    window.location.href = url;
  }
