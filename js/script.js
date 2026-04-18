const DB_NAME = "OrbitTabDB";
const STORE_NAME = "settings";
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";

const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
};

const DEFAULT_NOTE_DATA = { title: "タスク", body: "🚀 OrbitTab へようこそ！" };
const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

let maxZIndex = 100;

function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return (item === null || item === "{}") ? defaultValue : JSON.parse(item);
    } catch (e) { return defaultValue; }
}

let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let notes = getSafeStorage('orbitTab_notes_v4', [DEFAULT_NOTE_DATA]);

if (Object.keys(links).length === 0) {
    links = JSON.parse(JSON.stringify(DEFAULT_LINKS));
}

function updateClock() {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (!clockEl || !dateEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    clockEl.innerText = h + ":" + m;
    dateEl.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
setInterval(updateClock, 1000);

function bringToFront(el) {
    maxZIndex++;
    el.style.zIndex = maxZIndex;
}

function makeWidget(el, storageKey, defaultLayout) {
    if (!el) return;
    let isDragging = false, isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    const saved = getSafeStorage(storageKey, defaultLayout);
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    if (!el.querySelector('.resizer')) el.appendChild(resizer);
    
    resizer.onmousedown = function(e) {
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        e.stopPropagation();
        bringToFront(el);
    };

    const header = el.querySelector('.widget-header');
    el.onmousedown = function() { bringToFront(el); };
    
    if (header) {
        header.onmousedown = function(e) {
            if (e.button !== 0 || e.target.classList.contains('cat-delete-btn') || e.target.tagName === 'INPUT') return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            bringToFront(el);
            document.body.style.userSelect = 'none';
        };
    }

    window.addEventListener('mousemove', function(e) {
        if (isDragging) {
            el.style.left = (startLeft + (e.clientX - startX)) + 'px';
            el.style.top = (startTop + (e.clientY - startY)) + 'px';
        }
        if (isResizing) {
            el.style.width = (startW + (e.clientX - startX)) + 'px';
            el.style.height = (startH + (e.clientY - startY)) + 'px';
        }
    });

    window.addEventListener('mouseup', function() {
        if (isDragging || isResizing) {
            localStorage.setItem(storageKey, JSON.stringify({
                left: parseInt(el.style.left), top: parseInt(el.style.top),
                w: parseInt(el.style.width), h: parseInt(el.style.height)
            }));
        }
        isDragging = false; isResizing = false;
        document.body.style.userSelect = 'auto';
    });
}

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = ""; 

    Object.keys(links).forEach(function(cat, index) {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.innerHTML = '<div class="widget-header"><span class="widget-title" style="color:#00d2ff;">' + cat + '</span><span class="cat-delete-btn">🗑️</span></div><div class="link-list"></div>';

        box.querySelector('.cat-delete-btn').onclick = function() {
            if (confirm("削除しますか？")) { delete links[cat]; saveAndRender(); }
        };

        const listDiv = box.querySelector('.link-list');
        (links[cat] || []).forEach(function(item, idx) {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = '<span class="link-title">' + item.title + '</span><span class="delete-btn">&times;</span>';
            wrap.querySelector('.link-title').onclick = function() { window.open(item.url, '_blank'); };
            wrap.querySelector('.delete-btn').onclick = function() { links[cat].splice(idx, 1); saveAndRender(); };
            listDiv.appendChild(wrap);
        });

        container.appendChild(box);
        const safeKey = "pos_cat_" + cat.replace(/\s+/g, '_');
        makeWidget(box, safeKey, { left: 100 + (index * 340), top: 600, w: 320, h: 250 });
    });

    notes.forEach(function(data, idx) {
        const note = document.createElement('div');
        note.className = 'widget note-box';
        note.innerHTML = '<div class="widget-header"><input type="text" class="nt-input" value="' + data.title + '"><span class="cat-delete-btn">🗑️</span></div><textarea class="ni-textarea">' + data.body + '</textarea>';
        container.appendChild(note);
        makeWidget(note, "pos_note_" + idx, { left: 680 + (idx * 30), top: 250 + (idx * 30), w: 300, h: 250 });

        const nt = note.querySelector('.nt-input');
        const ni = note.querySelector('.ni-textarea');
        nt.oninput = function() { notes[idx].title = nt.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        ni.oninput = function() { notes[idx].body = ni.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        note.querySelector('.cat-delete-btn').onclick = function() {
            notes.splice(idx, 1); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); renderBoard();
        };
    });

    if (calUrl) {
        const cal = document.createElement('div');
        cal.className = 'widget';
        cal.innerHTML = '<div class="widget-header"><span class="widget-title">Calendar</span><span class="cat-delete-btn" id="del-cal">🗑️</span></div><iframe src="' + calUrl + '" class="calendar-iframe"></iframe>';
        container.appendChild(cal);
        makeWidget(cal, 'pos_cal', { left: 100, top: 200, w: 500, h: 400 });
        document.getElementById('del-cal').onclick = function() { calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard(); };
    }
}

function saveAndRender() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    renderBoard();
}

document.getElementById('guide-btn').onclick = function() { window.open(NOTE_URL, '_blank'); };
document.getElementById('add-cat-btn').onclick = function() {
    const n = prompt("新しいカテゴリー名:");
    if (n && n.trim()) {
        const name = n.trim();
        if (!links[name]) { links[name] = []; saveAndRender(); }
    }
};
document.getElementById('note-setup-btn').onclick = function() {
    if (notes.length >= 4) return alert("最大4つまでです");
    notes.push({ title: "タスク", body: "" });
    localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
    renderBoard();
};
document.getElementById('cal-setup-btn').onclick = function() {
    const u = prompt("GoogleカレンダーのURL:");
    if (u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); renderBoard(); }
};

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = function() { bgInput.click(); };
bgInput.onchange = function(e) {
    const f = e.target.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = function(ev) {
            const data = ev.target.result;
            document.getElementById('bg-container').style.backgroundImage = "url(" + data + ")";
        };
        r.readAsDataURL(f);
    }
};

window.onload = function() {
    updateClock();
    renderBoard();
};