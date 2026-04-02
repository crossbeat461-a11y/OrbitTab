// ==========================================
// 1. 時計 & 日付更新機能
// ==========================================
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');

    if (clockElement) clockElement.innerText = `${h}:${m}`;
    if (dateElement) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        dateElement.innerText = now.toLocaleDateString('ja-JP', options);
    }
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. 背景画像管理 (IndexedDB v2)
// ==========================================
const dbName = "NestTabDB";
const storeName = "settings";

function openDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 2);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

async function loadBackground() {
    try {
        const db = await openDB();
        const request = db.transaction(storeName, "readonly").objectStore(storeName).get("background");
        request.onsuccess = () => {
            if (request.result) {
                const bg = document.getElementById('bg-container');
                bg.style.backgroundImage = `url(${request.result})`;
                bg.style.opacity = 1;
            }
        };
    } catch (err) { console.error("背景ロード失敗", err); }
}

// ==========================================
// 3. リンク & カテゴリ管理
// ==========================================
let links = JSON.parse(localStorage.getItem('nestTab_v3_links')) || { "Work": [], "Hobby": [] };

function saveAndRender() {
    localStorage.setItem('nestTab_v3_links', JSON.stringify(links));
    renderBoard();
}

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(links).forEach(cat => {
        const box = document.createElement('div');
        box.className = 'category-box';
        box.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">${cat}</h3>
                <span class="cat-delete-btn" title="カテゴリ削除">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;

        // カテゴリ削除
        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm(`カテゴリ「${cat}」を削除しますか？`)) {
                delete links[cat];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ登録
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => {
            e.preventDefault();
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                const html = e.dataTransfer.getData('text/html');
                let title = url;
                if (html) {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    title = doc.querySelector('a')?.textContent || doc.title || url;
                }
                links[cat].push({ title: title.trim(), url: url.trim() });
                saveAndRender();
            }
        };

        const listDiv = box.querySelector('.link-list');
        links[cat].forEach((item, index) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = `
                <span class="link-symbol">🔗</span>
                <span class="link-title" title="左: 開く / 右: 名前変更">${item.title}</span>
                <span class="delete-btn" title="削除">&times;</span>
            `;

            const titleSpan = wrap.querySelector('.link-title');
            titleSpan.onclick = () => window.open(item.url, '_blank');
            titleSpan.oncontextmenu = (e) => {
                e.preventDefault();
                const newT = prompt("名称を変更:", item.title);
                if (newT && newT.trim()) {
                    links[cat][index].title = newT.trim();
                    saveAndRender();
                }
            };

            wrap.querySelector('.delete-btn').onclick = () => {
                links[cat].splice(index, 1);
                saveAndRender();
            };
            listDiv.appendChild(wrap);
        });
        container.appendChild(box);
    });
}

// ==========================================
// 4. カレンダー & 付箋 (Sticky Note) 管理
// ==========================================
let calUrl = localStorage.getItem('nestTab_calUrl') || "";
let noteContent = localStorage.getItem('nestTab_note') || null; // nullならボックス自体非表示

function renderInfoRow() {
    const infoRow = document.getElementById('info-row');
    const calWrap = document.getElementById('calendar-wrapper');
    const noteWrap = document.getElementById('notes-wrapper');
    if (!infoRow || !calWrap || !noteWrap) return;

    // カレンダーの描画
    if (calUrl) {
        calWrap.style.display = 'block';
        calWrap.innerHTML = `
            <div class="calendar-box">
                <div class="category-header">
                    <h3 class="category-title">Schedule</h3>
                    <span class="cat-delete-btn" id="del-cal-btn">🗑️</span>
                </div>
                <iframe src="${calUrl}"></iframe>
            </div>`;
        document.getElementById('del-cal-btn').onclick = () => {
            if (confirm("カレンダー連携を解除しますか？")) {
                calUrl = "";
                localStorage.removeItem('nestTab_calUrl');
                renderInfoRow();
            }
        };
    } else {
        calWrap.style.display = 'none';
        calWrap.innerHTML = '';
    }

    // 付箋の描画
    if (noteContent !== null) {
        noteWrap.style.display = 'block';
        noteWrap.innerHTML = `
            <div class="note-box">
                <div class="category-header">
                    <h3 class="category-title">Sticky Note</h3>
                    <span class="cat-delete-btn" id="del-note-btn">🗑️</span>
                </div>
                <textarea class="note-textarea" id="note-input" placeholder="ここにメモを入力...">${noteContent}</textarea>
            </div>`;
        
        const input = document.getElementById('note-input');
        input.oninput = () => {
            noteContent = input.value;
            localStorage.setItem('nestTab_note', noteContent);
        };
        
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("付箋を削除しますか？")) {
                noteContent = null;
                localStorage.removeItem('nestTab_note');
                renderInfoRow();
            }
        };
    } else {
        noteWrap.style.display = 'none';
        noteWrap.innerHTML = '';
    }

    // カレンダーも付箋もなければ行ごと隠す
    infoRow.style.display = (calUrl || noteContent !== null) ? 'flex' : 'none';
}

// ==========================================
// 5. 操作ボタン & 初期化
// ==========================================

// カテゴリ追加
document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリ名:");
    if (n && !links[n]) {
        links[n] = [];
        saveAndRender();
    }
};

// カレンダー設定
document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("GoogleカレンダーのURLを入力してください:");
    if (u) {
        const match = u.match(/src="([^"]+)"/);
        calUrl = match ? match[1] : u;
        localStorage.setItem('nestTab_calUrl', calUrl);
        renderInfoRow();
    }
};

// 付箋追加
document.getElementById('note-setup-btn').onclick = () => {
    if (noteContent === null) {
        noteContent = "";
        localStorage.setItem('nestTab_note', "");
        renderInfoRow();
    }
};

// 背景変更
const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const data = ev.target.result;
            document.getElementById('bg-container').style.backgroundImage = `url(${data})`;
            document.getElementById('bg-container').style.opacity = 1;
            const db = await openDB();
            db.transaction(storeName, "readwrite").objectStore(storeName).put(data, "background");
        };
        reader.readAsDataURL(file);
    }
};

// 起動時処理
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
    renderInfoRow();
});