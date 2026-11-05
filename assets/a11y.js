/* Shared accessibility helpers for every page (loaded with defer).
   - keeps aria-expanded on the mobile-menu button in sync with the menu
   - closes the mobile menu with Escape and returns focus to its button */
(function () {
  var menu = document.getElementById('mobileMenu');
  if (!menu) return;
  var btn = document.querySelector('button[onclick="toggleMenu()"]');
  if (!btn) return;
  if (!menu.id) menu.id = 'mobileMenu';
  btn.setAttribute('aria-controls', menu.id);
  function isOpen() { return getComputedStyle(menu).display !== 'none'; }
  function sync() {
    var open = isOpen();
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  sync();
  new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', sync);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen() && typeof window.toggleMenu === 'function') { window.toggleMenu(); btn.focus(); }
  });
})();

/* Give every form control an accessible name.
   Calculator pages render "<label>Text</label><input>" pairs (many from JS) without a
   for= attribute. This links each label to the control that follows it inside the same
   parent, and names any remaining unlabeled control from its table column header,
   placeholder or title. It only adds for/id/aria-label attributes. */
(function () {
  var seq = 0;
  var CONTROL = 'input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea';
  function ensureId(el) { if (!el.id) el.id = 'a11y-ctl-' + (++seq); return el.id; }
  function hasName(el) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return true;
    if (el.closest('label')) return true;
    if (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) return true;
    return false;
  }
  function linkLabels(root) {
    root.querySelectorAll('label:not([for])').forEach(function (lab) {
      if (lab.querySelector(CONTROL)) return;
      var parent = lab.parentElement; if (!parent) return;
      var found = null, passed = false;
      var all = parent.querySelectorAll(CONTROL + ',label');
      for (var i = 0; i < all.length; i++) {
        if (all[i] === lab) { passed = true; continue; }
        if (!passed) continue;
        if (all[i].tagName === 'LABEL') break;
        found = all[i]; break;
      }
      if (found && !hasName(found)) lab.htmlFor = ensureId(found);
    });
  }
  function headerText(el) {
    var cell = el.closest('td,th'); if (!cell) return '';
    var table = cell.closest('table'); if (!table) return '';
    var idx = Array.prototype.indexOf.call(cell.parentElement.children, cell);
    var head = table.querySelector('thead tr'); if (!head || !head.children[idx]) return '';
    var txt = head.children[idx].textContent.trim();
    var row = cell.parentElement; var rowNo = Array.prototype.indexOf.call(row.parentElement.children, row) + 1;
    return txt ? txt + ' (row ' + rowNo + ')' : '';
  }
  function nameRest(root) {
    root.querySelectorAll(CONTROL).forEach(function (el) {
      if (hasName(el)) return;
      var name = headerText(el) || el.getAttribute('placeholder') || el.getAttribute('title');
      if (!name) {
        // a preceding visible text label in the same parent (e.g. <div class="flabel">)
        var prev = el.previousElementSibling;
        if (prev && !prev.matches(CONTROL) && prev.textContent.trim().length < 80) name = prev.textContent.trim();
      }
      if (name) el.setAttribute('aria-label', name);
    });
    root.querySelectorAll('button').forEach(function (b) {
      if (b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title')) {
        if (!b.textContent.trim() && !b.getAttribute('aria-label') && b.getAttribute('title')) b.setAttribute('aria-label', b.getAttribute('title'));
        return;
      }
      var on = b.getAttribute('onclick') || '';
      if (/remove|delete/i.test(on)) { var h = headerText(b); b.setAttribute('aria-label', 'Remove' + (h ? ' ' + h.replace(/^[^(]*/, 'row ').replace(/[()]/g, '').replace('row row', 'row') : '')); }
    });
  }
  var pending = false;
  function run() { pending = false; linkLabels(document); nameRest(document); }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(run); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) if (muts[i].addedNodes.length) { schedule(); return; }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

/* Horizontally scrolling table wrappers must be reachable by keyboard. */
(function () {
  function mark() {
    document.querySelectorAll('.tbl-wrap').forEach(function (w) {
      if (w.scrollWidth > w.clientWidth + 1) {
        if (!w.hasAttribute('tabindex')) w.setAttribute('tabindex', '0');
        if (!w.getAttribute('role')) { w.setAttribute('role', 'region'); w.setAttribute('aria-label', 'Scrollable table'); }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
  window.addEventListener('resize', mark);
  window.addEventListener('load', mark);
})();
