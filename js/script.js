// ==========================================
// 0. 定数と初期データ
// ==========================================
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; 
const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
};
const WELCOME_NOTE = { title: "タスク", body: "🚀 OrbitTab へようこそ！" };
let maxZIndex = 100;

// データの読み込み
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item === null ? defaultValue : JSON.parse(item);
    } catch (e) { return defaultValue; }
}

let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let notes = getSafeStorage('orbitTab_notes_v3', [WELCOME_NOTE]);

// ==========================================
// 1. 時計
// ==========================================
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
// 2. ウィジェット基本機能（ドラッグ等）
// ==========================================
function bringToFront(el) {
    maxZIndex++;
    el.style.zIndex = maxZIndex;
}

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
    resizer.className = 'resizer';
    el.appendChild(resizer);
    
    resizer.onmousedown = (e) => {
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        e.stopPropagation();
        bringToFront(el);
    };

    const header = el.querySelector('.widget-header');
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

// ==========================================
// 3. 描画メイン
// ==========================================
function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = ""; 

    // カテゴリBOXの描画
    Object.keys(links).forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${cat}</span>
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;

        // 削除
        box.querySelector('.cat-delete-btn').onclick = (e) => {
            if (confirm(`カテゴリー「${cat}」を削除しますか？`)) {
                delete links[cat];
                saveAndRender();
            }
        };

        // リンク一覧
        const listDiv = box.querySelector('.link-list');
        (links[cat] || []).forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = `<span class="link-title">${item.title}</span><span class="delete-btn">&times;</span>`;
            wrap.querySelector('.link-title').onclick = () => window.open(item.url, '_blank');
            wrap.querySelector('.delete-btn').onclick = (e) => { 
                links[cat].splice(idx, 1); 
                saveAndRender(); 
            };
            listDiv.appendChild(wrap);
        });

        container.appendChild(box);
        makeWidget(box, `orbitTab_cat_${cat}`, { left: 100 + (index * 340), top: 600, w: 320, h: 250 });
    });

    // 付箋
    notes.forEach((data, idx) => {
        const note = document.createElement('div');
        note.className = 'widget note-box';
        note.innerHTML = `
            <div class="widget-header">
                <input type="text" class="nt-input" value="${data.title}">
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <textarea class="ni-textarea">${data.body}</textarea>`;
        container.appendChild(note);
        makeWidget(note, `orbitTab_note_${idx}`, { left: 680 + (idx * 40), top: 250 + (idx * 40), w: 300, h: 250 });

        const nt = note.querySelector('.nt-input');
        const ni = note.querySelector('.ni-textarea');
        const del = note.querySelector('.cat-delete-btn');

        nt.oninput = () => { notes[idx].title = nt.value; localStorage.setItem('orbitTab_notes_v3', JSON.stringify(notes)); };
        ni.oninput = () => { notes[idx].body = ni.value; localStorage.setItem('orbitTab_notes_v3', JSON.stringify(notes)); };
        del.onclick = () => { notes.splice(idx, 1); localStorage.setItem('orbitTab_notes_v3', JSON.stringify(notes)); renderBoard(); };
    });

    // カレンダー
    if (calUrl) {
        const cal = document.createElement('div');
        cal.className = 'widget';
        cal.innerHTML = `<div class="widget-header"><span class="widget-title">Schedule</span><span class="cat-delete-btn" id="del-cal">🗑️</span></div><iframe src="${calUrl}" class="calendar-iframe"></iframe>`;
        container.appendChild(cal);
        makeWidget(cal, 'orbitTab_cal', { left: 100, top: 200, w: 500, h: 400 });
        document.getElementById('del-cal').onclick = () => { calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard(); };
    }
}

function saveAndRender() {
    localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    renderBoard();
}

// ==========================================
// 4. ボタン
// ==========================================
document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank');
document.getElementById('bg-change-btn').onclick = () => document.getElementById('bg-input').click();

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("カテゴリー名:");
    if (n && n.trim()) {
        const name = n.trim();
        if (!links[name]) {
            links[name] = [];
            saveAndRender();
        }
    }
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("Googleカレンダーの埋め込みURL:");
    if (u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); renderBoard(); }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (notes.length >= 4) return;
    notes.push({ title: "タスク", body: "" });
    localStorage.setItem('orbitTab_notes_v3', JSON.stringify(notes));
    renderBoard();
};

// 起動
window.onload = () => {
    renderBoard();
    const bg = document.getElementById('bg-container');
    if(bg) bg.style.opacity = 1;
};