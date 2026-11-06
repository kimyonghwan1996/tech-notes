(function () {
  var BASE = '/tech-notes/';
  var STORAGE_KEY = 'technotes.marks.v1';
  var LABELS = { ok: '이해함', confused: '헷갈림', important: '중요' };

  function stripBase(pathname) {
    // BASE is absent under local `mkdocs serve`, so strip only when present.
    var p = pathname.indexOf(BASE) === 0 ? pathname.slice(BASE.length) : pathname;
    return p.replace(/^\/+|\/+$/g, '');
  }

  function keyFor(pathname, headingId) {
    return (stripBase(pathname) || 'index') + '#' + headingId;
  }

  function loadMarks(storage) {
    try {
      var v = JSON.parse(storage.getItem(STORAGE_KEY));
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) {
      return {};
    }
  }

  function saveMarks(storage, marks) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(marks));
      return true;
    } catch (e) {
      return false;
    }
  }

  function toggle(marks, key, state, title) {
    var next = Object.assign({}, marks);
    if (next[key] && next[key].state === state) delete next[key];
    else next[key] = { state: state, title: title };
    return next;
  }

  function exportText(marks) {
    return Object.keys(marks).sort().map(function (key) {
      var m = marks[key];
      return '- [' + key.split('#')[0] + '] ' + m.title + ' (' + LABELS[m.state] + ')';
    }).join('\n');
  }

  function init() {
    var storage;
    try { storage = window.localStorage; } catch (e) { storage = null; }
    var marks = storage ? loadMarks(storage) : {};
    var root = location.pathname.indexOf(BASE) === 0 ? BASE : '/';

    function refreshLists() {
      [['confused', 'tn-confused'], ['important', 'tn-important']].forEach(function (p) {
        var ul = document.getElementById(p[1]);
        if (!ul) return;
        ul.textContent = '';
        Object.keys(marks).sort().forEach(function (key) {
          if (marks[key].state !== p[0]) return;
          var parts = key.split('#');
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = root + (parts[0] === 'index' ? '' : parts[0] + '/') + '#' + parts[1];
          a.textContent = marks[key].title;
          li.appendChild(a);
          ul.appendChild(li);
        });
      });
    }

    document.querySelectorAll('article h2[id], article h3[id]').forEach(function (h) {
      var title = Array.prototype.map.call(h.childNodes, function (n) {
        return n.nodeType === 3 ? n.textContent : '';
      }).join('').trim();
      var key = keyFor(location.pathname, h.id);
      var group = document.createElement('span');
      group.className = 'tn-marks';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', '이해도 표시');
      Object.keys(LABELS).forEach(function (state) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tn-mark';
        b.dataset.state = state;
        b.setAttribute('aria-label', LABELS[state] + '으로 표시');
        b.textContent = LABELS[state];
        b.addEventListener('click', function () {
          marks = toggle(marks, key, state, title);
          if (storage) saveMarks(storage, marks);
          sync();
          refreshLists();
        });
        group.appendChild(b);
      });
      function sync() {
        group.querySelectorAll('.tn-mark').forEach(function (b) {
          b.setAttribute('aria-pressed', String(!!marks[key] && marks[key].state === b.dataset.state));
        });
      }
      sync();
      h.appendChild(group);
    });

    refreshLists();

    var exp = document.getElementById('tn-export');
    if (exp) {
      var timer;
      exp.addEventListener('click', function () {
        var text = exportText(marks);
        function done(ok) {
          clearTimeout(timer);
          exp.textContent = ok ? '복사됨' : '복사 실패';
          timer = setTimeout(function () { exp.textContent = '표시 내보내기'; }, 2000);
        }
        function fallback() {
          var ta = document.getElementById('tn-export-text');
          if (!ta) {
            ta = document.createElement('textarea');
            ta.id = 'tn-export-text';
            ta.setAttribute('aria-label', '내보내기 텍스트');
            ta.style.cssText = 'display:block;width:100%;min-height:8rem;margin-top:.5rem';
            exp.insertAdjacentElement('afterend', ta);
          }
          ta.value = text;
          ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (e) {}
          if (ok) ta.remove(); // on failure the textarea stays so the user can copy by hand
          done(ok);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        } else fallback();
      });
    }
  }

  var api = { keyFor: keyFor, loadMarks: loadMarks, saveMarks: saveMarks, toggle: toggle, exportText: exportText };
  globalThis.TechNotesMarks = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})();
