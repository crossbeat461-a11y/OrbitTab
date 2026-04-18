// ==========================================
// 0. 初期設定 & 定数
// ==========================================
const DB_NAME = "OrbitTabDB";
const STORE_NAME = "settings";
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; [cite: 1]

const DEFAULT_LINKS = {
    "Favorites": [
        { title: "Google", url: "https://www.google.com" }
    ]
}; [cite: 2]

const DEFAULT_NOTE_DATA = { title: "タスク", body: "🚀 OrbitTab へようこそ！" }; [cite: 3]
const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"; [cite: 3]

let maxZIndex = 100; [cite: 5]

// データの読み込み [cite: 5]
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item === null ? defaultValue : JSON.parse(item);
    } catch (e) { return defaultValue; }
}

let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS); [cite: 16]
let calUrl = localStorage.getItem('orbitTab_calUrl') || ""; [cite: 16]
let notes = getSafeStorage('orbitTab_notes_v4', [DEFAULT_NOTE_DATA]); [cite: 16]

// ==========================================
// 1. 基本機能（時計 & 前面移動）
// ==========================================
function updateClock() { [cite: 7]
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (!clockEl || !dateEl) return;
    const now = new Date();
    clockEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; [cite: 8]
    dateEl.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }); [cite: 8]
}
setInterval(updateClock, 1000); [cite: 8]
updateClock(); [cite: 8]

function bringToFront(el) { [cite: 15]
    maxZIndex++;
    el.style.zIndex = maxZIndex;
}

