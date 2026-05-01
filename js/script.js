/**
 * OrbitTab v1.5.3 - 修正版
 * トラブル箇所（インポートデータの反映）のみを修正し、既存仕様を維持
 */

// --- 1. 定数・初期設定 ---
const DEFAULT_NOTE = [{ id: Date.now(), title: "🚀 クイックガイド", body: "右下のボタンからブックマークを読み込み、＋ボタンでBOXを追加してください。" }];

// --- 2. データ保存・取得処理 ---
function getStored(key, def) {
    const val = localStorage.getItem(key);
    try { return (val === null) ? def : JSON.parse(val); } catch(e) { return def; }
}

let links = getStored('orbitTab_v2_links', []); 
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let bookmarkCatalog = {}; 
let maxZ = 100;

function saveLinks() { localStorage.setItem('orbitTab_v2_links', JSON.stringify(links)); }
function saveNotes() { localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); }

// --- 3. 時計機能 ---
function updateClock() {
    const clock = document.getElementById('clock'), date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// --- 4. インポート・背景設定 ---
function setupImportFeature() {
    const input = document.getElementById('bookmark-input'), importBtn = document.getElementById('import-bookmarks-btn');
    if (importBtn) {
        importBtn.onclick = () => input.click();
        input.onchange = (e) => {
            if (!e.target.files[0]) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const doc = new DOMParser().parseFromString(ev.target.result, 'text/html');
                bookmarkCatalog = {};
                doc.querySelectorAll('a').forEach(a => {
                    let folder = "未分類";
                    let p = a.closest('dl').previousElementSibling;
                    if (p) folder = p.textContent;
                    if (!bookmarkCatalog[folder]) bookmarkCatalog[folder] = [];
                    bookmarkCatalog[folder].push({ title: a.textContent, url: a.href });
                });
                alert("読み込み完了！");
            };
            reader.readAsText(e.target.files[0]);
        };
    }

    const bgBtn = document.getElementById('bg-change-btn'), bgContainer = document.getElementById('bg-container');
    if (bgBtn) {
        bgBtn.onclick = () => document.getElementById('bg-input').click();
        document.getElementById('bg-input').onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                bgContainer.style.backgroundImage = `url(${ev.target.result})`;
                localStorage.setItem('orbitTab_bg_v4', ev.target.result);
            };
            reader.readAsDataURL(e.target.files[0]);
        };
    }
}

// --- 5. ウィジェット制御 ---
function makeWidget(el, key, def) {
    const pos = getStored(key, def);
    el.style.left = pos.left + "px"; el.style.top = pos.top + "px";
    el.style.width = pos.w + "px"; el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    header.onmousedown = function(e) {
        if (e.target.closest('.cat-btn') || e.target.closest('.delete-link-btn')) return;
        maxZ++; el.style.zIndex = maxZ;
        let startX = e.clientX - el.offsetLeft, startY = e.clientY - el.offsetTop;
        document.onmousemove = (me) => {
            el.style.left = (me.clientX - startX) + "px";
            el.style.top = (me.clientY - startY) + "px";
        };
        document.onmouseup = () => { document.onmousemove = null; savePos(el, key); };
    };
    new ResizeObserver(() => savePos(el, key)).observe(el);
}

