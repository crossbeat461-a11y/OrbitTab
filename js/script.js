// --- 1. 時計 & 日付 ---
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerText = `${h}:${m}`;
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    document.getElementById('date').innerText = now.toLocaleDateString('ja-JP', options);
}
setInterval(updateClock, 1000);
updateClock();

// --- 2. 背景画像管理 (IndexedDB) ---
const dbName = "NestTabDB", storeName = "settings", dbVersion = 2;
function openDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(storeName)) e.target.result.createObjectStore(storeName);
        };
        request.onsuccess = (e) => resolve(e.target.result);
    });
}
async function saveBackground(base64) {
    const db = await openDB();
    db.transaction(storeName, "readwrite").objectStore(storeName).put(base64, "background");
}
async function loadBackground() {
    const db = await openDB();
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get("background");
    request.onsuccess = () => {
        if (request.result) {
            const bg = document.getElementById('bg-container');
            bg.style.backgroundImage = `url(${request.result})`;
            bg.style.opacity = 1;
        }
    };
}

// --- 3. リンク & カテゴリ管理 ---
let links = JSON.parse(localStorage.getItem('nestTab_v3_links')) || { "Work": [], "Hobby": [] };

function renderBoard() {
    const container = document.getElementById('widgets-container');
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

        // ドラッグ＆ドロップ設定
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
                    title = doc.querySelector('a')?.textContent || url;
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
            wrapper.innerHTML = `
                <a class="link-item" href="${item.url}" target="_blank">${item.title}</a>
                <span class="delete-btn">&times;</span>
            `;
            wrapper.querySelector('.delete-btn').onclick = () => {
                links[catName].splice(index, 1);
                saveAndRender();
            };
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
document.getElementById('add-cat-btn').onclick = () => {
    const newName = prompt("新しいカテゴリ名を入力してください");
    if (newName && !links[newName]) {
        links[newName] = [];
        saveAndRender();
    } else if (links[newName]) {
        alert("その名前は既に存在します");
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
            document.getElementById('bg-container').style.backgroundImage = `url(${ev.target.result})`;
            document.getElementById('bg-container').style.opacity = 1;
            await saveBackground(ev.target.result);
        };
        reader.readAsDataURL(file);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
});