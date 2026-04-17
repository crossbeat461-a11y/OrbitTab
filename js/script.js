// ==========================================
// 0. 初期設定 & 定数
// ==========================================
const DB_NAME = "OrbitTabDB";
const STORE_NAME = "settings";
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; 

const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ],
    "OrbitTab Guide": [
        { title: "使いこなしガイド (note)", url: NOTE_URL }
    ]
};

// 【修正】付箋の初期値をオブジェクト形式に変更（見出し対応）
const WELCOME_NOTE = {
    title: "タスク",
    body: "🚀 OrbitTab へようこそ！\n\n・各窓はグレー部分を掴んで移動、右下でサイズ変更できます。"
};
const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

const INITIAL_LAYOUT = {
    calendar: { left: 100, top: 250, w: 500, h: 400 },
    note:     { left: 680, top: 250, w: 500, h: 400 },
    cats: [
        { left: 100, top: 700, w: 320, h: 300 }
    ]
};

let maxZIndex = 100;

// ==========================================
// 1. ユーティリティ
// ==========================================
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item === null ? defaultValue : JSON.parse(item);
    } catch (e) { return defaultValue; }
}

function updateClock() {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    if (!clockEl || !dateEl) return;
    const now = new Date();
    clockEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    dateEl.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. 背景画像管理 (IndexedDB)
// ==========================================
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onupgradeneeded = e => {
            if (!e.target.result.objectStoreNames.contains(STORE_NAME)) e.target.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

async function loadBackground() {
    const bg = document.getElementById('bg-container');
    if (!bg) return;
    try {
        const db = await openDB();
        const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("background");
        request.onsuccess = () => {
            if (request.result) {
                bg.style.backgroundImage = `url(${request.result})`;
            } else {
                bg.style.background = DEFAULT_BG_STYLE;
            }
            setTimeout(() => { bg.style.opacity = 1; }, 50);
        };
    } catch (err) {
        bg.style.background = DEFAULT_BG_STYLE;
        bg.style.opacity = 1;
    }
}

// ==========================================
// 3. ウィジェット化コア関数
// ==========================================
function makeWidget(el, storageKey, defaultLayout) {
    if (!el) return;
    let isDragging = false, isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    const saved = getSafeStorage(storageKey, defaultLayout);
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    const resizer = el.querySelector('.resizer') || document.createElement('div');
    if (!el.querySelector('.resizer')) {
        resizer.className = 'resizer';
        el.appendChild(resizer);
    }
    
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
            if (e.button !== 0 || e.target.classList.contains('cat-delete-btn')) return;
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
    maxZIndex++;
    el.style.zIndex = maxZIndex;
    document.querySelectorAll('.widget').forEach(w => w.classList.remove('active'));
    el.classList.add('active');
}

// ==========================================
// 4. メインレンダリング
// ==========================================
let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
// 【修正】付箋データをオブジェクトとして取得
let noteData = getSafeStorage('orbitTab_note_v2', WELCOME_NOTE);

function saveAndRender() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    renderBoard();
}

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;

    const existingBoxes = container.querySelectorAll('.category-box');
    existingBoxes.forEach(w => { if (container.contains(w)) container.removeChild(w); });

    Object.keys(links).forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title" style="color:#00d2ff;">${cat}</h3>
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;
        // ... (リンク集のドラッグ&ドロップ等の処理は既存のまま) ...
        // 省略していますが、既存のlinks描画ロジックをここに維持してください
        
        container.appendChild(box);
        const layout = INITIAL_LAYOUT.cats[index] || { left: 480, top: 400, w: 320, h: 300 };
        makeWidget(box, `orbitTab_layout_cat_${cat}`, layout);
    });

    renderSpecialWidgets();
}

function renderSpecialWidgets() {
    const calWidget = document.getElementById('cal-widget');
    const noteWidget = document.getElementById('note-widget');

    // カレンダー表示
    if (calUrl) {
        calWidget.style.display = 'flex';
        calWidget.innerHTML = `
            <div class="widget-header"><h3 class="widget-title">Schedule</h3><span class="cat-delete-btn" id="del-cal-btn">🗑️</span></div>
            <iframe src="${calUrl}" class="calendar-iframe"></iframe>
        `;
        makeWidget(calWidget, 'orbitTab_layout_cal', INITIAL_LAYOUT.calendar);
        document.getElementById('del-cal-btn').onclick = () => {
            if (confirm("解除しますか？")) { calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard(); }
        };
    } else { calWidget.style.display = 'none'; }

    // 【修正】付箋（見出し対応版）の表示
    if (noteData !== null) {
        noteWidget.style.display = 'flex';
        noteWidget.innerHTML = `
            <div class="widget-header">
                <input type="text" id="note-title" value="${noteData.title}" placeholder="見出し">
                <span class="cat-delete-btn" id="del-note-btn">🗑️</span>
            </div>
            <textarea class="note-textarea" id="note-input" placeholder="メモを入力...">${noteData.body}</textarea>
        `;
        makeWidget(noteWidget, 'orbitTab_layout_note', INITIAL_LAYOUT.note);
        
        const nt = document.getElementById('note-title');
        const ni = document.getElementById('note-input');
        
        const saveNote = () => {
            noteData = { title: nt.value, body: ni.value };
            localStorage.setItem('orbitTab_note_v2', JSON.stringify(noteData));
        };
        
        nt.oninput = saveNote;
        ni.oninput = saveNote;
        
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("付箋を削除しますか？")) { noteData = null; localStorage.removeItem('orbitTab_note_v2'); renderBoard(); }
        };
    } else { noteWidget.style.display = 'none'; }
}

// ==========================================
// 5. ボタンイベント & 起動
// ==========================================
document.getElementById('note-setup-btn').onclick = () => {
    if (noteData === null) {
        noteData = { title: "タスク", body: "" };
        renderBoard();
    }
};

// ... (他のボタンイベント：add-cat-btn, cal-setup-btn, bg-change-btn は既存のまま) ...

window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
});