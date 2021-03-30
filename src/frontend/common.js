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
    this.classCSS = 'bottom-loader';
    this.numberOfInnerDivs = 8;
    this.ops = ops;
  }

  build() {
    this.makeHolder();
    for(let i = 0 ; i < this.numberOfInnerDivs ; i ++ ) {
      this.makeEmptyDiv();
    }
    if(this.ops.message) {//make message p
      this.makeMessage();
    }
    this.post();
  }

  makeHolder() {
    this.holder = document.createElement('DIV');
    this.holder.className = this.classCSS;
  }

  makeMessage() {
    this.messageP = document.createElement('P');
    this.messageP.innerHTML = this.ops.message;
    if(this.ops.messageClass) {
      this.messageP.className = this.ops.messageClass;
    }
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
  }

  show() {
    this.holder.style.display = 'block';
    if(this.messageP) {
      this.messageP.style.display = 'block';
    }
  }

  delete() {
    this.holder.remove();
    if(this.messageP) {
      this.messageP.remove();
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
    this.image.onclick = () => {this.trigger()};
  }

  trigger(event) {
    new ConfirmWithPic({
      src: this.src,
      message: 'Are you sure you want to use this picture?',
      ok: 'Yes',
      cancel: 'No'
    }).make().then((res) => {
      this.selectResolver(this.src);
    }).catch((err) => {
      this.doNothing();
    });
  }

  doNothing() {}

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
    this.loaderMessage = opts.loaderMessage || 'Searching for you in the internet...';
    this.loaderClass = opts.loaderClass || 'loader-p-text';
    this.searchButtonClass = opts.searchButtonClass || 'black-white-button';
    this.selectMessageClass = opts.selectMessageClass || 'auto-search-select-message';
    this.selectedPictureClass = opts.selectedPictureClass || 'auto-search-selected-img';
    this.getSearchCoverParamsCallback = opts.getSearchCoverParamsCallback;
    this.selectedPicture = '';
    this.clickToSelectMessage = 'Click at the wanted cover';
    this.selectedImageMessage = 'Cover Selected';
    this.makeSearchButton();
    this.makeSelectMessage();
    this.makeLoader();
    this.listenToSearchClick();
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
      this.coversPromises.push(new Image(cvr,this.parent).build());
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
    this.hideSelectMessage();//hidden by default
    this.parent.appendChild(this.selectMessage);
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

  async fetchCovers() {
    let httpReq = '',
    requestBody = {},
    searchParams = this.getSearchCoverParamsCallback(),
    title = searchParams.title || null,
    isbn = searchParams.isbn || null,
    author = searchParams.author || null;
    if(this.emptyCoverSearchParam(title) && this.emptyCoverSearchParam(isbn) && this.emptyCoverSearchParam(author)) {
      this.alert('Please fill ISBN/Author/Title values');
      return;
    }
    if(this.emptyCoverSearchParam(title) && this.emptyCoverSearchParam(isbn)) {//can't search based on author only
      this.alert('Please fill ISBN/Title values');
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
    alert(m);
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
      messageClass: this.loaderClass
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

  makeSelectionMessage() {
    this.selectMessage = document.createElement('P');
    this.selectMessage.innerHTML = 'Cover Selected';
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

  handleFileInput() {
    this.inputFile.onchange = (e) => {
      if(!this.inputFile.files || !this.inputFile.files[0]) {
        return;//no files
      }
      let reader = new FileReader();
      reader.onload = (evt) => {
        this.showSelectMessage();
        this.addImage(evt.target.result);
      };
      reader.readAsDataURL(this.inputFile.files[0]);
    };
  }

  makeImageHolder() {
    this.image = document.createElement('IMG');
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

  addImage(img) {
    this.image.src = img;
    this.showImage();
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
    this.title = opts.title || 'Book Cover Picture';
    this.titleClass = opts.titleClass || 'main-title-insert';
    this.featuresHolderClass = opts.featuresHolderClass || 'insert-pic-body';
    this.coverUploaderClass = opts.coverUploaderClass || 'insert-pic-uploader';
    this.coverSearchClass = opts.coverSearchClass || 'auto-search-pic-uploader';
    this.checkBoxGroupClass = opts.checkBoxGroupClass || 'checkbox-group';
    this.checkBoxLabelClass = opts.checkBoxLabelClass || 'radio-button-container';
    this.checkBoxSpanClass = opts.checkBoxSpanClass || 'radio-button-checkmark';
    this.getSearchCoverParamsCallback = opts.getSearchCoverParamsCallback;
    this.selectedFeature = '';
    this.build();
  }

  build() {
    this.buildTitle();
    this.buildOptionChanger();
    this.buildActionHolder();
    this.makeFeatures();
    this.toggleFeatures();
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

  makeUploader() {
    let holder = document.createElement('DIV');
    holder.className = this.coverUploaderClass;
    this.featuresHolder.appendChild(holder);
    this.coverUploader = new CoverUploader(holder);
  }

  showUploader() {
    this.coverUploader.show();
  }

  hideUploader() {
    this.coverUploader.hide();
  }

  makeSearcher() {
    let holder = document.createElement('DIV');
    holder.className = this.coverSearchClass;
    this.featuresHolder.appendChild(holder);
    this.coverSearcher =  new CoverAutoSearch(holder, {
      getSearchCoverParamsCallback: this.getSearchCoverParamsCallback
    });
    this.hideSearcher();//default hidden
  }

  showSearcher() {
    this.coverSearcher.show();
  }

  hideSearcher() {
    this.coverSearcher.hide();
  }

  buildOptionChanger() {
    this.checkBoxHolder = document.createElement('DIV');
    this.checkBoxHolder.className = this.checkBoxGroupClass;
    this.parent.appendChild(this.checkBoxHolder);
    this.uploadCheckbox = this.buildCheckbox('Upload', true);
    this.searchCheckbox = this.buildCheckbox('Auto Search');
    this.selectedFeature = 'upload';//default one
  }

  toggleFeatures() {
    this.uploadCheckbox.onchange = () => {
      if(this.selectedFeature === 'upload') {//was turned off - ignore and turn on again - one feature can be changed by setecting the other
        this.uploadCheckbox.checked = true;
        return;
      }
      //change from auto search to upload
      this.searchCheckbox.checked = false;
      this.selectedFeature = 'upload';
      this.hideSearcher();
      this.showUploader();
    };
    this.searchCheckbox.onchange = () => {
      if(this.selectedFeature === 'search') {//was turned off - ignore and turn on again - one feature can be changed by setecting the other
        this.searchCheckbox.checked = true;
        return;
      }
      //change from auto search to upload
      this.uploadCheckbox.checked = false;
      this.selectedFeature = 'search';
      this.hideUploader();
      this.showSearcher();
    };
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
    let title = document.createElement('P');
    title.innerHTML = this.title;
    title.className = this.titleClass;
    this.parent.appendChild(title);
  }
}

class StoriesCollection {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.stories = {};//each story has a unique ID key (internal use) and story json as value
    this.nextUniqueId = 0;//stories will ask for unique ID, save here
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
    this.build();
  }

  getUniqueID() {
    return ++ this.nextUniqueId;
  }

  deleteStory(id) {
    delete this.stories[id];
  }

  saveNewStory(storyData) {
    this.stories[storyData.id] = {
      title: storyData.title,
      pages: storyData.pages,
      author: storyData.author
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
    this.clearStoriesOnclick();
    this.triggerFolderUploaderOnButtonClick();
    this.handleFolderSelection();
    this.clearFolderPicturesOnclick();
    this.addStoryOnclick();
  }

  handleFolderSelection() {
    this.folderUploader.onchange = (e) => {
      if(this.folderUploader.files) {
        this.doClearFolderPicturesHolder();//clear old pictures
        this.makeFolderPicturesView();
      }
    };
  }

  makeFolderPicturesView() {
    this.showFolderHolder();
    let readers = [];

    for(let i = 0 , l = this.folderUploader.files.length ; i < l ; i ++ ) {
      readers.push(new FileReader());
      readers[readers.length - 1].onload = (evt) => {
        this.addPictureToFolderHolder(evt.target.result, this.folderUploader.files[i].name);
      };
      readers[readers.length - 1].readAsDataURL(this.folderUploader.files[i]);
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
    this.makePicturesFolderHolder();
    this.makeStoriesHolder();
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
    this.folderPicsHolderCloseButton.className = this.optionPanelButtonsClass;
    btnHolder.className = this.folderPicturesCloseButtonHolder;
    this.folderHeaderMain.appendChild(headerTitle);
    this.folderHeaderMain.appendChild(btnHolder);
    btnHolder.appendChild(this.folderPicsHolderCloseButton);
    this.folderHeaderMain.appendChild(this.folderPicsHolder);
    this.mainHolder.appendChild(this.folderHeaderMain);
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

  clearStories() {
    this.stories = {};
    this.storiesHolder.innerHTML = '';
  }

  makeOptionsPanel() {
    this.optionPanel = document.createElement('DIV');
    this.optionPanel.className = this.optionsPanelClass;
    this.mainHolder.appendChild(this.optionPanel);

    this.clearButton = this.makeButton('Clear All');
    this.importTableButton = this.makeButton('Import Table');
    this.makeHiddenFileUploader();
    this.selectPictureFolderButton = this.makeButton('Select Pictures Folder');
    this.makePictureFolderSelector();
    this.addStoryButton = this.makeButton('Add Story');
  }

  makeHiddenFileUploader() {
    this.fileUploader = document.createElement('INPUT');
    this.fileUploader.type = 'file';
    this.fileUploader.className = this.hiddenFileUploaderClass;
    this.fileUploader.setAttribute('accept', '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel');
    this.optionPanel.appendChild(this.fileUploader);
  }

  makeButton(txt) {
    let b = document.createElement('BUTTON');
    b.type = 'button';
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
      new Story(this.storiesHolder, this);
    };
  }

  show() {
    this.mainHolder.style.display = 'block';
  }

  hide() {
    this.mainHolder.style.display = 'none';
  }
}

class Story {
  constructor(parent, collectionPointer, opts = {}) {
    this.parent = parent;
    this.collectionPointer = collectionPointer;
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
    this.permanentLines = [];
    this.build();
    this.activate();
    this.askCollectionForUniqueID();//generate unique ID
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
    this.makeSaveButton();
    this.makeErrorDiv();
  }

  listenToEditButton() {
    this.editButton.onclick = () => {
      this.hideEditButton();
      this.cancelPermanentStory();
    };
  }

  save() {
    this.saveDataVariables();
    this.sendDataToCollection();
    this.saved = true;
    this.showEditButton();
    this.makePermanentStory();
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
      author: this.author
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

  listenToSaveButton() {
    this.saveButton.onclick = () => {
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
    el.setAttribute('style', `${attribute}:${value} !important`);
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
    if(this.saved) {
      this.sendCollectionStoryDeletedMessage();
    }
    this.body.remove();
  }

}
