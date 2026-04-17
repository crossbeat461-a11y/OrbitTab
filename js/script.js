// ==========================================
// 0. データの強制初期化と修復
// ==========================================
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; 

const DEFAULT_LINKS = {
    "Search": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
};

const DEFAULT_NOTES = [{ title: "タスク", body: "🚀 OrbitTabへようこそ" }];

// データを取得する関数（エラー時は初期値を返す）
function getStoredData(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        if (!item || item === "undefined") return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.error("Data Load Error:", e);
        return defaultValue;
    }
}

let links = getStoredData('orbitTab_links', DEFAULT_LINKS);
let notes = getStoredData('orbitTab_notes', DEFAULT_NOTES);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let maxZIndex = 100;

// ==========================================
// 1. 基本機能（時計・前面移動）
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

function bringToFront(el) {
    maxZIndex++;
    el.style.zIndex = maxZIndex;
}

// ==========================================
// 2. ドラッグ & リサイズ機能
// ==========================================
function makeWidget(el, storageKey, defaultLayout) {
    if (!el) return;
    let isDragging = false, isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    const saved = getStoredData(storageKey, defaultLayout);
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    const header = el.querySelector('.widget-header');
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

    if (header) {
        header.onmousedown = (e) => {
            if (e.target.classList.contains('cat-delete-btn') || e.target.tagName === 'INPUT') return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            startLeft = el.offsetLeft; startTop = el.offsetTop;
            bringToFront(el);
            document.body.style.userSelect = 'none';
        };
    }

    window.onmousemove = (e) => {
        if (isDragging) {
            el.style.left = (startLeft + (e.clientX - startX)) + 'px';
            el.style.top = (startTop + (e.clientY - startY)) + 'px';
        }
        if (isResizing) {
            el.style.width = (startW + (e.clientX - startX)) + 'px';
            el.style.height = (startH + (e.clientY - startY)) + 'px';
        }
    };

    window.onmouseup = () => {
        if (isDragging || isResizing) {
            localStorage.setItem(storageKey, JSON.stringify({
                left: parseInt(el.style.left), top: parseInt(el.style.top),
                w: parseInt(el.style.width), h: parseInt(el.style.height)
            }));
        }
        isDragging = false; isResizing = false;
        document.body.style.userSelect = 'auto';
    };
}

// ==========================================
// 3. 描画エンジン
// ==========================================
function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = ""; // 画面を一度空にする

    // --- カテゴリBOXの描画 ---
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

        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm("カテゴリーごと削除しますか？")) {
                delete links[cat];
                saveAndRender();
            }
        };

        const listDiv = box.querySelector('.link-list');
        (links[cat] || []).forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = `<span class="link-title">${item.title}</span><span class="delete-btn">&times;</span>`;
            wrap.querySelector('.link-title').onclick = () => window.open(item.url, '_blank');
            wrap.querySelector('.delete-btn').onclick = () => {
                links[cat].splice(idx, 1);
                saveAndRender();
            };
            listDiv.appendChild(wrap);
        });

        container.appendChild(box);
        makeWidget(box, `pos_cat_${cat}`, { left: 100 + (index * 340), top: 600, w: 320, h: 250 });
    });

    // --- 付箋の描画 ---
    notes.forEach((data, idx) => {
        const note = document.createElement('div');
        note.className = 'widget note-box';
        note.innerHTML = `
            <div class="widget-header">
                <input type="text" class="nt-input" value="${data.title}">
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <textarea class="ni-textarea">${data.body}</textarea>
        `;
        container.appendChild(note);
        makeWidget(note, `pos_note_${idx}`, { left: 680 + (idx * 30), top: 200 + (idx * 30), w: 300, h: 250 });

        const nt = note.querySelector('.nt-input');
        const ni = note.querySelector('.ni-textarea');
        nt.oninput = () => { notes[idx].title = nt.value; saveNotes(); };
        ni.oninput = () => { notes[idx].body = ni.value; saveNotes(); };
        note.querySelector('.cat-delete-btn').onclick = () => {
            notes.splice(idx, 1);
            saveNotes();
            renderBoard();
        };
    });

    // --- カレンダー描画 ---
    if (calUrl) {
        const cal = document.createElement('div');
        cal.className = 'widget';
        cal.innerHTML = `
            <div class="widget-header"><span class="widget-title">Calendar</span><span class="cat-delete-btn" id="del-cal">🗑️</span></div>
            <iframe src="${calUrl}" class="calendar-iframe"></iframe>
        `;
        container.appendChild(cal);
        makeWidget(cal, 'pos_cal', { left: 100, top: 200, w: 500, h: 400 });
        document.getElementById('del-cal').onclick = () => {
            calUrl = ""; localStorage.removeItem('orbitTab_calUrl'); renderBoard();
        };
    }
}

function saveAndRender() {
    localStorage.setItem('orbitTab_links', JSON.stringify(links));
    renderBoard();
}

function saveNotes() {
    localStorage.setItem('orbitTab_notes', JSON.stringify(notes));
}

// ==========================================
// 4. ボタンアクション
// ==========================================
window.onload = () => {
    renderBoard();
    const bg = document.getElementById('bg-container');
    if (bg) bg.style.opacity = 1;
};

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリー名:");
    if (n && n.trim()) {
        if (!links[n]) {
            links[n] = [];
            saveAndRender();
        }
    }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (notes.length >= 4) return;
    notes.push({ title: "タスク", body: "" });
    saveNotes();
    renderBoard();
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("カレンダーURL:");
    if (u) { calUrl = u; localStorage.setItem('orbitTab_calUrl', u); renderBoard(); }
};

document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank');
document.getElementById('bg-change-btn').onclick = () => document.getElementById('bg-input').click();