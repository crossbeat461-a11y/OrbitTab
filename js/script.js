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

const WELCOME_MSG = "🚀 OrbitTab へようこそ！\n\n・全ての窓は、上のグレー部分を掴んで移動、右下でサイズ変更できます。";
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
                // background全体ではなくbackgroundImageのみを更新し、CSSのcover設定を活かす [cite: 6]
                bg.style.backgroundImage = `url(${request.result})`;
            } else {
                bg.style.background = DEFAULT_BG_STYLE;
            }
            // 画像セット後にフェードイン。 transition はCSS側 [cite: 7]
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
        if (e.button !== 0) return; // 左クリックのみ
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        e.stopPropagation();
        bringToFront(el);
        document.body.style.userSelect = 'none';
    };

    const header = el.querySelector('.widget-header');
    el.onmousedown = () => bringToFront(el);
    
    if (header) {
        header.onmousedown = (e) => {
            // ★超重要：左クリックかつControlなしの時だけドラッグ。右クリックは編集用
            if (e.button !== 0 || e.ctrlKey) return; 
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

    // ★NotFoundError対策：安全な削除
    const existingBoxes = container.querySelectorAll('.category-box');
    existingBoxes.forEach(w => {
        if (container.contains(w)) {
            container.removeChild(w);
        }
    });

    Object.keys(links).forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.innerHTML = `
            <div class="widget-header" style="user-select: none; -webkit-user-select: none;">
                <h3 class="widget-title" style="color:#00d2ff; pointer-events: none;">${cat}</h3>
                <span class="cat-delete-btn">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;

        const header = box.querySelector('.widget-header');

        // 名前変更 (インライン編集)
        const renameHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const titleEl = header.querySelector('.widget-title');
            if (!titleEl) return;

            const currentName = cat;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.style.cssText = 'width: 100%; border: none; background: transparent; color: #00d2ff; font-size: inherit; font-weight: bold; outline: none;';
            
            titleEl.replaceWith(input);
            input.focus();
            input.select();
            
            const save = () => {
                const newName = input.value.trim();
                if (newName && newName !== currentName) {
                    const name = newName.substring(0, 20);
                    links[name] = links[cat];
                    delete links[cat];
                    
                    const oldKey = `orbitTab_layout_cat_${cat}`;
                    const newKey = `orbitTab_layout_cat_${name}`;
                    const oldLayout = localStorage.getItem(oldKey);
                    if (oldLayout) {
                        localStorage.setItem(newKey, oldLayout);
                        localStorage.removeItem(oldKey);
                    }
                    saveAndRender();
                } else {
                    renderBoard();
                }
            };
            
            input.addEventListener('blur', save, { once: true });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') renderBoard();
            });
        };

        header.addEventListener('contextmenu', renameHandler);
        header.addEventListener('dblclick', renameHandler);

        box.querySelector('.cat-delete-btn').onclick = (e) => {
            e.stopPropagation();
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
            
            wrap.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const titleEl = wrap.querySelector('.link-title');
                const currentTitle = item.title;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentTitle;
                input.style.cssText = 'width: 100%; border: none; background: transparent; color: inherit; outline: none;';
                
                titleEl.replaceWith(input);
                input.focus();
                input.select();
                
                const saveLink = () => {
                    const newTitle = input.value.trim();
                    if (newTitle) {
                        item.title = newTitle;
                        saveAndRender();
                    } else {
                        renderBoard();
                    }
                };
                
                input.addEventListener('blur', saveLink, { once: true });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveLink();
                    if (e.key === 'Escape') renderBoard();
                });
            });
            
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
// 5. ボタンイベント & 起動
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
            const bg = document.getElementById('bg-container');
            // backgroundImage だけをセットし、CSSの cover 設定を維持する [cite: 6]
            bg.style.backgroundImage = `url(${data})`;
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