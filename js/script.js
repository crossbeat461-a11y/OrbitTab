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
const dbName = "NestTabDB";
const storeName = "settings";
const dbVersion = 2;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
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
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get("background");
        request.onsuccess = () => {
            if (request.result) {
                const bg = document.getElementById('bg-container');
                bg.style.backgroundImage = `url(${request.result})`;
                bg.style.opacity = 1;
            }
        };
    } catch (err) { console.error("背景ロード失敗", err); }
}

const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');

if (bgBtn && bgInput) {
    bgBtn.addEventListener('click', () => bgInput.click());
    bgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const imgBase64 = event.target.result;
            const bg = document.getElementById('bg-container');
            bg.style.backgroundImage = `url(${imgBase64})`;
            bg.style.opacity = 1;
            await saveBackground(imgBase64);
        };
        reader.readAsDataURL(file);
    });
}

// --- 3. リンク管理 (追加・削除機能付き) ---
let links = JSON.parse(localStorage.getItem('nestTab_v2_links')) || {
    work: [], hobby: [], others: []
};

// 削除を実行する関数
function deleteLink(category, index) {
    links[category].splice(index, 1); // 指定した項目を削除
    localStorage.setItem('nestTab_v2_links', JSON.stringify(links)); // 保存
    renderLinks(); // 再描画
}

function renderLinks() {
    Object.keys(links).forEach(cat => {
        const list = document.getElementById(`list-${cat}`);
        if (!list) return;
        list.innerHTML = '';

        links[cat].forEach((item, index) => {
            // コンテナ
            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';

            // リンク本体
            const a = document.createElement('a');
            a.className = 'link-item';
            a.href = item.url;
            a.target = '_blank';
            a.textContent = item.title;

            // 削除ボタン (×)
            const delBtn = document.createElement('span');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '&times;'; // ×マーク
            delBtn.title = "このリンクを削除";
            delBtn.onclick = (e) => {
                e.preventDefault(); // リンクが開くのを防ぐ
                deleteLink(cat, index);
            };

            wrapper.appendChild(a);
            wrapper.appendChild(delBtn);
            list.appendChild(wrapper);
        });
    });
}

// ドラッグ＆ドロップのイベント
document.querySelectorAll('.category-box').forEach(box => {
    box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });
    box.addEventListener('dragleave', () => {
        box.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        const cat = box.dataset.category;
        const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        
        let title = url;
        const html = e.dataTransfer.getData('text/html');
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const linkTag = doc.querySelector('a');
            if (linkTag) title = linkTag.textContent || url;
        }

        if (url && (url.startsWith('http') || url.startsWith('https'))) {
            links[cat].push({ title: title.trim(), url: url.trim() });
            localStorage.setItem('nestTab_v2_links', JSON.stringify(links));
            renderLinks();
        }
    });
});

window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderLinks();
});