/**
 * OrbitTab - デジタル管制塔 
 * js/script.js (v1.3.2: 安定版 - サイズ維持・削除バグ修正済み)
 */

const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const DEFAULT_NOTE = [{ title: "🚀 OrbitTab クイックガイド", body: "1. 右下の【📥】をクリックして、PCに保存したブックマークHTMLを読み込みます。\n\n2. 次に【＋】をクリックすると、読み込んだフォルダがリストで表示されます。\n\n3. 番号を入力して、自分だけのカテゴリBOXを完成させましょう！" }];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    try { return (val === null) ? def : JSON.parse(val); } catch(e) { return def; }
}

let links = getStored('orbitTab_v1_links', {});
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let bookmarkCatalog = {}; 
let maxZ = 100;

function saveLinks() { localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); }
function saveNotes() { localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); }

function updateClock() {
    const clock = document.getElementById('clock'), date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function makeWidget(el, key, def) {
    const pos = getStored(key, def);
    el.style.left = pos.left + "px"; el.style.top = pos.top + "px";
    el.style.width = pos.w + "px"; el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    header.onmousedown = function(e) {
        if (e.target.closest('.cat-btn') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.closest('.delete-link-btn')) return;
        maxZ++; el.style.zIndex = maxZ;
        let startX = e.clientX - el.offsetLeft, startY = e.clientY - el.offsetTop;
        document.onmousemove = function(me) {
            el.style.left = (me.clientX - startX) + "px";
            el.style.top = (me.clientY - startY) + "px";
        };
        document.onmouseup = function() { document.onmousemove = null; savePos(el, key); };
    };
    new ResizeObserver(() => savePos(el, key)).observe(el);
    el.onclick = () => { maxZ++; el.style.zIndex = maxZ; };
}

function savePos(el, key) {
    localStorage.setItem(key, JSON.stringify({ left: el.offsetLeft, top: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
}

function setupImportFeature() {
    const importBtn = document.getElementById('import-bookmarks-btn'), input = document.getElementById('bookmark-input');
    if (importBtn && input) {
        importBtn.onclick = () => input.click();
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const doc = new DOMParser().parseFromString(ev.target.result, 'text/html');
                bookmarkCatalog = {};
                doc.querySelectorAll('a').forEach(a => {
                    let folder = "未分類", p = a.parentElement;
                    while (p && p !== doc.body) { const h3 = p.querySelector('h3'); if (h3) { folder = h3.textContent; break; } p = p.parentElement; }
                    if (!bookmarkCatalog[folder]) bookmarkCatalog[folder] = [];
                    bookmarkCatalog[folder].push({ title: a.textContent, url: a.href });
                });
                alert("読み込み完了！");
            };
            reader.readAsText(file);
        };
    }
    const bgBtn = document.getElementById('bg-change-btn'), bgInput = document.getElementById('bg-input');
    if (bgBtn && bgInput) {
        bgBtn.onclick = () => bgInput.click();
        bgInput.onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('bg-container').style.backgroundImage = `url(${ev.target.result})`;
                localStorage.setItem('orbitTab_bg_v4', ev.target.result);
            };
            reader.readAsDataURL(e.target.files[0]);
        };
    }
}

function openSidePanel(url) {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
        chrome.sidePanel.setOptions({ path: url, enabled: true });
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }).catch(() => window.open(url, '_blank'));
    } else { window.open(url, '_blank'); }
}

