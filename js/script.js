// --- 1. 時計 & 日付更新 ---
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

// --- 2. 背景画像管理 (IndexedDB v2) ---
const dbName = "NestTabDB", storeName = "settings", dbVersion = 2;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveBackground(base64) {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(base64, "background");
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

// --- 3. リンク & カテゴリ管理 ---
let links = JSON.parse(localStorage.getItem('nestTab_v3_links')) || { "Work": [], "Hobby": [] };

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(links).forEach(catName => {
        const box = document.createElement('div');
        box.className = 'category-box';
        box.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">${catName}</h3>
                <span class="cat-delete-btn" title="カテゴリごと削除">🗑️</span>
            </div>
            <div class="link-list" id="list-${catName}"></div>
        `;

        // カテゴリ削除
        box.querySelector('.cat-delete-btn').onclick = () => {
            if(confirm(`カテゴリ「${catName}」と中のリンクをすべて削除しますか？`)) {
                delete links[catName];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ登録
        box.ondragover = (e) => { e.preventDefault(); box.style.borderColor = "rgba(255,255,255,0.5)"; };
        box.ondragleave = () => { box.style.borderColor = "rgba(255,255,255,0.1)"; };
        box.ondrop = (e) => {
            e.preventDefault();
            box.style.borderColor = "rgba(255,255,255,0.1)";
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            
            if (url && url.startsWith('http')) {
                let title = url;
                const html = e.dataTransfer.getData('text/html');
                if (html) {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    title = doc.querySelector('a')?.textContent || doc.title || url;
                }
                links[catName].push({ title: title.trim(), url: url.trim() });
                saveAndRender();
            }
        };

        // リンク一覧の描画
        const listDiv = box.querySelector('.link-list');
        links[catName].forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';

            // 左側のアイコン (🔗)
            const iconSpan = document.createElement('span');
            iconSpan.className = 'link-symbol';
            iconSpan.innerHTML = '🔗';
            iconSpan.onclick = () => window.open(item.url, '_blank');

            // 名称表示エリア
            const titleSpan = document.createElement('span');
            titleSpan.className = 'link-title';
            titleSpan.textContent = item.title;
            titleSpan.title = "左クリック: 開く / 右クリック: 名前変更";

            // 左クリックで開く
            titleSpan.onclick = () => window.open(item.url, '_blank');

            // 右クリックで名前変更
            titleSpan.oncontextmenu = (e) => {
                e.preventDefault();
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'edit-input';
                input.value = item.title;

                const finishEdit = () => {
                    if (input.value.trim() && input.value.trim() !== item.title) {
                        links[catName][index].title = input.value.trim();
                        saveAndRender();
                    } else {
                        renderBoard();
                    }
                };

                input.onblur = finishEdit;
                input.onkeydown = (ev) => {
                    if (ev.key === 'Enter') finishEdit();
                    if (ev.key === 'Escape') renderBoard();
                };

                wrapper.replaceChild(input, titleSpan);
                input.focus();
                input.select();
            };

            // 削除ボタン (×)
            const delBtn = document.createElement('span');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '&times;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                links[catName].splice(index, 1);
                saveAndRender();
            };

            wrapper.appendChild(iconSpan);
            wrapper.appendChild(titleSpan);
            wrapper.appendChild(delBtn);
            listDiv.appendChild(wrapper);
        });

        container.appendChild(box);
    });
}

function saveAndRender() {
    localStorage.setItem('nestTab_v3_links', JSON.stringify(links));
    renderBoard();
}

// カテゴリ追加ボタン
const addBtn = document.getElementById('add-cat-btn');
if (addBtn) {
    addBtn.onclick = () => {
        const newName = prompt("新しいカテゴリ名を入力してください");
        if (newName && !links[newName]) {
            links[newName] = [];
            saveAndRender();
        } else if (links[newName]) {
            alert("その名前は既に存在します");
        }
    };
}

// 背景変更
const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');
if (bgBtn && bgInput) {
    bgBtn.onclick = () => bgInput.click();
    bgInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const imgBase64 = ev.target.result;
                document.getElementById('bg-container').style.backgroundImage = `url(${imgBase64})`;
                document.getElementById('bg-container').style.opacity = 1;
                await saveBackground(imgBase64);
            };
            reader.readAsDataURL(file);
        }
    };
}

window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
});
// --- 4. カレンダー管理 ---
let calUrl = localStorage.getItem('nestTab_calUrl') || "";

function renderCalendar() {
    const wrapper = document.getElementById('calendar-wrapper');
    const content = document.getElementById('calendar-content');
    
    if (calUrl) {
        wrapper.style.display = 'flex';
        content.innerHTML = `<iframe src="${calUrl}"></iframe>`;
    } else {
        wrapper.style.display = 'none';
    }
}

// カレンダー設定ボタンをHTMLに追加（DOMContentLoaded内などで実行）
function initCalendarControls() {
    const btn = document.createElement('button');
    btn.id = 'cal-setup-btn';
    btn.className = 'control-btn';
    btn.innerHTML = '📅';
    btn.title = "カレンダーを設定";
    btn.onclick = () => {
        const url = prompt("Googleカレンダーの「埋め込み用URL」を入力してください\n（設定 ＞ カレンダーの設定 ＞ このカレンダーの統合 ＞ 埋め込みコード内の src部分）");
        if (url) {
            // iframeコードごと貼られた場合の対策
            const match = url.match(/src="([^"]+)"/);
            const finalUrl = match ? match[1] : url;
            
            calUrl = finalUrl;
            localStorage.setItem('nestTab_calUrl', calUrl);
            renderCalendar();
        }
    };
    document.querySelector('.main-interface').appendChild(btn);
}

// 既存の DOMContentLoaded 内に追記
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
    initCalendarControls(); // これを追記
    renderCalendar();       // これを追記
});