function savePos(el, key) {
    localStorage.setItem(key, JSON.stringify({ left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
}

// --- 6. 描画処理 ---
function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return; container.innerHTML = "";

    links.forEach((boxData, bIdx) => {
        const box = document.createElement('div');
        box.className = 'widget';
        const safeKey = `pos_id_${boxData.id}`;

        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${boxData.category}</span>
                <div class="header-btns"><span class="cat-btn cat-delete-btn">🗑️</span></div>
            </div>
            <div class="link-list"></div>`;

        box.querySelector('.cat-delete-btn').onclick = () => {
            if(confirm("削除しますか？")) { links.splice(bIdx, 1); saveLinks(); render(); }
        };

        const list = box.querySelector('.link-list');
        boxData.items.forEach((item, lIdx) => {
            const row = document.createElement('div');
            row.className = 'link-item';
            row.innerHTML = `<span class="link-name">${item.title}</span><span class="delete-link-btn">×</span>`;
            row.onclick = (e) => { if(!e.target.classList.contains('delete-link-btn')) window.open(item.url, '_blank'); };
            row.querySelector('.delete-link-btn').onclick = (e) => {
                e.stopPropagation();
                boxData.items.splice(lIdx, 1); saveLinks(); render();
            };
            list.appendChild(row);
        });
        
        container.appendChild(box);
        makeWidget(box, safeKey, {left: 50 + bIdx*40, top: 250, w: 300, h: 250});
    });

    notes.forEach((n, i) => {
        const nb = document.createElement('div');
        nb.className = 'widget';
        const nKey = `pos_note_id_${n.id}`;
        nb.innerHTML = `<div class="widget-header"><input type="text" value="${n.title}"><span class="cat-btn note-del">🗑️</span></div><textarea>${n.body}</textarea>`;
        const nt = nb.querySelector('input'), ni = nb.querySelector('textarea');
        nt.oninput = () => { notes[i].title = nt.value; saveNotes(); };
        ni.oninput = () => { notes[i].body = ni.value; saveNotes(); };
        nb.querySelector('.note-del').onclick = () => { notes.splice(i, 1); saveNotes(); render(); };
        container.appendChild(nb);
        makeWidget(nb, nKey, {left: 400, top: 100, w: 300, h: 200});
    });
}

// --- 7. ボタンアクション設定 ---
function setupButtonActions() {
    document.getElementById('add-cat-btn').onclick = () => {
        const keys = Object.keys(bookmarkCatalog);
        // インポート前でも 0 で作成可能にするため、ここでの return は行わない
        
        let msg = "追加するカテゴリ番号を入力:\n[0] 新規空BOX\n";
        keys.forEach((n, i) => msg += `[${i+1}] ${n}\n`);
        const c = prompt(msg);
        if (c === null) return;
        
        if (c === "0") {
            const n = prompt("名前:");
            if(n) {
                links.push({ id: Date.now(), category: n, items: [] });
                saveLinks(); render();
            }
        } else if (keys[c-1]) {
            // トラブル修正箇所：bookmarkCatalog から links 配列へ確実にデータをコピー
            links.push({ 
                id: Date.now(), 
                category: keys[c-1], 
                items: JSON.parse(JSON.stringify(bookmarkCatalog[keys[c-1]])) 
            });
            saveLinks(); render();
        }
    };

    document.getElementById('ai-btn').onclick = () => {
        let ai = localStorage.getItem('orbitTab_last_ai');
        if (!ai) {
            const c = prompt("[1] Gemini [2] ChatGPT [3] Claude", "1");
            const urls = { "1": "https://gemini.google.com/app", "2": "https://chatgpt.com/", "3": "https://claude.ai/" };
            ai = urls[c]; if(ai) localStorage.setItem('orbitTab_last_ai', ai);
        }
        if (ai) {
            chrome.sidePanel.setOptions({ path: ai, enabled: true });
            chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        }
    };
    document.getElementById('ai-btn').oncontextmenu = (e) => { e.preventDefault(); localStorage.removeItem('orbitTab_last_ai'); alert("リセット完了"); };
    document.getElementById('guide-btn').onclick = () => window.open(chrome.runtime.getURL('guide.html'), '_blank');
    document.getElementById('cal-setup-btn').onclick = () => window.open('https://calendar.google.com/', '_blank');
    document.getElementById('note-setup-btn').onclick = () => { notes.push({id: Date.now(), title: "メモ", body: ""}); saveNotes(); render(); };
}

// --- 8. 初期化処理 ---
window.onload = () => { 
    updateClock(); setInterval(updateClock, 1000); render(); setupImportFeature(); setupButtonActions(); 
    const bg = localStorage.getItem('orbitTab_bg_v4');
    if (bg) document.getElementById('bg-container').style.backgroundImage = `url(${bg})`;
};