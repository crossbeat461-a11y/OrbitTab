const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
};
const DEFAULT_NOTE = [{ title: "タスク", body: "🚀 OrbitTabへようこそ！" }];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    return (val === null || val === "{}") ? def : JSON.parse(val);
}

let links = getStored('orbitTab_v1_links', DEFAULT_LINKS);
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let maxZ = 100;

function updateClock() {
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
setInterval(updateClock, 1000);

function makeWidget(el, key, def) {
    if (!el) return;
    const pos = getStored(key, def);
    el.style.left = pos.left + "px"; el.style.top = pos.top + "px";
    el.style.width = pos.w + "px"; el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    header.onmousedown = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('cat-delete-btn')) return;
        maxZ++; el.style.zIndex = maxZ;
        let startX = e.clientX - el.offsetLeft;
        let startY = e.clientY - el.offsetTop;
        document.onmousemove = function(me) {
            el.style.left = (me.clientX - startX) + "px";
            el.style.top = (me.clientY - startY) + "px";
        };
        document.onmouseup = function() {
            document.onmousemove = null;
            localStorage.setItem(key, JSON.stringify({left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight}));
        };
    };
}

function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    Object.keys(links).forEach(function(cat, i) {
        const box = document.createElement('div');
        box.className = 'widget';
        box.innerHTML = '<div class="widget-header"><span class="widget-title">' + cat + '</span><span class="cat-delete-btn">🗑️</span></div><div class="link-list"></div>';
        box.querySelector('.cat-delete-btn').onclick = function() { if(confirm("削除しますか？")){ delete links[cat]; localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); render(); } };
        const list = box.querySelector('.link-list');
        links[cat].forEach(function(item, idx) {
            const row = document.createElement('div');
            row.className = 'link-wrapper';
            row.innerHTML = '<span class="link-title">' + item.title + '</span><span class="delete-btn">&times;</span>';
            row.querySelector('.link-title').onclick = function() { window.open(item.url, '_blank'); };
            row.querySelector('.delete-btn').onclick = function() { links[cat].splice(idx, 1); localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); render(); };
            list.appendChild(row);
        });
        container.appendChild(box);
        makeWidget(box, "pos_cat_" + cat.replace(/\s/g, '_'), {left: 100 + i*340, top: 550, w: 320, h: 250});
    });

    notes.forEach(function(n, i) {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = '<div class="widget-header"><input type="text" class="nt-input" value="' + n.title + '"><span class="cat-delete-btn">🗑️</span></div><textarea class="ni-textarea">' + n.body + '</textarea>';
        nb.querySelector('.nt-input').oninput = function(e) { notes[i].title = e.target.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        nb.querySelector('.ni-textarea').oninput = function(e) { notes[i].body = e.target.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        nb.querySelector('.cat-delete-btn').onclick = function() { notes.splice(i, 1); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); render(); };
        container.appendChild(nb);
        makeWidget(nb, "pos_note_" + i, {left: 680 + i*30, top: 250 + i*30, w: 300, h: 250});
    });

    if (calUrl) {
        const cb = document.createElement('div');
        cb.className = 'widget';
        cb.innerHTML = '<div class="widget-header"><span class="widget-title">Calendar</span><span class="cat-delete-btn">🗑️</span></div><iframe src="' + calUrl + '" class="calendar-iframe"></iframe>';
        cb.querySelector('.cat-delete-btn').onclick = function() { calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); render(); };
        container.appendChild(cb);
        makeWidget(cb, "pos_cal", {left: 100, top: 200, w: 500, h: 400});
    }
}

document.getElementById('guide-btn').onclick = function() { window.open(NOTE_URL, '_blank'); };
document.getElementById('add-cat-btn').onclick = function() { const n = prompt("カテゴリ名:"); if(n) { links[n] = []; localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); render(); } };
document.getElementById('note-setup-btn').onclick = function() { if(notes.length < 4) { notes.push({title: "タスク", body: ""}); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); render(); } };
document.getElementById('cal-setup-btn').onclick = function() { const u = prompt("カレンダーURL:"); if(u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); render(); } };

window.onload = function() {
    updateClock();
    render();
    document.getElementById('bg-container').style.opacity = 1;
};