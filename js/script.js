// --- 1. 時計 & 日付更新 ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerText = `${hours}:${minutes}`;
    
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    document.getElementById('date').innerText = now.toLocaleDateString('ja-JP', options);
}
setInterval(updateClock, 1000);
updateClock();

// --- 2. 背景画像管理 (IndexedDB v2) ---
const dbName = "NestTabDB";
const storeName = "settings";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 2); // Version 2
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function loadBackground() {
    try {
        const db = await openDB();
        const transaction = db.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get("background");
        request.onsuccess = () => {
            if (request.result) {
                const bgContainer = document.getElementById('bg-container');
                bgContainer.style.backgroundImage = `url(${request.result})`;
                bgContainer.style.opacity = 1;
            }
        };
    } catch (error) {
        console.error("背景の読み込みに失敗しました:", error);
    }
}

// --- 3. リンク & カテゴリ管理 ---
let links = JSON.parse(localStorage.getItem('nestTab_v3_links')) || { "Work": [], "Hobby": [] };

function saveAndRender() {
    localStorage.setItem('nestTab_v3_links', JSON.stringify(links));
    renderBoard();
}

function renderBoard() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(links).forEach(categoryName => {
        const box = document.createElement('div');
        box.className = 'category-box';
        box.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">${categoryName}</h3>
                <span class="cat-delete-btn" title="カテゴリを削除">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;

        // カテゴリの削除
        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm(`カテゴリ「${categoryName}」と中のリンクをすべて削除しますか？`)) {
                delete links[categoryName];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ登録
        box.ondragover = (event) => event.preventDefault();
        box.ondrop = (event) => {
            event.preventDefault();
            const url = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                const htmlData = event.dataTransfer.getData('text/html');
                let title = url;
                if (htmlData) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlData, 'text/html');
                    title = doc.querySelector('a')?.textContent || doc.title || url;
                }
                links[categoryName].push({ title: title.trim(), url: url.trim() });
                saveAndRender();
            }
        };

        // リンク一覧の描画
        const listDiv = box.querySelector('.link-list');
        links[categoryName].forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';
            wrapper.innerHTML = `
                <span class="link-symbol" title="開く">🔗</span>
                <span class="link-title" title="左クリック: 開く / 右クリック: 名前変更">${item.title}</span>
                <span class="delete-btn" title="削除">&times;</span>
            `;

            // 左クリックでURLを開く
            const titleSpan = wrapper.querySelector('.link-title');
            const iconSpan = wrapper.querySelector('.link-symbol');
            const openLink = () => window.open(item.url, '_blank');
            
            titleSpan.onclick = openLink;
            iconSpan.onclick = openLink;

            // 右クリックで名称変更
            titleSpan.oncontextmenu = (event) => {
                event.preventDefault();
                const newTitle = prompt("新しい名称を入力してください:", item.title);
                if (newTitle !== null && newTitle.trim() !== "") {
                    links[categoryName][index].title = newTitle.trim();
                    saveAndRender();
                }
            };

            // リンク単体の削除
            wrapper.querySelector('.delete-btn').onclick = (event) => {
                event.stopPropagation();
                links[categoryName].splice(index, 1);
                saveAndRender();
            };

            listDiv.appendChild(wrapper);
        });
        container.appendChild(box);
    });
}

// --- 4. カレンダー管理 ---
let calUrl = localStorage.getItem('nestTab_calUrl') || "";

function renderCalendar() {
    const wrapper = document.getElementById('calendar-wrapper');
    if (!calUrl) {
        wrapper.style.display = 'none';
        wrapper.innerHTML = '';
        return;
    }
    wrapper.style.display = 'flex';
    wrapper.innerHTML = `
        <div class="category-box calendar-box">
            <div class="category-header">
                <h3 class="category-title">Schedule</h3>
                <span id="remove-cal-all" class="cat-delete-btn" title="カレンダー設定を削除">🗑️</span>
            </div>
            <iframe src="${calUrl}"></iframe>
        </div>
    `;
    
    document.getElementById('remove-cal-all').onclick = () => {
        if (confirm("カレンダーの登録を削除して非表示にしますか？")) {
            calUrl = "";
            localStorage.removeItem('nestTab_calUrl');
            renderCalendar();
        }
    };
}

// --- 5. イベントリスナーと初期化 ---

// カテゴリ追加
document.getElementById('add-cat-btn').onclick = () => {
    const newCatName = prompt("新しいカテゴリ名を入力してください:");
    if (newCatName && !links[newCatName]) {
        links[newCatName] = [];
        saveAndRender();
    } else if (links[newCatName]) {
        alert("そのカテゴリ名は既に存在します。");
    }
};

// カレンダー設定
document.getElementById('cal-setup-btn').onclick = () => {
    const inputUrl = prompt("GoogleカレンダーのURLまたは埋め込みコードを貼り付けてください:");
    if (inputUrl) {
        const match = inputUrl.match(/src="([^"]+)"/);
        calUrl = match ? match[1] : inputUrl;
        localStorage.setItem('nestTab_calUrl', calUrl);
        renderCalendar();
    }
};

// 背景画像変更
const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');

if (bgBtn && bgInput) {
    bgBtn.onclick = () => bgInput.click();
    bgInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imgData = e.target.result;
                document.getElementById('bg-container').style.backgroundImage = `url(${imgData})`;
                document.getElementById('bg-container').style.opacity = 1;
                
                const db = await openDB();
                const tx = db.transaction(storeName, "readwrite");
                tx.objectStore(storeName).put(imgData, "background");
            };
            reader.readAsDataURL(file);
        }
    };
}

// 起動時の読み込み
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard();
    renderCalendar();
});