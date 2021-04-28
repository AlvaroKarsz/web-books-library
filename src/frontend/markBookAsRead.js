{
  let cbox = document.getElementById('mark-book-as-completed'),
  inp = document.getElementById('input-number-read-pages-book');
  if(cbox && inp) {
    cbox.onchange = () => {
      inp.style.display = cbox.checked ? 'none' : 'block';
    };
  }
}
