// ==========================================
// 0. 初期設定 & 定数
// ==========================================
const DB_NAME = "OrbitTabDB";
const STORE_NAME = "settings";
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153"; 

// 初めて使うユーザーへの初期データ
const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ],
    "OrbitTab Guide": [
        { title: "使いこなしガイド (note)", url: NOTE_URL }
    ]
};

const WELCOME_MSG = "🚀 OrbitTab へようこそ！\n\nここはあなた専用のデジタル管制塔です。\n\n・右下の ＋ でカテゴリ追加\n・ブラウザからリンクをドロップして登録\n・📅 でカレンダー連携\n・🖼️ でお気に入りの背景を設定\n\n自分だけの「軌道（Orbit）」を作りましょう。";

const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

// ==========================================
// 1. 安全なデータ取得ユーティリティ
// ==========================================
function getSafeStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (e) {
        console.error(`Storage error for ${key}:`, e);
        return defaultValue;
    }
}

// ==========================================
// 2. 時計 & 日付更新機能
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
// 3. 背景画像管理 (IndexedDB)
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
                bg.style.backgroundSize = "cover";
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
// 4. リンク & カテゴリ管理
// ==========================================
let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS);

function saveAndRender() {
    try {
        localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
    } catch (e) {
        alert("保存容量がいっぱいです。不要なデータを削除してください。");
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
// 5. カレンダー & 付箋管理
// ==========================================
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let noteContent = localStorage.getItem('orbitTab_note');

// 初回起動時にウェルカムメッセージを表示
if (noteContent === null) {
    noteContent = WELCOME_MSG;
}

function renderInfoRow() {
    const infoRow = document.getElementById('info-row');
    const calWrap = document.getElementById('calendar-wrapper');
    const noteWrap = document.getElementById('notes-wrapper');
    if (!infoRow || !calWrap || !noteWrap) return;

    // カレンダー表示
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
            if (confirm("カレンダー連携を解除しますか？")) { 
                calUrl = ""; 
                localStorage.removeItem('orbitTab_calUrl'); 
                renderInfoRow(); 
            }
        };
    } else { calWrap.style.display = 'none'; }

    // 付箋表示
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
            noteContent = ni.value.substring(0, 5000);
            localStorage.setItem('orbitTab_note', noteContent);
        };
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("付箋を削除しますか？")) { 
                noteContent = null; 
                localStorage.removeItem('orbitTab_note'); 
                renderInfoRow(); 
            }
        };
    } else { noteWrap.style.display = 'none'; }

    infoRow.style.display = (calUrl || noteContent !== null) ? 'flex' : 'none';
}

// ==========================================
// 6. UIイベント・バリデーション
// ==========================================

// noteガイドボタン
const guideBtn = document.getElementById('guide-btn');
if (guideBtn) {
    guideBtn.onclick = () => window.open(NOTE_URL, '_blank');
}

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリ名:");
    if (n && n.trim()) {
        const name = n.trim().substring(0, 20);
        if (!links[name]) { links[name] = []; saveAndRender(); }
    }
};

document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("Googleカレンダーの埋め込みURLを入力してください:");
    if (u) {
        const match = u.match(/src="([^"]+)"/);
        const finalUrl = match ? match[1] : u;
        if (finalUrl.startsWith('https://calendar.google.com/')) {
            calUrl = finalUrl;
            localStorage.setItem('orbitTab_calUrl', calUrl);
            renderInfoRow();
        } else {
            alert("有効なGoogleカレンダーURLではありません。");
        }
    }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (noteContent === null) {
        noteContent = "";
        localStorage.setItem('orbitTab_note', "");
        renderInfoRow();
    }
};

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = e => {
    const f = e.target.files[0];
    if (f) {
        if (f.size > 10 * 1024 * 1024) {
            alert("画像サイズは10MB以下にしてください。");
            return;
        }
        const r = new FileReader();
        r.onload = async ev => {
            const data = ev.target.result;
            const bg = document.getElementById('bg-container');
            if (bg) {
                bg.style.backgroundImage = `url(${data})`;
                bg.style.backgroundSize = "cover";
            }
            try {
                const db = await openDB();
                db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(data, "background");
            } catch (err) { alert("保存に失敗しました。"); }
        };
        r.readAsDataURL(f);
    }
};

// 起動処理
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
    renderInfoRow();
});