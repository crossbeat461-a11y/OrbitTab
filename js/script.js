// ==========================================
// 0. 初期設定 & データ読み込み
// ==========================================
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const INITIAL_SAMPLE_LINKS = {
    "クイックアクセス": [{ title: "Google 検索", url: "https://www.google.com" }]
};
const DEFAULT_NOTE = [{ 
    title: "🚀 OrbitTab クイックガイド", 
    body: "1. 右下の【📥】をクリックして、PCに保存したブックマークHTMLを読み込みます。\n\n" +
          "2. 次に【＋】をクリックすると、あなたのブックマークフォルダがリストで表示されます。\n\n" +
          "3. 好きな番号を入力すれば、一瞬で自分だけのカテゴリBOXが完成！\n\n" +
          "※HTMLの作り方：Chromeの『ブックマークマネージャー』から『エクスポート』を選んで保存してください。"
}];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    return (val === null) ? def : JSON.parse(val);
}

let links = getStored('orbitTab_v1_links', INITIAL_SAMPLE_LINKS);
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let bookmarkCatalog = {}; 
let maxZ = 100;

function saveLinks() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
}

// ==========================================
// 1. 基本機能 (時計・ドラッグ)
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
// 2. インポート機能
// ==========================================
function setupImportFeature() {
    const importBtn = document.getElementById('import-bookmarks-btn');
    const bookmarkInput = document.getElementById('bookmark-input');
    if (!importBtn || !bookmarkInput) return;

    importBtn.onclick = () => bookmarkInput.click();

    bookmarkInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(ev.target.result, 'text/html');
            
            // 全てのリンク（<a>タグ）を取得
            const allLinks = doc.querySelectorAll('a');
            if (allLinks.length === 0) {
                alert("ブックマークが見つかりませんでした。HTML形式か確認してください。");
                return;
            }

            bookmarkCatalog = {};
            
            // <a>タグを一つずつ見て、親要素のフォルダ名を探し出す
            allLinks.forEach(a => {
                let folderName = "未分類";
                // リンクの親を遡って、一番近い見出し（H3）を探す
                let parent = a.parentElement;
                while (parent) {
                    const h3 = parent.querySelector('h3');
                    if (h3) {
                        folderName = h3.textContent;
                        break;
                    }
                    // さらに上の階層へ
                    parent = parent.parentElement;
                    if (parent === doc.body) break;
                }

                if (!bookmarkCatalog[folderName]) {
                    bookmarkCatalog[folderName] = [];
                }
                bookmarkCatalog[folderName].push({ title: a.textContent, url: a.href });
            });

            // フォルダが多すぎると大変なので、空のフォルダは除外
            Object.keys(bookmarkCatalog).forEach(key => {
                if (bookmarkCatalog[key].length === 0) delete bookmarkCatalog[key];
            });

            alert(`読み込み完了！\n${Object.keys(bookmarkCatalog).length} 個のカテゴリが見つかりました。\n『＋』ボタンから選んで追加してください。`);
        };
        reader.readAsText(file);
    };
}

// ==========================================
// 3. 描画 (render)
// ==========================================
function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    // カテゴリBOXの表示
    Object.keys(links).forEach(function(cat, i) {
        const box = document.createElement('div');
        box.className = 'widget';
        box.innerHTML = '<div class="widget-header"><span class="widget-title">' + cat + '</span><span class="cat-delete-btn">🗑️</span></div><div class="link-list"></div>';
        
        box.querySelector('.cat-delete-btn').onclick = function(e) {
            e.stopPropagation();
            if(confirm("カテゴリー「" + cat + "」を削除しますか？")) {
                delete links[cat];
                saveLinks();
                render();
            }
        };

        const list = box.querySelector('.link-list');
        (links[cat] || []).forEach(function(item, idx) {
            const row = document.createElement('div');
            row.className = 'link-wrapper';
            row.innerHTML = '<span>' + item.title + '</span>';
            row.onclick = function() { window.open(item.url, '_blank'); };
            list.appendChild(row);
        });
        container.appendChild(box);
        makeWidget(box, "pos_cat_" + cat.replace(/\s+/g, '_'), {left: 100 + i*340, top: 550, w: 300, h: 250});
    });

    // 付箋の表示
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
}

// ==========================================
// 4. アクション & 起動
// ==========================================

// ＋ボタン
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

// スクロール
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
    setupImportFeature(); 
};