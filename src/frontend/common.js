function validValue(val) {
  return isString(validValue) ? val.trim() : val;
}

function isString(a) {
  return typeof a === 'string';
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

class StoriesCollection {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.stories = {};//each story has a unique ID key (internal use) and story json as value
    this.storiesInProcess = {};//same as this.stories but not saves stories
    this.nextUniqueId = 0;//stories will ask for unique ID, save here
    this.decodePicUrl = "/decodePicture";
    this.checkBoxSpanClass = opts.checkBoxSpanClass || "radio-button-checkmark";
    this.checkBoxLabelClass = opts.checkBoxSpanClass || "radio-button-container";
    this.mainDivClass = opts.mainDivClass || "hide-div";
    this.optionPanelButtonsClass = opts.optionPanelButtonsClass || "black-white-button";
    this.hiddenFileUploaderClass = opts.hiddenFileUploaderClass || "hidden-file-uploader";
    this.storiesHolderClass = opts.storiesHolderClass || "collection-stry-holder";
    this.optionsPanelClass = opts.optionsPanelClass || "collection-stories-options";
    this.checkBoxTextClass = opts.checkBoxTextCkass || "main-title-cbox";
    this.folderPicsHolderClass = opts.folderPicsHolderClass || 'folder-pictures-holder';
    this.folderPicturesCloseButtonHolder = opts.folderPicturesCloseButtonHolder || 'folder-pictures-holder-close-button-holder';
    this.folderPictureImageHolderClass = opts.folderPictureImageHolderClass || 'folder-pictures-holder-single-pic-holder';
    this.folderPicsHolderMainClass = opts.folderPicsHolderMainClass || 'folder-pictures-holder-main';
    this.loaderMessageClass = opts.loaderMessageClass || 'loader-p-text';
    this.mainPagesInput = opts.pagesInput || null;
    this.mainAuthorInput = opts.mainAuthorInput || null;
    this.lastPageInCaseOfCollectionDecoder = null;//in cases when 2 content pages are used, save last one page here, so first in next page will calculate pages value using this value
    this.dragable = null;
    this.build();
  }

  get() {
    if(!this.checkBox.checked || this.noSavedStories()) {
      return null;
    }
    let output = [];
    for(let k in this.stories) {
      output.push({
        title: this.stories[k].title,
        pages: this.stories[k].pages,
        author: this.stories[k].author,
        cover: this.stories[k].pointer.getCover()
      });
    }
    return output;
  }

  noSavedStories() {
    return Object.keys(this.stories).length === 0;
  }

  clearStories() {
    this.stories = {};
    this.storiesInProcess = {};
    this.storiesHolder.innerHTML = '';
    this.lastPageInCaseOfCollectionDecoder = null;
  }

  getUniqueID() {
    return ++ this.nextUniqueId;
  }

  setStoryInProcess(id, pointer) {
    delete this.stories[id];
    this.storiesInProcess[id] = pointer;
  }

  deleteStory(id) {
    delete this.stories[id];
    delete this.storiesInProcess[id];
  }

  saveNewStory(storyData) {
    delete this.storiesInProcess[storyData.id];//remove from in process object
    this.stories[storyData.id] = {
      title: storyData.title,
      pages: storyData.pages,
      author: storyData.author,
      pointer: storyData.pointer
    };
  }

  checkIfStoryExists(storyData) {
    for(let val in this.stories) {
      if(val != storyData.id) {//this is not the same one been updated
        if(this.insensitiveCompare(this.stories[val].title, storyData.title) && this.insensitiveCompare(this.stories[val].author, storyData.author)) {
          return true;
        }
      }
    }
    return false;
  }

  insensitiveCompare(a,b) {
    if(typeof a === 'boolean' ||  typeof b === 'boolean') {//in case of booleans
      return a === b;
    }
    return a.toLowerCase().trim() === b.toLowerCase().trim();
  }

  build() {
    this.makeSkeleton();
    this.activate();
  }

  activate() {
    this.toggleFeatureOnCheckboxChanges();
    this.triggerFileUploaderOnButtonClick();
    this.handleTableImport();
    this.clearStoriesOnclick();
    this.triggerFolderUploaderOnButtonClick();
    this.handleFolderSelection();
    this.clearFolderPicturesOnclick();
    this.assertFolderPicturesOnclick();
    this.addStoryOnclick();
    this.triggerDecoderploaderOnButtonClick();
    this.handlePicDecoding();
    this.handleStoriesCoverSearch();
    this.handleSaveAllClick();
  }

  handleStoriesCoverSearch() {
    this.findCoversBtn.onclick = () => {
      for(let o in this.stories) {//search in all saved stories
        this.stories[o].pointer.searchForCover();
      }
      for(let o in this.storiesInProcess) {//search in all not saved stories
        this.storiesInProcess[o].searchForCover();
      }
    };
  }

  triggerDecoderploaderOnButtonClick() {
    this.decodeButton.onclick = () => {
      this.fileUploaderDecoder.click();
    };
  }

  handlePicDecoding() {
    this.fileUploaderDecoder.onchange = (e) => {
      if(this.fileUploaderDecoder.files) {
        this.askServerToDecodePicture();
      }
    };
  }

  clearPictureDecoderFileInput() {
    this.fileUploaderDecoder.value = '';
  }

  async askServerToDecodePicture() {
    const formData = new FormData();
    formData.append('file', this.fileUploaderDecoder.files[0]);
    const settings = {
      method: 'POST',
      body: formData
      //headers: { 'Content-Type': 'application/json' }
    };
    this.clearPictureDecoderFileInput();
    this.showMainLoader();
    let request = await doHttpRequest(this.decodePicUrl, settings);
    this.hideMainLoader();
    if(!request) {//error from server
      return;
    }
    request.forEach((bookElement, index) => {//iterate books and make story elements

      new Story(this.storiesHolder, {
        values: {
          name: bookElement.name,
          /*calculate pages by checking when next story starts if this is not the last element
          if this is the last element:
          if number of pages is set for this book - use it - if not set default value 0
          */
          pages: this.calculatePagesNumInStory(bookElement.page,  index + 1 !== request.length ? request[index + 1].page : null),
          author: false
        },
        collectionPointer: this,
        authorInput: this.mainAuthorInput
      });

    });
    //save last one page here, so first in next page decoded (if any) will calculate pages value using this value
    this.lastPageInCaseOfCollectionDecoder = request[request.length - 1].page;
  }

  getLastBookPageValue(currVal) {
    //check if a page was decoded (and current value is bigger - if not check in the pages inp) - if so use last line page as the prev. value
    if(this.lastPageInCaseOfCollectionDecoder && this.toInt(currVal) >= this.toInt(this.lastPageInCaseOfCollectionDecoder)) {
      return this.lastPageInCaseOfCollectionDecoder;
    }
    //if pages value is set take it as last page in book
    if (this.mainPagesInput && this.mainPagesInput.value) {
      return this.mainPagesInput.value;
    }
    return null;
  }

  calculatePagesNumInStory(storyPages, nextStoryPages) {
    const defaultVal = 0;
    if(nextStoryPages === null) {//if no nextstorypages - this is the last one in collection - get last page if exists
      nextStoryPages = this.getLastBookPageValue(storyPages);
    }

    if(nextStoryPages && this.isNumber(storyPages) && this.isNumber(nextStoryPages)) {
      if(this.toInt(nextStoryPages) >= this.toInt(storyPages)) {
        return nextStoryPages - storyPages || "1";//if starts and ends in same page it will be 0 - convert to 1
      }
    }
    return defaultVal;
  }

  toInt(z) {
    return parseInt(z, 10);
  }

  isNumber(z) {
    return /^[0-9]+$/.test(z);
  }

  handleFolderSelection() {
    this.folderUploader.onchange = (e) => {
      if(this.folderUploader.files) {
        this.doClearFolderPicturesHolder();//clear old pictures
        this.makeFolderPicturesView();
      }
    };
  }

  handleTableImport() {
    this.fileUploader.onchange = (e) => {
      let fileReader = new FileReader();
      fileReader.onload = (loadEvt) => {
        this.decodeStoriesTable(loadEvt.target.result);
      };
      fileReader.readAsBinaryString(this.fileUploader.files[0]);
    };
  }

  decodeStoriesTable(rawData) {
    let xlData = XLSX.read(rawData, {type : 'binary'}),
    firstSheetName = xlData.SheetNames[0];
    xlData = XLSX.utils.sheet_to_row_object_array(xlData.Sheets[firstSheetName]);
    //array of 0 => story name, 1 => pages, 2 => author (if not exists will be set to collection author)
    xlData = xlData.map(a => Object.values(a).slice(0,3));
    xlData = xlData.filter(a => a.length >= 2);//at least 2
    this.bulkInsertStories(xlData);
  }

  getFolderFiles() {
    return [...this.folderUploader.files].filter(a => /^image/.test(a.type)).sort((a, b) => {
      return parseInt(a.name).toString().localeCompare(parseInt(b.name).toString(), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }

  makeFolderPicturesView() {
    this.showFolderHolder();
    let readers = [],
    files =  this.getFolderFiles();

    for(let i = 0 , l = files.length ; i < l ; i ++ ) {
      readers.push(new FileReader());
      readers[readers.length - 1].onload = (evt) => {
        this.addPictureToFolderHolder(evt.target.result, files[i].name);
      };
      readers[readers.length - 1].readAsDataURL(files[i]);
    }
  }

  removeExtensionFromFileName(a) {
    a = a.split('.');
    a.pop();
    return a.join('.');
  }

  addPictureToFolderHolder(src,fileName) {
    fileName = this.removeExtensionFromFileName(fileName);
    let imgHolder = document.createElement('DIV'),
    img = document.createElement('IMG'),
    title = document.createElement('P');
    imgHolder.className = this.folderPictureImageHolderClass;
    img.src = src;
    title.innerHTML = fileName;
    imgHolder.appendChild(title);
    imgHolder.appendChild(img);
    this.folderPicsHolder.appendChild(imgHolder);
    this.makeDragablePicture(img);
  }

  makeDragablePicture(img) {
    //make a copy and drag it, the original copy will not move
    img.onmousedown = (e) => {//make the clone
      e.preventDefault();
      e.stopPropagation();
      if(e.which === 1) {//left click
        this.createPictureClose(e,img);
        this.startDragable();
      }
    };
  }

  startDragable() {
    window.onmousemove = (e) => {//element move
      this.dragable.style.left = `${e.clientX-this.dragable.width*0.5}px`;
      this.dragable.style.top = `${e.clientY-this.dragable.height*0.5}px`;
      window.storyIsCurrentlyDragged = true;
    };

    window.onmouseup = () => {//element released
      //remove cloned element and remove window listeners
      this.dragable.remove();
      this.dragable = null;
      window.onmousemove = null;
      window.onmouseup = null;
      setTimeout(() => {//turn off, first preceed with the mouse event on endpoint
        window.storyIsCurrentlyDragged = false;
      },0);
    };
  }

  createPictureClose(event, pic) {
    this.dragable = pic.cloneNode();
    document.body.appendChild(this.dragable);
    this.dragable.style.cssText = `width:${pic.width}px;height:${pic.height}px;position: fixed; opacity:0.8;`;
    this.dragable.style.left = `${event.clientX-pic.width * 0.5}px`;
    this.dragable.style.top = `${event.clientY-pic.height * 0.5}px`;
  }

  triggerFolderUploaderOnButtonClick() {
    this.selectPictureFolderButton.onclick = () => {
      this.folderUploader.click();
    };
  }

  makePictureFolderSelector() {
    this.folderUploader = document.createElement('INPUT');
    this.folderUploader.type = 'file';
    this.folderUploader.className = this.hiddenFileUploaderClass;
    this.folderUploader.webkitdirectory = true;
    this.folderUploader.multiple = true;
    this.optionPanel.appendChild(this.folderUploader);
  }

  makeSkeleton() {
    this.buildCheckbox("Collection of Stories:");
    this.makeMainHolder();
    this.makeOptionsPanel();
    this.makeMainLoader();
    this.makePicturesFolderHolder();
    this.makeStoriesHolder();
  }

  makeMainLoader() {
    this.mainLoader = new Loader(this.mainHolder, {
      message: 'Decoding Picture',
      messageClass: this.loaderMessageClass
    });
    this.mainLoader.build();
    this.hideMainLoader();
  }

  hideMainLoader() {
    this.mainLoader.hide();
  }

  showMainLoader() {
    this.mainLoader.show();
  }

  makeStoriesHolder() {
    this.storiesHolder = document.createElement('DIV');
    this.storiesHolder.className = this.storiesHolderClass;
    this.mainHolder.appendChild(this.storiesHolder);
  }

  makePicturesFolderHolder() {
    let headerTitle = document.createElement('P'),
    btnHolder = document.createElement('DIV');
    headerTitle.innerHTML = 'Pictures From Selected Folder';
    this.folderHeaderMain = document.createElement('DIV');
    this.folderHeaderMain.className = this.folderPicsHolderMainClass;
    this.folderPicsHolder = document.createElement('DIV');
    this.folderPicsHolder.className = this.folderPicsHolderClass;
    this.folderPicsHolderCloseButton = document.createElement('BUTTON');
    this.folderPicsHolderCloseButton.type = 'button';
    this.folderPicsHolderCloseButton.innerHTML = 'Clear';
    this.folderPicsHolderAssertButton = document.createElement('BUTTON');
    this.folderPicsHolderAssertButton.type = 'button';
    this.folderPicsHolderAssertButton.innerHTML = 'Order Asert';
    this.folderPicsHolderCloseButton.className = this.optionPanelButtonsClass;
    this.folderPicsHolderAssertButton.className = this.optionPanelButtonsClass;
    this.folderPicsHolderAssertButton.style.marginLeft = '15px';
    btnHolder.className = this.folderPicturesCloseButtonHolder;
    this.folderHeaderMain.appendChild(headerTitle);
    this.folderHeaderMain.appendChild(btnHolder);
    btnHolder.appendChild(this.folderPicsHolderCloseButton);
    btnHolder.appendChild(this.folderPicsHolderAssertButton);
    this.folderHeaderMain.appendChild(this.folderPicsHolder);
    this.mainHolder.appendChild(this.folderHeaderMain);
  }

  assertFolderPicturesOnclick() {
    this.folderPicsHolderAssertButton.onclick = () => {
      let savedAsWell = confirm('Do you want to overwrite covers in saved stories as well?'),
      storiesToWorkWith = [];

      for(let o in this.storiesInProcess) {//not saved surly will receive cover
        storiesToWorkWith.push({
          id: o,
          pointer: this.storiesInProcess[o]
        });
      }

      if(savedAsWell) {//user asked for saves as well
        for(let o in this.stories) {
          storiesToWorkWith.push({
            id: o,
            pointer: this.stories[o].pointer
          });
        }
      }

      //sort by id
      storiesToWorkWith = storiesToWorkWith.sort((a, b) => {
        return a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      });
      let imagesFromFolder = [...this.folderPicsHolder.getElementsByTagName('IMG')],
      arrLength = Math.min(imagesFromFolder.length, storiesToWorkWith.length),//loop until the smallest array ends
      counter = 0;
      while(counter < arrLength) {
        storiesToWorkWith[counter].pointer.setCover(imagesFromFolder[counter].src);
        storiesToWorkWith[counter].pointer.remoteSave();
        counter ++;
      }
    };
  }

  handleSaveAllClick() {
    this.saveAllBtn.onclick = () => {
      for(let o in this.storiesInProcess) {
        this.storiesInProcess[o].sendSaveCommand();
      }
    };
  }

  clearFolderPicturesOnclick() {
    this.folderPicsHolderCloseButton.onclick = () => {
      this.doClearFolderPicturesHolder();
      this.folderUploader.value = '';
    };
  }

  doClearFolderPicturesHolder() {
    this.folderPicsHolder.innerHTML = '';
    this.hideFolderHolder();
  }

  hideFolderHolder() {
    this.folderHeaderMain.style.display = 'none';
  }

  showFolderHolder() {
    this.folderHeaderMain.style.display = 'block';
  }


  makeOptionsPanel() {
    this.optionPanel = document.createElement('DIV');
    this.optionPanel.className = this.optionsPanelClass;
    this.mainHolder.appendChild(this.optionPanel);

    this.clearButton = this.makeButton('Clear All', "Clear all Stories");
    this.importTableButton = this.makeButton('Import Table', "Import a table of stories");
    this.makeHiddenFileUploader();
    this.selectPictureFolderButton = this.makeButton('Select Pictures Folder', "Import a Covers folder");
    this.makePictureFolderSelector();
    this.decodeButton = this.makeButton('Decode Contents Picture', "Decode Stories from content page");
    this.makeHiddenFileUploaderDecoder();
    this.addStoryButton = this.makeButton('Add Story', "Add a new story");
    this.findCoversBtn = this.makeButton('Find Covers', "Find cover to all stories");
    this.saveAllBtn = this.makeButton('Save All Stories', "Save all unsaved Stories");
  }

  makeHiddenFileUploaderDecoder() {
    this.fileUploaderDecoder = document.createElement('INPUT');
    this.fileUploaderDecoder.type = 'file';
    this.fileUploaderDecoder.className = this.hiddenFileUploaderClass;
    this.fileUploaderDecoder.setAttribute('accept', 'image/*');
    this.optionPanel.appendChild(this.fileUploaderDecoder);
  }

  makeHiddenFileUploader() {
    this.fileUploader = document.createElement('INPUT');
    this.fileUploader.type = 'file';
    this.fileUploader.className = this.hiddenFileUploaderClass;
    this.fileUploader.setAttribute('accept', '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel');
    this.optionPanel.appendChild(this.fileUploader);
  }

  makeButton(txt, title = null) {
    let b = document.createElement('BUTTON');
    b.type = 'button';
    if(title) {
      b.title = title;
    }
    b.className = this.optionPanelButtonsClass;
    b.innerHTML = txt;
    this.optionPanel.appendChild(b);
    return b;
  }

  makeMainHolder() {
    this.mainHolder = document.createElement('DIV');
    this.mainHolder.className = this.mainDivClass;
    this.parent.appendChild(this.mainHolder);
  }

  buildCheckbox(txt) {
    let div = document.createElement('DIV'),
    label = document.createElement('LABEL'),
    span = document.createElement('SPAN'),
    p = document.createElement('P');
    p.className = this.checkBoxTextClass;
    this.checkBox = document.createElement('INPUT');
    this.checkBox.type = 'checkbox';
    p.innerHTML = txt;
    span.className = this.checkBoxSpanClass;
    label.className = this.checkBoxLabelClass;
    div.appendChild(label);
    label.appendChild(this.checkBox);
    label.appendChild(span);
    div.appendChild(p);
    this.parent.appendChild(div);
  }

  toggleFeatureOnCheckboxChanges() {
    this.checkBox.onchange = (e) => {
      if(this.checkBox.checked) {
        this.show();
      } else {
        this.hide();
      }
    };
  }

  showCollection() {
    this.checkBox.checked = true;
    this.show();
  }

  triggerFileUploaderOnButtonClick() {
    this.importTableButton.onclick = () => {
      this.fileUploader.click();
    };
  }

  clearStoriesOnclick() {
    this.clearButton.onclick = () => {
      this.clearStories();
    };
  }

  addStoryOnclick() {
    this.addStoryButton.onclick = () => {
      new Story(this.storiesHolder, {
        collectionPointer:this,
        authorInput: this.mainAuthorInput
      });
    };
  }

  bulkInsertStories(stories) {
    //array of 0 => story name, 1 => pages, 2 => author (if not exists will be set to collection author)
    stories.forEach(a => this.addStoryWithValues(a));
  }

  addStoryWithValues(storyData) {
    //array of 0 => story name, 1 => pages, 2 => author (if not exists will be set to collection author)
    new Story(this.storiesHolder, {
      values: {
        name: storyData[0],
        pages: storyData[1],
        author: storyData[2] || false
      },
      collectionPointer: this,
      authorInput: this.mainAuthorInput
    });
  }

  newStoryTitle(title) {
    this.showCollection();
    new Story(this.storiesHolder, {
      values: {
        name: title,
        pages: '',
        author: false
      },
      collectionPointer: this,
      authorInput: this.mainAuthorInput
    });
  }

  show() {
    this.mainHolder.style.display = 'block';
  }

  hide() {
    this.mainHolder.style.display = 'none';
  }
}

class Story {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.collectionPointer = opts.collectionPointer;
    this.title = '';
    this.author = '';
    this.pages = '';
    this.cover = '';
    this.id = '';
    this.saved = false;
    this.errorIsShown = false;
    this.storyClass = opts.storyClass || 'collection-single-story-holder';
    this.inputLineClass = opts.inputLineClass || 'collection-story-line';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || "radio-button-checkmark";
    this.checkBoxLabelClass = opts.checkBoxSpanClass || "radio-button-container";
    this.saveButtonClass = opts.saveButtonClass || 'black-white-button';
    this.editButtonClass = opts.editButtonClass || 'black-white-button';
    this.titleClass = opts.titleClass || "story-single-title";
    this.closeButtonHolderClass = opts.closeButtonHolderClass || "close-single-story";
    this.editButtonHolderClass = opts.editButtonHolderClass || "edit-single-story";
    this.errorClass = opts.errorClass || 'story-single-error-div';
    this.linePermanentClass = opts.linePermanentClass || 'story-single-line-permanent-p';
    this.permanentCoverClass = opts.permanentCoverClass || 'super-mini-pic';
    this.mainAuthorInput = opts.authorInput || null;
    this.permanentLines = [];
    this.build();
    this.activate();
    this.listenToDrops();//a image may be dropped
    this.askCollectionForUniqueID();//generate unique ID
    this.declareStoryInProcess();
    if(opts.values) {
      this.autoLoadStory(opts.values);
    }
  }

  getCover() {
    return this.cover;
  }

  declareStoryInProcess() {
    this.collectionPointer.setStoryInProcess(this.id, this);
  }

  listenToDrops() {
    this.body.onmouseenter = (e) => {
      if(e.fromElement && e.which === 0 && window.storyIsCurrentlyDragged && e.fromElement.nodeName === 'IMG') {//pic was droped, mouse is not clicked - add it to cover holder
        this.addCover(e.fromElement.src);
      }
    }
  }

  build() {
    this.body = document.createElement('DIV');
    this.body.className = this.storyClass;
    this.parent.appendChild(this.body);
    this.makeHeader();
    this.makeTitle();
    this.titleInput = this.makeNormalInput('Title:');
    this.pagesInput = this.makeNormalInput('Pages:', {type:'number'});
    this.makeAuthorInput();
    this.makeCoverSelector();
    this.makeSaveButton();
    this.makeErrorDiv();
  }

  hideCoverSelector() {
    this.coverSelector.hide();
  }

  showCoverSelector() {
    this.coverSelector.show();
  }

  getSelectedCover() {
    return this.coverSelector.getSelected();
  }

  makeCoverSelector() {
    this.coverSelector = new CoverSelector(this.body,{
      getSearchCoverParamsCallback: () => {
        return {
          isbn: null,
          author: this.authorCheckBox.checked ? this.mainAuthorInput.value : this.authorInput.value,
          title: this.titleInput.value
        };
      },
      selectedImageClassForUploder: 'super-mini-pic',
      title: 'Cover',
      buttonHolderTableCoverSelectorClass: 'tabs-buttons-holder-mini',
      coverSelectorSelectMessageClassForce: {
        width: '100%',
        margin: '0 auto',
        'font-size': '20px',
        'text-align': 'center',
        'margin-top': '10px'
      }
    });
  }

  addCover(src) {
    this.coverSelector.sendFileSrcToUploader(src);
  }

  listenToEditButton() {
    this.editButton.onclick = () => {
      this.saved = false;
      this.declareStoryInProcess();
      this.hideEditButton();
      this.removePermanentCover();
      this.showCoverSelector();
      this.cancelPermanentStory();
    };
  }

  searchForCover() {
    if(this.saved) {//if book saved - unsave it - edit buttonn click
      this.editButton.click();
    }
    this.coverSelector.search();
  }

  setCover(src) {
    if(this.saved) {//if book saved - unsave it - edit buttonn click
      this.editButton.click();
    }
    this.addCover(src);
  }

  save() {
    this.saveDataVariables();
    this.hideCoverSelector();
    this.sendDataToCollection();
    this.saved = true;
    this.showEditButton();
    this.makePermanentStory();
    this.makePermanentCover();
  }

  cancelPermanentStory() {
    this.showInputHolder(this.titleInput);
    this.showInputHolder(this.pagesInput);
    this.showAuthorHolder();
    this.showSaveButton();
    this.returnErrorDiv();
    this.mainTitle.innerHTML = "Edit - " + this.title;
    this.clearPermanentLines();
  }

  clearPermanentLines() {
    this.permanentLines.forEach(a => a.remove());
    this.permanentLines.length = 0;
  }

  makePermanentCover() {
    this.permanentCover = document.createElement('IMG');
    this.permanentCover.src = this.cover;
    this.permanentCover.className = this.permanentCoverClass;
    this.body.appendChild(this.permanentCover);
  }

  removePermanentCover() {
    this.permanentCover.remove();
  }

  makePermanentStory() {
    this.removeInputHolder(this.titleInput);//remove title holder - title story is div title
    this.removeInputHolder(this.pagesInput);//remove pages holder - pages will be saved as P
    this.removeAuthorHolder();//remove author holder - will be saved as P
    this.removeSaveButton();
    this.killErrorDiv();//no more need for error displaier
    this.mainTitle.innerHTML = this.title;//change div title to be as story
    this.saveAsLine(`Pages: ${this.pages}`);
    this.saveAsLine(`Author: ${this.author ? this.author : 'Same as Collection'}`);
  }

  saveDataVariables() {
    this.title = this.titleInput.value.trim();
    this.pages = this.pagesInput.value.trim();
    this.author = this.authorCheckBox.checked ? false : this.authorInput.value.trim();
    this.cover = this.getSelectedCover();
  }

  saveAsLine(txt) {
    let p = document.createElement('P');
    p.innerHTML = txt;
    this.forceCSS(p, 'width', '100%');
    p.className = this.linePermanentClass;
    this.body.appendChild(p);
    this.permanentLines.push(p);
  }

  sendDataToCollection() {
    this.collectionPointer.saveNewStory({
      id: this.id,
      title: this.title,
      pages: this.pages,
      author: this.author,
      pointer: this
    });
  }

  sendCollectionStoryDeletedMessage() {
    this.collectionPointer.deleteStory(this.id);
  }

  askCollectionForUniqueID() {
    this.id = this.collectionPointer.getUniqueID();
  }

  askCollectionIfStoryIsRepeated(data) {
    return this.collectionPointer.checkIfStoryExists(data);
  }

  activate() {
    this.listenToCloseButton();
    this.listenToSaveButton();
    this.listenToEditButton();
  }

  removeInputHolder(a) {
    a.parentNode.style.display = 'none';
  }

  showInputHolder(a) {
    a.parentNode.style.display = 'block';
  }

  makeErrorDiv() {
    this.errorDiv = document.createElement('DIV');
    this.errorDiv.className = this.errorClass;
    this.body.appendChild(this.errorDiv)
  }

  returnErrorDiv() {
    this.errorDiv.style.opacity = 1;
  }

  killErrorDiv() {
    this.errorDiv.style.opacity = 0;
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

  autoLoadStory(values) {
    this.titleInput.value = values.name;
    this.pagesInput.value = values.pages;
    if(values.author) {
      this.authorCheckBox.checked = false;
      this.authorInput.value = values.author
    }
    this.prepareToSaveStory();
  }

  remoteSave() {
    this.prepareToSaveStory();
  }

  prepareToSaveStory() {
    this.hideError();
    if(! this.validate() ) {
      this.setError('Please fill all inputs');
      return;
    }
    if( this.askCollectionIfStoryIsRepeated({
      id: this.id,
      title: this.titleInput.value,
      pages: this.pagesInput.value,
      author: this.authorCheckBox.checked ? false : this.authorInput.value
    }) ) {
      this.setError('Repeated Story');
      return;
    }
    this.save();
  }

  sendSaveCommand() {
    if(!this.saved) {
      this.prepareToSaveStory();
    }
  }

  listenToSaveButton() {
    this.saveButton.onclick = () => {
      this.prepareToSaveStory();
    };
  }

  validate() {
    return this.validInputValue(this.titleInput) && this.validInputValue(this.pagesInput) && ( this.authorCheckBox.checked || this.validInputValue(this.authorInput) );
  }

  validInputValue(inp) {
    return inp.value.trim() !== '';
  }

  listenToCloseButton() {
    this.closeButton.onclick = () => {
      this.kill();
    };
  }

  makeHeader() {
    this.headerDiv = document.createElement('DIV');
    this.body.appendChild(this.headerDiv);
    this.makeEditButton();
    this.makeCloseButton();
  }

  makeEditButton() {
    let holder = document.createElement('DIV');
    this.editButton = document.createElement('BUTTON');
    this.editButton.type = 'button';
    this.editButton.innerHTML = 'Edit';
    holder.className = this.editButtonHolderClass;
    this.editButton.className = this.editButtonClass;
    this.headerDiv.appendChild(holder);
    holder.appendChild(this.editButton);
  }

  showEditButton() {
    this.editButton.parentNode.style.display = 'inline-block';
  }

  hideEditButton() {
    this.editButton.parentNode.style.display = 'none';
  }

  makeCloseButton() {
    let holder = document.createElement('DIV');
    this.closeButton = document.createElement('BUTTON');
    this.closeButton.type = 'button';
    this.closeButton.innerHTML = 'X';
    holder.className = this.closeButtonHolderClass;
    this.headerDiv.appendChild(holder);
    holder.appendChild(this.closeButton);
  }

  makeTitle() {
    this.mainTitle = document.createElement('P');
    this.mainTitle.innerHTML = 'New Story';
    this.mainTitle.className = this.titleClass;
    this.forceCSS(this.mainTitle, 'width', '100%') ;
    this.body.appendChild(this.mainTitle);
  }


  showSaveButton() {
    this.saveButton.style.display = 'inherit';
  }

  removeSaveButton() {
    this.saveButton.style.display = 'none';
  }

  makeSaveButton() {
    this.saveButton = document.createElement('BUTTON');
    this.saveButton.className = this.saveButtonClass;
    this.saveButton.innerHTML = 'Save';
    this.saveButton.type = 'button';
    this.body.appendChild(this.saveButton);
  }

  makeNormalInput(txt,opts = {}) {
    let inp = document.createElement('INPUT'),
    title = document.createElement('P'),
    holder = opts.parent ? opts.parent : document.createElement('DIV');
    inp.type = opts.type ? opts.type : 'text';
    holder.className = this.inputLineClass;
    title.innerHTML = txt;
    holder.appendChild(title);
    holder.appendChild(inp);
    this.body.appendChild(holder);
    return inp;
  }

  forceCSS(el, attribute, value) {
    el.setAttribute('style', `${el.getAttribute('style') || ''};${attribute}:${value} !important`);
  }

  showAuthorHolder() {
    this.authorMainHolder.style.display = 'block';
    this.showInputHolder(this.authorInput);
    this.checkBoxAuthorHolder.style.display = 'block';
  }

  removeAuthorHolder() {
    this.authorMainHolder.style.display = 'none';
    this.removeInputHolder(this.authorInput);
    this.checkBoxAuthorHolder.style.display = 'none';
  }

  makeAuthorInput() {
    this.authorMainHolder = document.createElement('DIV');
    this.authorInputHolder = document.createElement('DIV');
    this.body.appendChild(this.authorMainHolder);
    this.authorMainHolder.appendChild(this.authorInputHolder);
    this.buildCheckbox("Author as Collection Author", this.authorMainHolder);
    this.authorInput = this.makeNormalInput("Author:", {parent:this.authorInputHolder});
    this.hideAuthorInput();//hidden by default
    this.hanleAuthorCheckbox();
  }

  hanleAuthorCheckbox() {
    this.authorCheckBox.onchange = () => {
      if(this.authorCheckBox.checked) {
        this.hideAuthorInput();
      } else {
        this.showAuthorInput();
      }
    };
  }

  hideAuthorInput() {
    this.authorInputHolder.style.visibility = 'hidden';
  }

  showAuthorInput() {
    this.authorInputHolder.style.visibility = 'visible';
  }

  buildCheckbox(txt, parent) {
    this.checkBoxAuthorHolder = document.createElement('DIV');
    let label = document.createElement('LABEL'),
    span = document.createElement('SPAN'),
    p = document.createElement('P');
    this.authorCheckBox = document.createElement('INPUT');
    this.authorCheckBox.type = 'checkbox';
    this.authorCheckBox.checked = true;
    this.forceCSS(p, 'width', 'max-content');
    this.forceCSS(p, 'font-size', '17px');
    p.innerHTML = txt;
    span.className = this.checkBoxSpanClass;
    label.className = this.checkBoxLabelClass;
    this.checkBoxAuthorHolder.appendChild(label);
    label.appendChild(this.authorCheckBox);
    label.appendChild(span);
    this.checkBoxAuthorHolder.appendChild(p);
    parent.appendChild(this.checkBoxAuthorHolder);
  }

  kill() {
    this.sendCollectionStoryDeletedMessage();
    this.body.remove();
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

class CheckboxGroup {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.holderClass = opts.holderClass || 'checkbox-group';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || 'radio-button-checkmark';
    this.checkBoxLabelClass = opts.checkBoxLabelClass || 'radio-button-container';
    this.titleClassName = opts.titleClassName || 'main-title-cbox';
    this.checkboxesFromInput = opts.checkboxes || [];
    this.checkboxes = {};
    this.selected = '';
    this.build();
    this.activate();
  }

  build() {
    this.makeHolder();
    this.checkboxesFromInput.forEach(a => this.makeCheckbox(a.title, a.code));
  }

  activate() {
    this.allowOneCheckedAtAnyTime();
  }

  makeHolder() {
    this.mainHolder = document.createElement('DIV');
    this.mainHolder.classname = this.holderClass;
    this.parent.appendChild(this.mainHolder);
  }

  get() {
    return this.selected;
  }

  makeCheckbox(title, code) {
    let div = document.createElement('DIV'),
    label = document.createElement('LABEL'),
    span = document.createElement('SPAN'),
    p = document.createElement('P'),
    checkbox = document.createElement('INPUT');
    checkbox.type = 'checkbox';
    p.innerHTML = title;
    span.className = this.checkBoxSpanClass;
    label.className = this.checkBoxLabelClass;
    p.className = this.titleClassName;
    div.appendChild(label);
    label.appendChild(checkbox);
    label.appendChild(span);
    div.appendChild(p);
    this.mainHolder.appendChild(div);
    this.checkboxes[code] = checkbox;
  }

  setDefaultOne() {//check the first one
    this.getFirstCheckBox().checked = true;
  }

  getFirstCheckBox() {
    return this.checkboxes[Object.keys(this.checkboxes)[0]];
  }

  allowOneCheckedAtAnyTime() {
    for(let i in this.checkboxes) {
      this.checkboxes[i].onchange = (e) => {
        for(let j in this.checkboxes) {
          if(this.checkboxes[j] === e.target) {
            this.selected = j;
            this.checkboxes[j].checked = true;
          } else {
            this.checkboxes[j].checked = false;
          }
        }
      };
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
