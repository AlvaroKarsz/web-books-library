(async () => {
  //search for messages to display
  let urlParams = getUrlParams();
  if(!urlParams['err-msg']) {
    return;
  }
  let messager = new Messager();
  messager.setError(urlParams['err-msg']);
  removeUrlParam('err-msg');
})()
