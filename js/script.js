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

// --- 2. 背景画像管理 (IndexedDB: バージョンを2に上げて確実に初期化) ---
const dbName = "NestTabDB";
const storeName = "settings";
const dbVersion = 2; // バージョンを上げて再構築を促す

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            // 箱がなければ作る
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
                console.log("📦 データベースの箱を作成しました");
            }
        };

        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => {
            console.error("❌ DBオープン失敗:", e.target.error);
            reject(e.target.error);
        };
    });
}

async function saveBackground(base64) {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.put(base64, "background");
        
        tx.oncomplete = () => console.log("✅ 背景画像をIndexedDBに保存しました");
        tx.onerror = (e) => console.error("❌ 保存トランザクションエラー:", e.target.error);
    } catch (err) {
        console.error("❌ 保存処理失敗:", err);
    }
}

async function loadBackground() {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get("background");

        request.onsuccess = () => {
            if (request.result) {
                const bg = document.getElementById('bg-container');
                if (bg) {
                    bg.style.backgroundImage = `url(${request.result})`;
                    bg.style.opacity = 1;
                    console.log("🖼️ 背景画像を復元しました");
                }
            } else {
                console.log("ℹ️ 保存されている背景はありません");
            }
        };
    } catch (err) {
        console.error("❌ 読み込み処理失敗:", err);
    }
}

const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');

if (bgBtn && bgInput) {
    bgBtn.addEventListener('click', () => {
        console.log("🔘 フォルダ選択を開きます");
        bgInput.click();
    });

    bgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("📂 ファイル選択検知:", file.name, "(", file.size, "bytes )");

        const reader = new FileReader();
        reader.onload = async (event) => {
            const imgBase64 = event.target.result;
            const bg = document.getElementById('bg-container');
            if (bg) {
                bg.style.backgroundImage = `url(${imgBase64})`;
                bg.style.opacity = 1;
            }
            await saveBackground(imgBase64);
        };
        reader.onerror = () => console.error("❌ ファイル読み込み失敗");
        reader.readAsDataURL(file);
    });
}

// --- 3. リンク管理 ---
let links = JSON.parse(localStorage.getItem('nestTab_v2_links')) || {
    work: [], hobby: [], others: []
};

function renderLinks() {
    Object.keys(links).forEach(cat => {
        const list = document.getElementById(`list-${cat}`);
        if (!list) return;
        list.innerHTML = '';
        links[cat].forEach(item => {
            const a = document.createElement('a');
            a.className = 'link-item';
            a.href = item.url;
            a.target = '_blank';
            a.textContent = item.title;
            list.appendChild(a);
        });
    });
}

document.querySelectorAll('.category-box').forEach(box => {
    box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.style.borderColor = '#8cced7';
    });
    box.addEventListener('dragleave', () => {
        box.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        box.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        const cat = box.dataset.category;
        const url = e.dataTransfer.getData('text/plain');
        let title = url;
        const html = e.dataTransfer.getData('text/html');
        if (html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const linkTag = doc.querySelector('a');
            if (linkTag) title = linkTag.textContent || url;
        }
        if (url && url.startsWith('http')) {
            links[cat].push({ title: title, url: url });
            localStorage.setItem('nestTab_v2_links', JSON.stringify(links));
            renderLinks();
        }
    });
});

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 NestTab 起動完了");
    loadBackground();
    renderLinks();
});