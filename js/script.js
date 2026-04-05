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

const WELCOME_MSG = "🚀 OrbitTab へようこそ！\n\nここはあなた専用のデジタル管制塔です。\n\n・全ての窓は、上のグレー部分を掴んで移動、右下でサイズ変更できます。";
const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

const INITIAL_LAYOUT = {
    calendar: { left: 100, top: 300, w: 500, h: 400 },
    note:     { left: 680, top: 300, w: 500, h: 400 },
    cats: [
        { left: 100, top: 750, w: 320, h: 300 },
        { left: 480, top: 750, w: 320, h: 300 },
        { left: 860, top: 750, w: 320, h: 300 }
    ]
};

let maxZIndex = 10;

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
            bg.style.opacity = 1;
        };
    } catch (err) {
        bg.style.background = DEFAULT_BG_STYLE;
        bg.style.opacity = 1;
    }
}

// ==========================================
// 3. ウィジェット化コア関数（競合防止版）
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

    if (!el.querySelector('.resizer')) {
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        el.appendChild(resizer);
        resizer.onmousedown = (e) => {
            if (e.button !== 0) return; // 左クリックのみ
            isResizing = true;
            startX = e.clientX; startY = e.clientY;
            startW = el.offsetWidth; startH = el.offsetHeight;
            e.stopPropagation();
            bringToFront(el);
            document.body.style.userSelect = 'none';
        };
    }

    const header = el.querySelector('.widget-header');
    el.onmousedown = () => bringToFront(el);
    if (header) {
        header.onmousedown = (e) => {
            // ★重要：左クリック(0)のみドラッグ。右クリックはスルーさせる
            if (e.button !== 0) return;
            if (e.target.classList.contains('cat-delete-btn')) return;
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
let noteContent = getSafeStorage('orbitTab_note', WELCOME_MSG);

function saveAndRender() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    renderBoard();
}

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;

    container.querySelectorAll('.category-box').forEach(w => w.remove());

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

        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm(`カテゴリー「${cat}」を削除しますか？`)) {
                delete links[cat];
                saveAndRender();
            }
        };

        box.ondragover = e => e.preventDefault();
        box.ondrop = e => {
            e.preventDefault();
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                let title = url;
                const html = e.dataTransfer.getData('text/html');
                if (html) {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    title = doc.querySelector('a')?.textContent || doc.title || url;
                }
                links[cat].push({ title: title.trim().substring(0, 100), url: url.trim() });
                saveAndRender();
            }
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
        const layout = INITIAL_LAYOUT.cats[index] || { left: 480, top: 400, w: 320, h: 300 };
        makeWidget(box, `orbitTab_layout_cat_${cat}`, layout);
    });

    renderSpecialWidgets();
}

function renderSpecialWidgets() {
    const calWidget = document.getElementById('cal-widget');
    const noteWidget = document.getElementById('note-widget');

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

    if (noteContent !== null) {
        noteWidget.style.display = 'flex';
        noteWidget.innerHTML = `
            <div class="widget-header"><h3 class="widget-title">Sticky Note</h3><span class="cat-delete-btn" id="del-note-btn">🗑️</span></div>
            <textarea class="note-textarea" id="note-input">${noteContent}</textarea>
        `;
        makeWidget(noteWidget, 'orbitTab_layout_note', INITIAL_LAYOUT.note);
        const ni = document.getElementById('note-input');
        ni.oninput = () => { noteContent = ni.value; localStorage.setItem('orbitTab_note', JSON.stringify(noteContent)); };
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("削除しますか？")) { noteContent = null; localStorage.removeItem('orbitTab_note'); renderBoard(); }
        };
    } else { noteWidget.style.display = 'none'; }
}

// ==========================================
// 5. 右クリック名前変更（決定版：Mac/Win両対応）
// ==========================================
document.addEventListener('contextmenu', (e) => {
    // 右クリックされた要素がヘッダーの中身かチェック
    const header = e.target.closest('.widget-header');
    if (!header) return;

    // カテゴリーボックスのみを対象にする
    const widget = header.closest('.category-box');
    if (!widget) return;

    e.preventDefault(); // システムメニューを確実にブロック

    const titleEl = header.querySelector('.widget-title');
    const oldName = titleEl.innerText;
    
    // ダイアログを表示
    const newName = prompt("新しいカテゴリー名を入力してください:", oldName);

    if (newName && newName.trim() !== "" && newName !== oldName) {
        const name = newName.trim().substring(0, 20);

        // データの移行
        links[name] = links[oldName];
        delete links[oldName];

        // レイアウトの引き継ぎ
        const oldKey = `orbitTab_layout_cat_${oldName}`;
        const newKey = `orbitTab_layout_cat_${name}`;
        const layoutData = localStorage.getItem(oldKey);
        if (layoutData) {
            localStorage.setItem(newKey, layoutData);
            localStorage.removeItem(oldKey);
        }

        saveAndRender(); 
        console.log(`名前を「${oldName}」から「${name}」に変更しました。`);
    }
}, true); // ★true（キャプチャリング）にすることで優先的にイベントを捕まえる

// ==========================================
// 6. ボタンイベント & 起動
// ==========================================
document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリー名:");
    if (n && n.trim()) {
        const name = n.trim().substring(0, 20);
        if (!links[name]) { links[name] = []; saveAndRender(); }
    }
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("Googleカレンダーの埋め込みURL:");
    if (u) {
        const match = u.match(/src="([^"]+)"/);
        calUrl = match ? match[1] : u;
        localStorage.setItem('orbitTab_calUrl', calUrl);
        renderBoard();
    }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (noteContent === null) { noteContent = ""; renderBoard(); }
};

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = e => {
    const f = e.target.files[0];
    if (f) {
        const r = new FileReader();
        r.onload = async ev => {
            const data = ev.target.result;
            document.getElementById('bg-container').style.backgroundImage = `url(${data})`;
            const db = await openDB();
            db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(data, "background");
        };
        r.readAsDataURL(f);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
});