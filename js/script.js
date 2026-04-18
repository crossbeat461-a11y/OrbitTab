// ==========================================
// 0. 初期設定 & 定数
// ==========================================
const DB_NAME = "OrbitTabDB"; [cite: 1]
const STORE_NAME = "settings"; [cite: 1]
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; [cite: 1]

const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
}; [cite: 2]

const DEFAULT_NOTE_DATA = { title: "タスク", body: "🚀 OrbitTab へようこそ！" }; [cite: 3]
const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"; [cite: 3]

let maxZIndex = 100; [cite: 5]

// ==========================================
// 1. ユーティリティ & データ管理
// ==========================================
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key); [cite: 5]
        return item === null ? defaultValue : JSON.parse(item); [cite: 6]
    } catch (e) { return defaultValue; }
}

let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS); [cite: 16]
let calUrl = localStorage.getItem('orbitTab_calUrl') || ""; [cite: 16]
let notes = getSafeStorage('orbitTab_notes_v4', [DEFAULT_NOTE_DATA]); // 複数付箋対応

function updateClock() {
    const clockEl = document.getElementById('clock'); [cite: 7]
    const dateEl = document.getElementById('date'); [cite: 7]
    if (!clockEl || !dateEl) return;
    const now = new Date(); [cite: 7]
    clockEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; [cite: 8]
    dateEl.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }); [cite: 8]
}
setInterval(updateClock, 1000); [cite: 8]
updateClock(); [cite: 8]

// ==========================================
// 2. 背景画像管理 (IndexedDB)
// ==========================================
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); [cite: 9]
        request.onupgradeneeded = e => {
            if (!e.target.result.objectStoreNames.contains(STORE_NAME)) e.target.result.createObjectStore(STORE_NAME); [cite: 9]
        };
        request.onsuccess = e => resolve(e.target.result); [cite: 9]
        request.onerror = e => reject(e.target.error); [cite: 9]
    });
}

async function loadBackground() {
    const bg = document.getElementById('bg-container'); [cite: 11]
    if (!bg) return;
    try {
        const db = await openDB(); [cite: 11]
        const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("background"); [cite: 11]
        request.onsuccess = () => {
            if (request.result) {
                bg.style.backgroundImage = `url(${request.result})`; [cite: 12]
            } else {
                bg.style.background = DEFAULT_BG_STYLE; [cite: 12]
            }
            setTimeout(() => { bg.style.opacity = 1; }, 50); [cite: 12]
        };
    } catch (err) {
        bg.style.background = DEFAULT_BG_STYLE; [cite: 13]
        bg.style.opacity = 1; [cite: 13]
    }
}

