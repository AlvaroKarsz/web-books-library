function validValue(val) {
  return isString(validValue) ? val.trim() : val;
}

function isString(a) {
  return typeof a === 'string';
}

function sleep(t) {
  return new Promise(res => setTimeout(res, t));
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

class Loader {
  constructor(parent, ops = {}) {
    this.parent = parent;
    this.classCSS = ops.classLoader || 'bottom-loader';
    this.overlayClass = ops.overlayClass || 'main-olay';
    this.numberOfInnerDivs = 8;
    this.ops = ops;

    if(ops.autoPost) {
      this.build();
      this.hide();
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
    this.forceCSS(this.selectMessage, 'margin', '23px');
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
    this.makeSelectionMessage();
    this.makeImageHolder();
    this.redirectClickToInput();
    this.handleFileInput();
  }

  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  makeSelectionMessage() {
    this.selectMessage = document.createElement('P');
    this.selectMessage.innerHTML = 'Cover Selected';
    this.forceCSS(this.selectMessage, 'margin', '23px');
    this.forceCSS(this.selectMessage, 'width', 'max-content');
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
    this.image.style.display = 'block';
  }

  hideImage() {
    this.image.style.display = 'none';
    this.image.src = '';
  }

  getSelected() {
    return this.image.src;
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
    this.getSearchCoverParamsCallback = opts.getSearchCoverParamsCallback;
    this.uploadTitle = 'Upload';
    this.searchTitle = 'Search';
    this.errorIsShown = false;
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
    this.makeSearcher();
  }

  buildOptionChanger() {
    this.tabsPointer = new Tabs(this.parent, [this.uploadTitle, this.searchTitle], {
      buttonHolderClass: this.buttonHolderTableCoverSelectorClass
    });
    this.tabsPointer.set();
  }

  getSelected() {
    let activeFeature = this.tabsPointer.getActiveName();
    if(activeFeature === '') {//nothing selected
      return '';
    }
    if(activeFeature === this.uploadTitle) {
      return this.coverUploader.getSelected();
    }
    if(activeFeature === this.searchTitle) {
      return this.coverSearcher.getSelected();
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


class Tabs {
  constructor(parent, values = [], opts = {}) {
    this.parent = parent;
    this.values = values;
    this.tabs = {};
    this.buttonHolderClass = opts.buttonHolderClass || 'tabs-buttons-holder';
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
    this.mainHolder.appendChild(this.buttonHolder);
    this.mainHolder.appendChild(this.tabsHolder);
    this.parent.appendChild(this.mainHolder);
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
    this.actionScript = opts.actionScript;
    this.options = this.fetchOptions();
    this.mainHolderClass = opts.mainHolderClass || 'insert-line-book-select';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || 'radio-button-checkmark';
    this.checkBoxLabelClass = opts.checkBoxLabelClass || 'radio-button-container';
    this.titleClassName = opts.titleClassName || 'main-title-cbox';
    this.toggleBodyClass = opts.toggleBodyClass || 'hide-div';
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
    this.checkbox.onchange = () => {
      if(this.checkbox.checked) {
        this.showDiv();
      } else {
        this.hideDiv();
      }
    };
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
    if(this.withFilter) {
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
    this.select = document.createElement('SELECT');
    p.innerHTML = this.selectName;
    this.toggleBody.appendChild(p);
    this.toggleBody.appendChild(this.select);
    this.addSelectOptions();
    this.returns.push({
      name: 'value',
      inp: this.select
    });
  }

  get() {
    if(!this.checkbox.checked) {//not selected
      return null;
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
    let optionsStr = '<option value="">-- SELECT --</option>';
    Promise.resolve(this.options).then((opts) => {
      opts.forEach((opt) => {
        optionsStr += `<option value="${opt.id}">${opt.text}</option>`;
        this.select.innerHTML = optionsStr;
      });
    });
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
    this.errorIsShown = false;
    this.build();
    this.activate();
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


  activate() {
    this.btn.onclick = () => {
      if(!this.checkParamsCallback()) {
        this.setError(this.checkParamsErrorMessage);
        return;
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

  fillInputs(values) {
    for(let val in this.inputsToFill) {
      if(val in values) {
        this.inputsToFill[val].value = values[val];
      }
    }

    if(values.collection && values.collection.length && this.collectionPointer) {
      this.collectionPointer.clearStories();//clear prev. stories
      values.collection.forEach(a => this.collectionPointer.newStoryTitle(a));
    }
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
