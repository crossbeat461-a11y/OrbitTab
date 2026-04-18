const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const DEFAULT_NOTE = [{ 
    title: "🚀 OrbitTab クイックガイド", 
    body: "1. 右下の【📥】をクリックして、PCに保存したブックマークHTMLを読み込みます。\n\n2. 次に【＋】をクリックすると、読み込んだフォルダがリストで表示されます。\n\n3. 番号を入力して、自分だけのカテゴリBOXを完成させましょう！"
}];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    return (val === null) ? def : JSON.parse(val);
}

let links = getStored('orbitTab_v1_links', {});
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let bookmarkCatalog = {}; 
let maxZ = 100;

function saveLinks() { localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); }
function saveNotes() { localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); }

// --- 1. 時計機能 ---
function updateClock() {
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// --- 2. ウィジェット制御 ---
function makeWidget(el, key, def) {
    const pos = getStored(key, def);
    el.style.left = pos.left + "px"; el.style.top = pos.top + "px";
    el.style.width = pos.w + "px"; el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    header.onmousedown = function(e) {
        // ボタン類をクリックした時はドラッグを開始しない
        if (e.target.closest('.cat-btn') || e.target.tagName === 'INPUT') return;
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

// --- 3. インポート機能 ---
function setupImportFeature() {
    const importBtn = document.getElementById('import-bookmarks-btn');
    const bookmarkInput = document.getElementById('bookmark-input');
    const bgBtn = document.getElementById('bg-change-btn');
    const bgInput = document.getElementById('bg-input');

    if (importBtn && bookmarkInput) {
        importBtn.onclick = () => bookmarkInput.click();
        bookmarkInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(ev.target.result, 'text/html');
                const allLinks = doc.querySelectorAll('a');
                if (allLinks.length === 0) { alert("ブックマークが見つかりません。"); return; }
                bookmarkCatalog = {};
                allLinks.forEach(a => {
                    let folderName = "未分類";
                    let parent = a.parentElement;
                    while (parent) {
                        const h3 = parent.querySelector('h3');
                        if (h3) { folderName = h3.textContent; break; }
                        parent = parent.parentElement;
                        if (parent === doc.body) break;
                    }
                    if (!bookmarkCatalog[folderName]) bookmarkCatalog[folderName] = [];
                    bookmarkCatalog[folderName].push({ title: a.textContent, url: a.href });
                });
                alert(`読み込み完了！\n${Object.keys(bookmarkCatalog).length} カテゴリ見つかりました。`);
            };
            reader.readAsText(file);
        };
    }

    if (bgBtn && bgInput) {
        bgBtn.onclick = () => bgInput.click();
        bgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target.result;
                document.getElementById('bg-container').style.backgroundImage = `url(${url})`;
                localStorage.setItem('orbitTab_bg_v4', url);
            };
            reader.readAsDataURL(file);
        };
    }
}

// --- 4. 描画処理 ---
function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    // --- カテゴリBOXの描画 ---
    Object.keys(links).forEach((cat, i) => {
        const box = document.createElement('div');
        box.className = 'widget';
        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${cat}</span>
                <div class="header-btns">
                    <span class="cat-btn add-single-btn" title="手動追加">➕</span>
                    <span class="cat-btn cat-delete-btn" title="削除">🗑️</span>
                </div>
            </div>
            <div class="link-list"></div>`;
        
        // 手動追加のロジック（ここを強化しました）
        box.querySelector('.add-single-btn').onclick = (e) => {
            e.stopPropagation();
            const t = prompt("リンクの名前を入力:", "新しいサイト");
            if(!t) return;
            const u = prompt("URLを入力:", "https://");
            if(!u || !u.startsWith('http')) { 
                alert("有効なURLを入力してください（httpから始まるもの）。"); 
                return; 
            }
            
            // 安全策：配列が存在しない場合は作成する
            if (!Array.isArray(links[cat])) {
                links[cat] = [];
            }
            
            links[cat].push({ title: t, url: u });
            saveLinks();
            render();
        };

        // ドラッグ＆ドロップ
        box.ondragover = (e) => { e.preventDefault(); box.style.borderColor = "#00d2ff"; };
        box.ondragleave = () => { box.style.borderColor = "rgba(255, 255, 255, 0.2)"; };
        box.ondrop = (e) => {
            e.preventDefault();
            box.style.borderColor = "rgba(255, 255, 255, 0.2)";
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                const newTitle = prompt("新しいリンクの名前:", "新しいリンク");
                if (newTitle) {
                    if (!Array.isArray(links[cat])) links[cat] = [];
                    links[cat].push({ title: newTitle, url: url });
                    saveLinks(); render();
                }
            }
        };

        box.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
            if(confirm(`カテゴリー「${cat}」を削除しますか？`)) { 
                delete links[cat]; 
                saveLinks(); 
                render(); 
            }
        };

        const list = box.querySelector('.link-list');
        (links[cat] || []).forEach(item => {
            const row = document.createElement('div');
            row.className = 'link-wrapper';
            row.innerHTML = `<span>${item.title}</span>`;
            row.onclick = () => window.open(item.url, '_blank');
            list.appendChild(row);
        });

        container.appendChild(box);
        // IDにスペースが含まれても動くようにエスケープ処理
        const safeKey = "pos_cat_" + cat.replace(/\s+/g, '_');
        makeWidget(box, safeKey, {left: 100 + i*340, top: 550, w: 300, h: 250});
    });

    // --- 付箋の描画 ---
    notes.forEach((n, i) => {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = `
            <div class="widget-header">
                <input type="text" class="nt-input" value="${n.title}">
                <span class="cat-btn cat-delete-btn">🗑️</span>
            </div>
            <textarea class="ni-textarea">${n.body}</textarea>`;
        
        const nt = nb.querySelector('.nt-input');
        const ni = nb.querySelector('.ni-textarea');
        nt.onmousedown = ni.onmousedown = (e) => e.stopPropagation();
        nt.oninput = () => { notes[i].title = nt.value; saveNotes(); };
        ni.oninput = () => { notes[i].body = ni.value; saveNotes(); };
        
        nb.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
            notes.splice(i, 1); saveNotes(); render();
        };
        container.appendChild(nb);
        makeWidget(nb, `pos_note_${i}`, {left: 400 + i*50, top: 150 + i*50, w: 320, h: 280});
    });
}

// --- 5. ボタンアクション ---
document.getElementById('add-cat-btn').onclick = () => {
    const catalogKeys = Object.keys(bookmarkCatalog);
    let msg = "追加方法を選択：\n[0] 空のカテゴリ作成\n";
    catalogKeys.forEach((name, i) => msg += `[${i + 1}] ${name}\n`);
    const choice = prompt(msg);
    if (choice === "0") {
        const n = prompt("カテゴリ名:");
        if (n) { links[n] = []; saveLinks(); render(); }
    } else if (choice) {
        const idx = parseInt(choice) - 1;
        const selected = catalogKeys[idx];
        if (selected) { 
            links[selected] = bookmarkCatalog[selected]; 
            saveLinks(); 
            render(); 
        }
    }
};

document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank');
document.getElementById('note-setup-btn').onclick = () => {
    notes.push({title: "新規付箋", body: ""}); saveNotes(); render();
};

window.onload = function() { 
    updateClock(); setInterval(updateClock, 1000);
    render(); 
    setupImportFeature(); 
    const savedBg = localStorage.getItem('orbitTab_bg_v4');
    if (savedBg) document.getElementById('bg-container').style.backgroundImage = `url(${savedBg})`;
};