// ==========================================
// 3. ウィジェット機能 (ドラッグ & リサイズ)
// ==========================================
function makeWidget(el, storageKey, defaultLayout) {
    if (!el) return;
    let isDragging = false, isResizing = false; [cite: 14]
    let startX, startY, startW, startH, startLeft, startTop; [cite: 14]

    const saved = getSafeStorage(storageKey, defaultLayout);
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    const resizer = el.querySelector('.resizer') || document.createElement('div');
    resizer.className = 'resizer';
    if (!el.querySelector('.resizer')) el.appendChild(resizer);
    
    resizer.onmousedown = (e) => {
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        e.stopPropagation();
        bringToFront(el);
    };

    const header = el.querySelector('.widget-header');
    el.onmousedown = () => bringToFront(el);
    
    if (header) {
        header.onmousedown = (e) => {
            if (e.button !== 0 || e.target.classList.contains('cat-delete-btn') || e.target.tagName === 'INPUT') return;
            isDragging = true;
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

function bringToFront(el) {
    maxZIndex++; [cite: 15]
    el.style.zIndex = maxZIndex; [cite: 15]
}

// ==========================================
// 4. レンダリング管理
// ==========================================
function saveAndRender() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); [cite: 17]
    renderBoard(); [cite: 17]
}

function renderBoard() {
    const container = document.getElementById('widgets-container'); [cite: 18]
    if (!container) return;
    container.innerHTML = ""; 

    // カテゴリBOX描画
    Object.keys(links).forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title" style="color:#00d2ff;">${cat}</span>
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;
        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm("このカテゴリを削除しますか？")) { delete links[cat]; saveAndRender(); }
        };
        const listDiv = box.querySelector('.link-list');
        links[cat].forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = `<span class="link-title">${item.title}</span><span class="delete-btn">&times;</span>`;
            wrap.querySelector('.link-title').onclick = () => window.open(item.url, '_blank');
            wrap.querySelector('.delete-btn').onclick = () => { links[cat].splice(idx, 1); saveAndRender(); };
            listDiv.appendChild(wrap);
        });
        container.appendChild(box);
        makeWidget(box, `layout_cat_${cat}`, { left: 100 + (index*340), top: 700, w: 320, h: 300 });
    });

    // 付箋の描画 (複数対応 & 見出し機能)
    notes.forEach((data, idx) => {
        const note = document.createElement('div');
        note.className = 'widget note-box';
        note.innerHTML = `
            <div class="widget-header">
                <input type="text" class="nt-input" value="${data.title}" placeholder="見出し">
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <textarea class="ni-textarea" placeholder="メモを入力...">${data.body}</textarea>`;
        container.appendChild(note);
        makeWidget(note, `layout_note_${idx}`, { left: 680 + (idx * 30), top: 250 + (idx * 30), w: 300, h: 300 });

        const nt = note.querySelector('.nt-input');
        const ni = note.querySelector('.ni-textarea');
        const del = note.querySelector('.cat-delete-btn');

        const save = () => {
            notes[idx] = { title: nt.value, body: ni.value };
            localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
        };
        nt.oninput = save; ni.oninput = save;
        del.onclick = () => {
            if (confirm("付箋を削除しますか？")) {
                notes.splice(idx, 1);
                localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
                renderBoard();
            }
        };
    });

    // カレンダー
    if (calUrl) {
        const cal = document.createElement('div');
        cal.className = 'widget';
        cal.innerHTML = `<div class="widget-header"><span class="widget-title">Calendar</span><span class="cat-delete-btn" id="del-cal">🗑️</span></div><iframe src="${calUrl}" class="calendar-iframe"></iframe>`;
        container.appendChild(cal);
        makeWidget(cal, 'layout_cal', { left: 100, top: 250, w: 500, h: 400 });
        document.getElementById('del-cal').onclick = () => {
            calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard();
        };
    }
}

// ==========================================
// 5. ボタンアクション
// ==========================================
document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank'); [cite: 19]

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリー名:"); [cite: 19]
    if (n && n.trim()) {
        const name = n.trim(); [cite: 20]
        if (!links[name]) { links[name] = []; saveAndRender(); } [cite: 20]
    }
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("GoogleカレンダーのURL（srcの中身）:"); [cite: 21]
    if (u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); renderBoard(); } [cite: 21]
};

document.getElementById('note-setup-btn').onclick = () => {
    if (notes.length >= 4) return alert("付箋は最大4つまでです。");
    notes.push({ title: "タスク", body: "" });
    localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes));
    renderBoard();
};

const bgInput = document.getElementById('bg-input'); [cite: 21]
document.getElementById('bg-change-btn').onclick = () => bgInput.click(); [cite: 21]
bgInput.onchange = e => {
    const f = e.target.files[0]; [cite: 21]
    if (f) {
        const r = new FileReader(); [cite: 21]
        r.onload = async ev => {
            const data = ev.target.result; [cite: 21]
            document.getElementById('bg-container').style.backgroundImage = `url(${data})`; [cite: 21]
            const db = await openDB(); [cite: 21]
            db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(data, "background"); [cite: 21]
        };
        r.readAsDataURL(f); [cite: 21]
    }
};

window.addEventListener('DOMContentLoaded', () => {
    loadBackground(); [cite: 22]
    renderBoard(); [cite: 22]
});