// ==========================================
// 2. ウィジェット機能（ドラッグ & リサイズ）
// ==========================================
function makeWidget(el, storageKey, defaultLayout) { [cite: 13]
    if (!el) return;
    let isDragging = false, isResizing = false; [cite: 14]
    let startX, startY, startW, startH, startLeft, startTop; [cite: 14]

    const saved = getSafeStorage(storageKey, defaultLayout); [cite: 14]
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    const resizer = el.querySelector('.resizer') || document.createElement('div');
    resizer.className = 'resizer'; [cite: 44]
    if (!el.querySelector('.resizer')) el.appendChild(resizer);
    
    resizer.onmousedown = (e) => {
        isResizing = true; [cite: 14]
        startX = e.clientX; startY = e.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        e.stopPropagation();
        bringToFront(el);
    };

    const header = el.querySelector('.widget-header');
    el.onmousedown = () => bringToFront(el);
    
    if (header) {
        header.onmousedown = (e) => {
            if (e.button !== 0 || e.target.classList.contains('cat-delete-btn') || e.target.tagName === 'INPUT') return; [cite: 19]
            isDragging = true; [cite: 14]
            startX = e.clientX; startY = e.clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            bringToFront(el);
            document.body.style.userSelect = 'none';
        };
    }

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            el.style.left = (startLeft + (e.clientX - startX)) + 'px';
            el.style.top = (startTop + (e.clientY - startY)) + 'px';
        }
        if (isResizing) {
            el.style.width = (startW + (e.clientX - startX)) + 'px';
            el.style.height = (startH + (e.clientY - startY)) + 'px';
        }
    });

    window.addEventListener('mouseup', () => {
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

// ==========================================
// 3. 描画メイン
// ==========================================
function saveAndRender() { [cite: 17]
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    renderBoard();
}

function renderBoard() { [cite: 18]
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = ""; 

    // カテゴリBOXの描画
    Object.keys(links).forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box'; [cite: 18, 40]
        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title" style="color:#00d2ff;">${cat}</span>
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <div class="link-list"></div>
        `; [cite: 18, 43]

        box.querySelector('.cat-delete-btn').onclick = (e) => {
            if (confirm("このカテゴリーを削除しますか？")) {
                delete links[cat];
                saveAndRender();
            }
        };

        const listDiv = box.querySelector('.link-list');
        (links[cat] || []).forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper'; [cite: 48]
            wrap.innerHTML = `<span class="link-title">${item.title}</span><span class="delete-btn">&times;</span>`; [cite: 49]
            wrap.querySelector('.link-title').onclick = () => window.open(item.url, '_blank');
            wrap.querySelector('.delete-btn').onclick = () => { links[cat].splice(idx, 1); saveAndRender(); };
            listDiv.appendChild(wrap);
        });

        container.appendChild(box);
        // キーからスペースを除去して保存エラーを回避
        const safeKey = `pos_cat_${cat.replace(/\s+/g, '_')}`;
        makeWidget(box, safeKey, { left: 100 + (index * 340), top: 600, w: 320, h: 250 }); [cite: 4]
    });

    // 付箋
    notes.forEach((data, idx) => {
        const note = document.createElement('div');
        note.className = 'widget note-box'; [cite: 18, 40, 51]
        note.innerHTML = `
            <div class="widget-header">
                <input type="text" class="nt-input" value="${data.title}">
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <textarea class="ni-textarea">${data.body}</textarea>`; [cite: 51]
        container.appendChild(note);
        makeWidget(note, `pos_note_${idx}`, { left: 680 + (idx * 30), top: 250 + (idx * 30), w: 300, h: 250 }); [cite: 4]

        const nt = note.querySelector('.nt-input');
        const ni = note.querySelector('.ni-textarea');
        nt.oninput = () => { notes[idx].title = nt.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        ni.oninput = () => { notes[idx].body = ni.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        note.querySelector('.cat-delete-btn').onclick = () => {
            notes.splice(idx, 1); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); renderBoard();
        };
    });

    // カレンダー
    if (calUrl) {
        const cal = document.createElement('div');
        cal.className = 'widget'; [cite: 18, 40]
        cal.innerHTML = `<div class="widget-header"><span class="widget-title">Calendar</span><span class="cat-delete-btn" id="del-cal">🗑️</span></div><iframe src="${calUrl}" class="calendar-iframe"></iframe>`; [cite: 50]
        container.appendChild(cal);
        makeWidget(cal, 'pos_cal', { left: 100, top: 200, w: 500, h: 400 }); [cite: 4]
        document.getElementById('del-cal').onclick = () => { calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard(); };
    }
}

// ==========================================
// 4. ボタンアクション & 背景
// ==========================================
document.getElementById('add-cat-btn').onclick = () => { [cite: 19]
    const n = prompt("新しいカテゴリー名:");
    if (n && n.trim()) {
        const name = n.trim();
        if (!links[name]) { links[name] = []; saveAndRender(); }
    }
};

document.getElementById('note-setup-btn').onclick = () => { [cite: 21]
    if (notes.length >= 4) return alert("最大4つまでです");
    notes.push({ title: "タスク", body: "" });
    localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
    renderBoard();
};

document.getElementById('cal-setup-btn').onclick = () => { [cite: 21]
    const u = prompt("GoogleカレンダーのURL:");
    if (u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); renderBoard(); }
};

document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank'); [cite: 1]

// 背景 (IndexedDB)
async function loadBackground() { [cite: 11]
    const bg = document.getElementById('bg-container'); [cite: 27]
    if (!bg) return;
    try {
        const db = await openDB(); [cite: 9]
        const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("background"); [cite: 11]
        request.onsuccess = () => {
            if (request.result) bg.style.backgroundImage = `url(${request.result})`; [cite: 12]
            else bg.style.background = DEFAULT_BG_STYLE; [cite: 12]
            bg.style.opacity = 1; [cite: 12]
        };
    } catch (err) { bg.style.background = DEFAULT_BG_STYLE; bg.style.opacity = 1; }
}

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = e => {
    const f = e.target.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = async ev => {
            const data = ev.target.result;
            document.getElementById('bg-container').style.backgroundImage = `url(${data})`; [cite: 21]
            const db = await openDB();
            db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(data, "background"); [cite: 21]
        };
        r.readAsDataURL(f);
    }
};

window.onload = () => { [cite: 22]
    loadBackground();
    renderBoard();
};