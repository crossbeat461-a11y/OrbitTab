// ==========================================
// 0. 安全なデータ取得ユーティリティ
// ==========================================
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.error(`Storage error for ${key}:`, e);
        return defaultValue;
    }
}

// ==========================================
// 1. 時計 & 日付更新機能
// ==========================================
function updateClock() {
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');
    if (!clockElement || !dateElement) return;

    const now = new Date();
    clockElement.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    dateElement.innerText = now.toLocaleDateString('ja-JP', options);
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. 背景画像管理 (IndexedDB)
// ==========================================
const dbName = "NestTabDB", storeName = "settings";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 2);
        request.onupgradeneeded = e => {
            if (!e.target.result.objectStoreNames.contains(storeName)) e.target.result.createObjectStore(storeName);
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

async function loadBackground() {
    try {
        const db = await openDB();
        const request = db.transaction(storeName, "readonly").objectStore(storeName).get("background");
        request.onsuccess = () => {
            const bg = document.getElementById('bg-container');
            if (request.result && bg) {
                bg.style.backgroundImage = `url(${request.result})`;
                bg.style.opacity = 1;
            } else if (bg) {
                bg.style.opacity = 1; // 背景がない場合はデフォルト色を表示
            }
        };
    } catch (err) {
        console.warn("Background load failed, using default color.", err);
        const bg = document.getElementById('bg-container');
        if (bg) bg.style.opacity = 1;
    }
}

// ==========================================
// 3. リンク & カテゴリ管理 (堅牢化版)
// ==========================================
// 初期値の設定をより安全に
let links = getSafeStorage('nestTab_v3_links', { "Work": [], "Hobby": [] });

function saveAndRender() {
    try {
        localStorage.setItem('nestTab_v3_links', JSON.stringify(links));
    } catch (e) {
        alert("保存容量がいっぱいです。不要なリンクを削除してください。");
    }
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

        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm(`カテゴリ「${cat}」を削除しますか？`)) {
                delete links[cat];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ
        box.ondragover = e => e.preventDefault();
        box.ondrop = e => {
            e.preventDefault();
            try {
                const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                if (url && url.startsWith('http')) {
                    const html = e.dataTransfer.getData('text/html');
                    let title = url;
                    if (html) {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        title = doc.querySelector('a')?.textContent || doc.title || url;
                    }
                    links[cat].push({ title: title.trim().substring(0, 100), url: url.trim() });
                    saveAndRender();
                }
            } catch (err) { console.error("Drop failed", err); }
        };

        const listDiv = box.querySelector('.link-list');
        links[cat].forEach((item, index) => {
            const wrap = document.createElement('div');
            wrap.className = 'link-wrapper';
            wrap.innerHTML = `
                <span class="link-symbol">🔗</span>
                <span class="link-title" title="右クリックで名前変更">${item.title}</span>
                <span class="delete-btn">&times;</span>
            `;

            const ts = wrap.querySelector('.link-title');
            ts.onclick = () => window.open(item.url, '_blank');
            ts.oncontextmenu = e => {
                e.preventDefault();
                const newT = prompt("名前を変更:", item.title);
                if (newT && newT.trim()) {
                    links[cat][index].title = newT.trim().substring(0, 100);
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
// 4. カレンダー & 付箋管理 (堅牢化版)
// ==========================================
let calUrl = localStorage.getItem('nestTab_calUrl') || "";
let noteContent = localStorage.getItem('nestTab_note') || null;

function renderInfoRow() {
    const infoRow = document.getElementById('info-row');
    const calWrap = document.getElementById('calendar-wrapper');
    const noteWrap = document.getElementById('notes-wrapper');
    if (!infoRow || !calWrap || !noteWrap) return;

    // カレンダー
    if (calUrl) {
        calWrap.style.display = 'block';
        calWrap.innerHTML = `
            <div class="calendar-box">
                <div class="category-header">
                    <h3 class="category-title">Schedule</h3>
                    <span class="cat-delete-btn" id="del-cal-btn">🗑️</span>
                </div>
                <iframe src="${calUrl}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            </div>`;
        document.getElementById('del-cal-btn').onclick = () => {
            if (confirm("解除しますか？")) { calUrl = ""; localStorage.removeItem('nestTab_calUrl'); renderInfoRow(); }
        };
    } else { calWrap.style.display = 'none'; }

    // 付箋
    if (noteContent !== null) {
        noteWrap.style.display = 'block';
        noteWrap.innerHTML = `
            <div class="note-box">
                <div class="category-header">
                    <h3 class="category-title">Sticky Note</h3>
                    <span class="cat-delete-btn" id="del-note-btn">🗑️</span>
                </div>
                <textarea class="note-textarea" id="note-input" placeholder="メモを入力...">${noteContent}</textarea>
            </div>`;
        const ni = document.getElementById('note-input');
        ni.oninput = () => {
            noteContent = ni.value.substring(0, 5000); // 最大5000文字に制限
            localStorage.setItem('nestTab_note', noteContent);
        };
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("削除しますか？")) { noteContent = null; localStorage.removeItem('nestTab_note'); renderInfoRow(); }
        };
    } else { noteWrap.style.display = 'none'; }

    infoRow.style.display = (calUrl || noteContent !== null) ? 'flex' : 'none';
}

// ==========================================
// 5. 操作ボタン & バリデーション
// ==========================================

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("カテゴリ名:");
    if (n && n.trim()) {
        const name = n.trim().substring(0, 20);
        if (!links[name]) { links[name] = []; saveAndRender(); }
    }
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("GoogleカレンダーのURLまたは埋め込みコードを入力:");
    if (u) {
        // バリデーション: URLが含まれているかチェック
        const match = u.match(/src="([^"]+)"/);
        const finalUrl = match ? match[1] : u;
        
        if (finalUrl.startsWith('https://calendar.google.com/')) {
            calUrl = finalUrl;
            localStorage.setItem('nestTab_calUrl', calUrl);
            renderInfoRow();
        } else {
            alert("無効なGoogleカレンダーURLです。正しくコピーされているか確認してください。");
        }
    }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (noteContent === null) { noteContent = ""; localStorage.setItem('nestTab_note', ""); renderInfoRow(); }
};

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = e => {
    const f = e.target.files[0];
    if (f) {
        if (f.size > 10 * 1024 * 1024) { // 10MB制限
            alert("画像サイズが大きすぎます（10MB以下にしてください）");
            return;
        }
        const r = new FileReader();
        r.onload = async ev => {
            const data = ev.target.result;
            const bg = document.getElementById('bg-container');
            if (bg) bg.style.backgroundImage = `url(${data})`;
            try {
                const db = await openDB();
                db.transaction(storeName, "readwrite").objectStore(storeName).put(data, "background");
            } catch (err) { alert("背景の保存に失敗しました（ストレージ容量不足の可能性があります）"); }
        };
        r.readAsDataURL(f);
    }
};

// 起動
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
    renderInfoRow();
});