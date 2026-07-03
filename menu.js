(function () {
  var btn = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');
  var header = document.querySelector('header.top-bar');
  if (!btn || !menu || !header) return;

  btn.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    header.classList.toggle('menu-open', open);
  });
})();
