
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
        id: this.stories[k].id,
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
      pointer: storyData.pointer,
      id: storyData.storyExistingId//if this story already saved in DB (collection update)
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

  set(stories) {
    /*
    array of jsons
    name -> story name
    author -> story author or false/null (same author as collection)
    pages -> number of pages
    id -> story id (to search picture)
    */
    this.checkBox.click();//enable collection
    stories.forEach((stry) => {
      this.addStoryWithValues([stry.name, stry.pages, stry.author, stry.id], `/pic/stories/${stry.id}`);
    });
  }

  bulkInsertStories(stories) {
    //array of 0 => story name, 1 => pages, 2 => author (if not exists will be set to collection author)
    stories.forEach(a => this.addStoryWithValues(a));
  }

  addStoryWithValues(storyData, picSrc = false) {
    //array of 0 => story name, 1 => pages, 2 => author (if not exists will be set to collection author)
    //if picSrc is set - Story class should make a pic out of this link
    new Story(this.storiesHolder, {
      values: {
        name: storyData[0],
        pages: storyData[1],
        author: storyData[2] || false,
        id: storyData[3] || false
      },
      collectionPointer: this,
      authorInput: this.mainAuthorInput,
      defaultPic: picSrc ? picSrc : null
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
    this.storyExistingId = false;//if a collection is modified, save here the story ID (already saved in DB)
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
    this.defaultPic = opts.defaultPic || null;
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
    if(this.defaultPic) {
      this.coverSelector.set(this.defaultPic);
    }
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
    //by default  - use cover returned from cover handler, if empty ask for the default value if exists
    let cover = this.cover;
    if(!cover) {
      cover = this.coverSelector.getDefault();
    }
    this.permanentCover.src = cover;
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
      storyExistingId: this.storyExistingId,
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

    if(values.id) {//if this story is already saved in DB - save the id
      this.storyExistingId = values.id
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

class FileUploader {
  constructor(parent, opts = {}) {
    this.dz = parent;
    this.isShown = true;

    if(opts.autoHide) {
      this.hideAll();
      this.isShown = false;
    }

    this.holderClass = opts.holderClass || 'file-uploader-holder';
    this.mainTitleClass = opts.mainTitleClass || 'file-uploader-main-title-div';
    this.errorClass = opts.errorClass || 'file-uploader-main-error';
    this.titleClass = opts.titleClass || 'file-uploader-main-message';
    this.inputFileClass = opts.inputFileClass || 'hidden-file-uploader';
    this.fileViewClass = opts.fileViewClass || 'file-uploader-file-view';
    this.format = opts.format || '*';
    this.maxMB = opts.maxMB || null;
    this.errorIsShown = false;
    this.selectedFile = null;
    this.build();
    this.activate();
  }

  hideAll() {
    this.isShown = false;
    this.dz.parentNode.style.display = 'none';
  }

  showAll() {
    this.isShown = true;
    this.dz.parentNode.style.display = 'block';
  }

  isSet() {
    return this.isShown;
  }

  get() {
    if( ! this.isSet() ) {
      return;
    }
    return this.selectedFile;
  }

  build() {
    this.makeFileUploader();
    this.makeErrorBox();
    this.hideError();
    this.buildTitle();
    this.makeFileView();
  }

  acceptFile(file) {
    this.setFileView(file.name, file.size);
    this.clearInputFiles();
    this.saveFile(file);
  }

  saveFile(file) {
    this.selectedFile = file;
  }

  clearInputFiles() {
    this.inputFile.value = '';
  }

  listenToFileChange() {
    this.inputFile.onchange = () => {
      this.handleFiles(this.inputFile.files);
    };
  }

  makeFileView() {
    this.fileView = document.createElement('DIV');
    this.fileView.className = this.fileViewClass;
    let i = document.createElement('I');
    i.className = 'fa fa-file-pdf-o';
    this.fileName = document.createElement('P');
    this.fileSize = document.createElement('P');
    this.fileView.appendChild(i);
    this.fileView.appendChild(this.fileName);
    this.fileView.appendChild(this.fileSize);
    this.hideFileView();
    this.dz.appendChild(this.fileView);
  }

  hideFileView() {
    this.fileView.style.display = 'none';
  }

  showFileView() {
    this.fileView.style.display = 'block';
  }

  setFileView(name, size) {
    this.fileName.innerHTML = name;
    this.fileSize.innerHTML = this.toHumanSize(size);
    this.showFileView();
  }

  toHumanSize(e) {
    const KB = 1024, MB = 1048576, GB = 1073741824;

    if(e < KB) {
      return (e).toFixed(2) + 'B';
    }

    if(e >= KB && e < MB) {
      return (e/KB).toFixed(2) + 'KB';
    }

    if(e >= MB && e < GB) {
      return (e/MB).toFixed(2) + 'MB';
    }

    if(e >= GB) {
      return (e/GB).toFixed(2) + 'GB';
    }
  }

  activate() {
    this.activateDropZone();
    this.trigerInputOnTitleClick();
    this.listenToFileChange();
  }

  trigerInputOnTitleClick() {
    this.mainTitle.onclick = () => {
      this.inputFile.click();
    };
  }

  getAcceptedType() {
    switch(this.format) {
      case '*':
      return '*';
      case 'pdf':
      return 'application/pdf';
      default:
      return '*';
    }
  }

  handleFiles(files) {
    if(files.length !== 1) {
      this.setError("Please drop just 1 file");
      return;
    }

    if(!this.validateInputFile(files[0].type)) {
      this.setError(`Item not allowed, ${this.format.toUpperCase()} only`);
      return;
    }

    if(this.maxMB && files[0].size > this.maxMB * 1048576) {
      this.setError(`File is too BIG, MAX. size ${this.maxMB}MB`);
      return;
    }

    this.acceptFile(files[0]);
  }

  validateInputFile(type) {
    return this.format === '*' || type === this.getAcceptedType();
  }


  makeFileUploader() {
    this.makeFileUploaderTitle();
    this.makeFileUploaderInput();
  }

  makeFileUploaderInput() {
    this.inputFile = document.createElement('INPUT');
    this.inputFile.type = 'file';
    this.inputFile.setAttribute('accept', this.getAcceptedType());
    this.inputFile.className = this.inputFileClass;
    this.dz.appendChild(this.inputFile);
  }

  makeFileUploaderTitle() {
    this.mainTitle = document.createElement('DIV');
    this.mainTitle.innerHTML = 'Drop File/Click here and Upload File';
    this.mainTitle.className = this.mainTitleClass;
    this.dz.appendChild(this.mainTitle);
  }

  buildTitle() {
    this.titleElement = document.createElement('P');
    this.titleElement.innerHTML = '';
    this.titleElement.className = this.titleClass;
    this.dz.appendChild(this.titleElement);
  }


  setTitle(e) {
    this.titleElement.innerHTML = e;
  }

  showError() {
    this.errorIsShown = true;
    this.errorDiv.style.display = 'block';
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


  hideError() {
    this.errorIsShown = false;
    this.errorDiv.style.display = 'none';
  }

  errorIsCurrentlyShown() {
    return this.errorIsShown;
  }

  makeErrorBox() {
    this.errorDiv = document.createElement('DIV');
    this.errorDiv.className = this.errorClass;
    this.errorDiv.innerHTML = 'Error';
    this.dz.appendChild(this.errorDiv);
  }

  activateDropZone() {
    this.dz.ondragenter = (e) => {this.dragEnterEvent(e)};
    this.dz.ondragleave = (e) => {this.dragLeaveEnent(e)};
    this.dz.ondragover = (e) => {this.dragOverEnent(e)};
    this.dz.ondrop = (e) => {this.dragDropEvent(e)};
  }

  dragEnterEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    this.showDropZone();
  }

  showDropZone() {
    this.setTitle("Drop it like it's hot!");
    this.dz.style.border = '4px dashed blue';
    this.dz.style.borderRadius = '20px';
  }

  dragOverEnent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  hideDropZone(e, force = false) {
    if(force || this.cursorIsOutside(e)) {
      this.setTitle("");
      this.dz.style.border = '';
      this.dz.style.borderRadius = '';
    }
  }

  cursorIsOutside(e) {
    if(!e) {//no event passed - ignore this test
      return false;
    }
    let bounderies = this.dz.getBoundingClientRect();
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
    this.handleFiles(e.dataTransfer.files);
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
    this.callbacks = {};
    this.selected = '';
    this.prevSelected = '';
    this.build();
    this.activate();
  }

  build() {
    this.makeHolder();
    for(let q = 0 , l = this.checkboxesFromInput.length ; q < l ; q ++ ) {
      this.makeCheckbox(this.checkboxesFromInput[q].title, this.checkboxesFromInput[q].code);
    }
    this.saveCallbacks();
  }

  saveCallbacks() {
    this.checkboxesFromInput.forEach((e) => {
      this.callbacks[e.code] = {}; //make emmpty json
      if(e.onSet) {//onset callback
        this.callbacks[e.code].onSet = e.onSet;
      }
      if(e.onUnSet) {//onunset callback
        this.callbacks[e.code].onUnSet = e.onUnSet;
      }
    });
  }


  activate() {
    /*
    when one is clicked, turn others off
    add onset and onunset callbacks calls if defined in "checkboxesFromInput"
    */
    for(let i in this.checkboxes) {
      this.checkboxes[i].onchange = (e) => {
        for(let j in this.checkboxes) {
          if(this.checkboxes[j] === e.target) {
            this.prevSelected = this.selected;
            this.selected = j;
            this.checkboxes[j].checked = true;
          } else {
            this.checkboxes[j].checked = false;
          }
        }
        this.runCallback('onUnSet', this.prevSelected);
        this.runCallback('onSet', this.selected);
      };
    }
  }

  runCallback(type, code) {
    if(this.callbacks[code] && this.callbacks[code][type]) {
      this.callbacks[code][type]();
    }
  }

  makeHolder() {
    this.mainHolder = document.createElement('DIV');
    this.mainHolder.classname = this.holderClass;
    this.parent.appendChild(this.mainHolder);
  }

  get() {
    return this.selected;
  }

  set(code) {
    if(this.checkboxes[code]) {
      this.checkboxes[code].click();
    }
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
}

(async () => {
  let els = {
    typeDiv: document.getElementById('type-group'),
    titleInp: document.getElementById('book-title'),
    authorInp: document.getElementById('book-author'),
    isbnInp: document.getElementById('book-isbn'),
    yearInp: document.getElementById('book-year'),
    coverHolder: document.getElementById('cover-element-holder'),
    collectionHolder: document.getElementById('collection-holder'),
    bookPagesInput: document.getElementById('book-pages'),
    nextBookHolder: document.getElementById('next-book-holder'),
    prevBookHolder: document.getElementById('prev-book-holder'),
    seriesHolder: document.getElementById('series-holder'),
    autoFillHolder: document.getElementById('auto-fill'),
    saveBtn: document.getElementById('save'),
    bookStoreInp: document.getElementById('book-store'),
    langInp: document.getElementById('book-lang'),
    langOrgInp: document.getElementById('book-lang-org'),
    eBookUploaderDiv: document.getElementById('ebook-uploader')
  };

  let eBookUploader = new FileUploader(els.eBookUploaderDiv, {
    format: 'pdf',
    maxMB: '30',
    autoHide: true
  }),

  bookTypeE = new CheckboxGroup(els.typeDiv, {
    checkboxes: [
      {
        title: 'Hard Cover',
        code: 'H'
      },
      {
        title: 'Paper Back',
        code: 'P'
      },
      {
        title: 'Hard Cover no Dust Jacket',
        code: 'HN'
      },
      {
        title: 'E-Book',
        code: 'E',
        onSet: () => {
          eBookUploader.showAll();
        },
        onUnSet: () => {
          eBookUploader.hideAll();

        }
      }
    ]
  }),

  serieE = new Selector(els.seriesHolder, {
    additionalInputs: [{
      name: 'Number',
      type: 'number',
      returnName: 'number'
    }],
    withFilter: true,
    title: 'Part of Serie:',
    selectName: 'Serie',
    actionScript: '/serieList'
  }),

  nextEl = new Selector(els.nextBookHolder, {
    withFilter: true,
    title: 'Is Followed By:',
    selectName: 'Book',
    actionScript: '/bookList'
  }),

  prevEl = new Selector(els.prevBookHolder, {
    withFilter: true,
    title: 'Is Preceded By:',
    selectName: 'Book',
    actionScript: '/bookList'
  }),

  collectionEl = new StoriesCollection(els.collectionHolder, {
    pagesInput: els.bookPagesInput,
    mainAuthorInput: els.authorInp
  }),

  coverEl = new CoverSelector(els.coverHolder, {
    getSearchCoverParamsCallback: () => {
      return {
        isbn: els.isbnInp.value,
        author: els.authorInp.value,
        title: els.titleInp.value
      };
    }
  }),

  autoFill = new AutoFill(els.autoFillHolder, {
    checkParamsCallback: () => {
      return els.isbnInp.value || (els.authorInp.value && els.titleInp.value)
    },
    getParamsCallback: () => {
      return {
        isbn: els.isbnInp.value,
        title: els.titleInp.value,
        author: els.authorInp.value
      };
    },
    actionScript: '/search/book/',
    collectionPointer: collectionEl,
    checkParamsErrorMessage: 'Please fiil ISBN or Author and Title',
    inputsToFill: {
      isbn: els.isbnInp,
      title: els.titleInp,
      author: els.authorInp,
      pages: els.bookPagesInput,
      year: els.yearInp
    }
  }),

  messager = new Messager(),

  loader = new Loader(document.body, {
    classLoader: 'general-loader',
    withOverlay: true,
    autoPost: true,
    message: 'Saving Book',
    messageClass: 'main-olay-message'
  });


  //check if pathname have an id, if so, user is trying to edit an existing book, fetch current data
  let currentIdFromPath = getIdFromUrl();
  /*
  3 posible cases:
  * currentIdFromPath is null - normal case - user is inserting a new book
  * currentIdFromPath is a integer - user is updating an existing book
  * currentIdFromPath follows pattern wish[0-9]+ - user is converting a wish to book (purchased book arrived)
  */
  let currentData, currentId, wishId;
  if(/^[0-9]+$/.test(currentIdFromPath)) {//user is updating a book - fetch book's data
    currentId = currentIdFromPath;
    currentData = await doHttpRequest(`/get/book/${currentId}`);
    if(currentData) {//enter current data into relevant inputs
      //start with standard data (normal inputs)
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.author, els.authorInp);
      addValueToInput(currentData.isbn, els.isbnInp);
      addValueToInput(currentData.language, els.langInp);
      addValueToInput(currentData.o_language, els.langOrgInp);
      addValueToInput(currentData.pages, els.bookPagesInput);
      addValueToInput(currentData.year, els.yearInp);
      addValueToInput(currentData.store, els.bookStoreInp);
      //add book format
      bookTypeE.set(currentData.type);
      //add prev. book if exists
      if(currentData.prev_id) {
        prevEl.set({
          value: currentData.prev_id
        });
      }
      //add next book if exists
      if(currentData.next_id) {
        nextEl.set({
          value: currentData.next_id
        });
      }

      //add serie if exists
      if(currentData.serie_id) {
        serieE.set({
          value: currentData.serie_id,
          number: currentData.serie_num
        });
      }

      //add collection if exists
      if(currentData.is_collection) {
        //if author is the same one as collection author, change value to false so collection class will mark author as "same as collection"
        currentData.stories = currentData.stories.map((stry) => {
          if(stry.author === currentData.author) {
            stry.author = false;
          }
          return stry;
        });
        collectionEl.set(currentData.stories);
      }
    }
    //add pic if exists
    coverEl.set(`/pic/books/${currentData.id}`);
  } else if (/^wish[0-9]+$/.test(currentIdFromPath)) {  //user is converting wish to book - fetch wish data

    wishId = currentIdFromPath.match(/[0-9]+/)[0];//get wish id from string

    currentData = await doHttpRequest(`/get/wish/${wishId}`);
    if(currentData) {//enter current data into relevant inputs
      //start with standard data (normal inputs)
      addValueToInput(currentData.name, els.titleInp);
      addValueToInput(currentData.author, els.authorInp);
      addValueToInput(currentData.isbn, els.isbnInp);
      addValueToInput(currentData.year, els.yearInp);
      addValueToInput(currentData.store, els.bookStoreInp);

      //add serie if exists
      if(currentData.serie_id) {
        serieE.set({
          value: currentData.serie_id,
          number: currentData.serie_num
        });
      }

    }
    coverEl.set(`/pic/wishlist/${currentData.id}`);
  }

  els.saveBtn.onclick = () => {
    saveBook({
      values: {
        id: currentId,
        idFromWish: wishId,
        title: els.titleInp.value,
        author: els.authorInp.value,
        isbn: els.isbnInp.value,
        year: els.yearInp.value,
        pages: els.bookPagesInput.value,
        store: els.bookStoreInp.value,
        lang: els.langInp.value,
        langOrg: els.langOrgInp.value,
        type: bookTypeE.get(),
        serie: serieE.get(),
        next: nextEl.get(),
        prev: prevEl.get(),
        cover: coverEl.getSelected(),
        collection: collectionEl.get(),
        eBook: eBookUploader.isSet() ? eBookUploader.get() : null
      },
      messager: messager,
      loaderEl: loader,
      saveButton: els.saveBtn
    });
  };
})()

async function saveBook(opts) {
  if(!validValue(opts.values.title)) {
    opts.messager.setError("Please fill Title Input");
    return;
  }
  if(!validValue(opts.values.author)) {
    opts.messager.setError("Please fill Author Input");
    return;
  }
  if(!validValue(opts.values.year)) {
    opts.messager.setError("Please fill Year Input");
    return;
  }
  if(!validValue(opts.values.pages)) {
    opts.messager.setError("Please fill Pages Input");
    return;
  }
  if(!validValue(opts.values.store)) {
    opts.messager.setError("Please fill Store Input");
    return;
  }
  if(!validValue(opts.values.lang)) {
    opts.messager.setError("Please fill Language Input");
    return;
  }
  if(!validValue(opts.values.langOrg)) {
    opts.messager.setError("Please fill Original Language Input");
    return;
  }
  if(!validValue(opts.values.type)) {
    opts.messager.setError("Please select Type Format");
    return;
  }
  if(opts.values.type === 'E' && ! opts.values.eBook && !opts.values.id) {
    opts.messager.setError("Please Upload E-Book");
    return;
  }
  if(!validValue(opts.values.isbn) && opts.values.type !== 'E') {/*EMPTY ISBN is allowed only for E-Books*/
    opts.messager.setError("Please fill ISBN Input");
    return;
  }
  if(opts.values.serie) {
    if(!validValue(opts.values.serie.value)) {
      opts.messager.setError("Please select Serie");
      return;
    }
    if(!validValue(opts.values.serie.number)) {
      opts.messager.setError("Please select number in Serie");
      return;
    }
  }
  if(opts.values.next !== null && !validValue(opts.values.next)) {
    opts.messager.setError("Please select Next book");
    return;
  }
  if(opts.values.prev !== null && !validValue(opts.values.prev)) {
    opts.messager.setError("Please select Previous book");
    return;
  }
  opts.saveButton.disabled = true;//disable until http request finish
  opts.loaderEl.show('Saving Book');
  let response = await doHttpRequest('/save/book', {
    method: 'POST',
    body: jsonToFormData(opts.values)
  });
  opts.loaderEl.hide();
  opts.saveButton.disabled = false;
  if(!response) {
    opts.messager.setError("Error from Server, Please try again");
    return;
  }
  if(response.status !== true) {
    opts.messager.setError(response.message);
    return;
  }
  opts.messager.setMessage("Book Saved");
  await sleep(3000);
  window.location = '/insert/books';//reload in order to clear inputs
}