function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    Object.keys(links).forEach((cat) => {
        const box = document.createElement('div');
        box.className = 'widget';
        box.innerHTML = `<div class="widget-header"><span class="widget-title">${cat}</span><div class="header-btns">
            <span class="cat-btn add-single-btn" title="手動追加">➕</span><span class="cat-btn cat-delete-btn" title="カテゴリ削除">🗑️</span>
        </div></div><div class="link-list"></div>`;
        
        box.querySelector('.add-single-btn').onclick = (e) => {
            e.stopPropagation();
            const t = prompt("名前:"), u = prompt("URL:");
            if (t && u) { links[cat].push({ title: t, url: u }); saveLinks(); render(); }
        };

        box.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
            if(confirm(`「${cat}」を削除？`)) { delete links[cat]; saveLinks(); render(); }
        };

        const list = box.querySelector('.link-list');
        (links[cat] || []).forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'link-wrapper link-item';
            row.innerHTML = `<span>${item.title}</span><span class="delete-link-btn">×</span>`;
            row.onclick = () => window.open(item.url, '_blank');
            row.querySelector('.delete-link-btn').onclick = (e) => {
                e.stopPropagation();
                if(confirm(`削除しますか？`)) { links[cat].splice(index, 1); saveLinks(); render(); }
            };
            list.appendChild(row);
        });

        container.appendChild(box);
        const safeKey = "pos_cat_" + cat.replace(/\s+/g, '_');
        makeWidget(box, safeKey, {left: 100, top: 550, w: 300, h: 250});
    });

    notes.forEach((n, i) => {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = `<div class="widget-header"><input type="text" class="nt-input" value="${n.title}"><span class="cat-btn cat-delete-btn">🗑️</span></div><textarea class="ni-textarea">${n.body}</textarea>`;
        const nt = nb.querySelector('.nt-input'), ni = nb.querySelector('.ni-textarea');
        nt.onmousedown = ni.onmousedown = (e) => e.stopPropagation();
        nt.oninput = () => { notes[i].title = nt.value; saveNotes(); };
        ni.oninput = () => { notes[i].body = ni.value; saveNotes(); };
        nb.querySelector('.cat-delete-btn').onclick = () => { notes.splice(i, 1); saveNotes(); render(); };
        container.appendChild(nb);
        makeWidget(nb, `pos_note_${i}`, {left: 400 + i*50, top: 150, w: 320, h: 280});
    });
}

function setupButtonActions() {
    document.getElementById('add-cat-btn').onclick = () => {
        const keys = Object.keys(bookmarkCatalog);
        let msg = "[0] 新規作成\n";
        keys.forEach((n, i) => msg += `[${i+1}] ${n}\n`);
        const c = prompt(msg);
        if (c === "0") { const n = prompt("名前:"); if(n){links[n]=[]; saveLinks(); render();} }
        else if (keys[c-1]) { links[keys[c-1]] = [...bookmarkCatalog[keys[c-1]]]; saveLinks(); render(); }
    };

    document.getElementById('ai-btn').onclick = () => {
        let ai = localStorage.getItem('orbitTab_last_ai');
        if (!ai) {
            const c = prompt("[1] Gemini [2] ChatGPT [3] Claude", "1");
            const urls = { "1": "https://gemini.google.com/app", "2": "https://chatgpt.com/", "3": "https://claude.ai/" };
            if (urls[c]) { ai = urls[c]; localStorage.setItem('orbitTab_last_ai', ai); }
        }
        if (ai) openSidePanel(ai);
    };

    document.getElementById('ai-btn').oncontextmenu = (e) => {
        e.preventDefault(); localStorage.removeItem('orbitTab_last_ai'); alert("リセット完了");
    };

    document.getElementById('guide-btn').onclick = () => window.open(chrome.runtime.getURL('guide.html'), '_blank');
    document.getElementById('cal-setup-btn').onclick = () => window.open('https://calendar.google.com/', '_blank');
    document.getElementById('note-setup-btn').onclick = () => { notes.push({title: "新規付箋", body: ""}); saveNotes(); render(); };
}

window.onload = function() { 
    updateClock(); setInterval(updateClock, 1000); render(); setupImportFeature(); setupButtonActions();
    const bg = localStorage.getItem('orbitTab_bg_v4');
    if (bg) document.getElementById('bg-container').style.backgroundImage = `url(${bg})`;
};