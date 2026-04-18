// ==========================================
// 0. 初期設定 & データ読み込み
// ==========================================
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const INITIAL_SAMPLE_LINKS = {
    "クイックアクセス": [{ title: "Google 検索", url: "https://www.google.com" }]
};
const DEFAULT_NOTE = [{ title: "タスク", body: "🚀 OrbitTabへようこそ！" }];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    return (val === null) ? def : JSON.parse(val);
}

let links = getStored('orbitTab_v1_links', INITIAL_SAMPLE_LINKS);
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let bookmarkCatalog = {}; // ブックマークの予備
let maxZ = 100;

// リンク保存用関数
function saveLinks() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
}

// ==========================================
// 1. 基本機能 (時計・ウィジェット化)
// ==========================================
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
    el.onclick = () => { maxZ++; el.style.zIndex = maxZ; };
}

// ==========================================
// 2. インポート機能（修正版）
// ==========================================
// ボタンの紐付けを関数化して、確実に動作するようにします
function setupImportFeature() {
    const importBtn = document.getElementById('import-bookmarks-btn');
    const bookmarkInput = document.getElementById('bookmark-input');

    if (!importBtn || !bookmarkInput) return;

    importBtn.onclick = () => {
        bookmarkInput.click();
    };

    bookmarkInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(ev.target.result, 'text/html');
            const folders = doc.querySelectorAll('h3');
            if (folders.length === 0) {
                alert("ブックマークが見つかりませんでした。HTML形式か確認してください。");
                return;
            }
            bookmarkCatalog = {};
            folders.forEach(folder => {
                const name = folder.textContent;
                const linksInFolder = [];
                const linkNodes = folder.parentElement.querySelectorAll('a');
                linkNodes.forEach(a => linksInFolder.push({ title: a.textContent, url: a.href }));
                bookmarkCatalog[name] = linksInFolder;
            });
            alert("読み込み完了！\n『＋』ボタンを押すと、ブックマークから好きなフォルダを選んで追加できます。");
        };
        reader.readAsText(file);
    };
}

    // 付箋
    notes.forEach(function(n, i) {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = '<div class="widget-header"><input type="text" class="nt-input" value="' + n.title + '"><span class="cat-delete-btn">🗑️</span></div><textarea class="ni-textarea">' + n.body + '</textarea>';
        
        const nt = nb.querySelector('.nt-input');
        const ni = nb.querySelector('.ni-textarea');
        nt.onmousedown = ni.onmousedown = (e) => e.stopPropagation();

        nt.oninput = () => { notes[i].title = nt.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        ni.oninput = () => { notes[i].body = ni.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        
        nb.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
            notes.splice(i, 1);
            localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
            render();
        };
        container.appendChild(nb);
        makeWidget(nb, "pos_note_" + i, {left: 450 + i*30, top: 150 + i*30, w: 300, h: 250});
    });

// ＋ボタンの挙動：カタログがあれば選択、なければ新規
document.getElementById('add-cat-btn').onclick = () => {
    const catalogKeys = Object.keys(bookmarkCatalog);
    if (catalogKeys.length > 0) {
        let msg = "追加方法を選択：\n[0] 空のカテゴリ作成\n-- ブックマーク --\n";
        catalogKeys.forEach((name, i) => msg += `[${i + 1}] ${name}\n`);
        const choice = prompt(msg);
        if (!choice) return;
        if (choice === "0") {
            const n = prompt("カテゴリ名:");
            if (n) { links[n] = []; saveLinks(); render(); }
        } else {
            const idx = parseInt(choice) - 1;
            const selected = catalogKeys[idx];
            if (selected) { links[selected] = bookmarkCatalog[selected]; saveLinks(); render(); }
        }
    } else {
        const n = prompt("新しいカテゴリ名:");
        if (n) { links[n] = []; saveLinks(); render(); }
    }
};

// ==========================================
// 4. その他操作 & 起動
// ==========================================
window.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const step = 80;
    const main = document.querySelector('.main-interface');
    if (e.key === 'ArrowRight') main.scrollLeft += step;
    if (e.key === 'ArrowLeft') main.scrollLeft -= step;
    if (e.key === 'ArrowDown') main.scrollTop += step;
    if (e.key === 'ArrowUp') main.scrollTop -= step;
});

document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank');
document.getElementById('note-setup-btn').onclick = () => {
    if(notes.length < 4) { notes.push({title: "タスク", body: ""}); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); render(); }
};
document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("GoogleカレンダーURL:");
    if(u) { localStorage.setItem('orbitTab_calUrl', u); location.reload(); }
};

window.onload = function() { 
    updateClock(); 
    render(); 
    setupImportFeature(); // これを追加！
};