// --- 1. 時計 & 日付更新 ---
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

// --- 2. 背景画像管理 (IndexedDB版: 大容量対応) ---
const dbName = "NestTabDB";
const storeName = "settings";

// データベースの準備
function openDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(storeName);
        };
        request.onsuccess = (e) => resolve(e.target.result);
    });
}

// 背景画像を保存
async function saveBackground(base64) {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(base64, "background");
}

// 背景画像を読み込み
async function loadBackground() {
    const db = await openDB();
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get("background");
    request.onsuccess = () => {
        if (request.result) {
            document.getElementById('bg-container').style.backgroundImage = `url(${request.result})`;
            document.getElementById('bg-container').style.opacity = 1;
        }
    };
}

const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');

bgBtn.addEventListener('click', () => bgInput.click());

bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const imgBase64 = event.target.result;
        document.getElementById('bg-container').style.backgroundImage = `url(${imgBase64})`;
        await saveBackground(imgBase64); // IndexedDBに保存
    };
    reader.readAsDataURL(file);
});

// --- 3. リンク管理 (こちらは軽いのでlocalStorageでOK) ---
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
    loadBackground(); // IndexedDBから背景を呼ぶ
    renderLinks();
});