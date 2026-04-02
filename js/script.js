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

        box.querySelector('.cat-delete-btn').onclick = () => {
            if(confirm(`カテゴリ「${catName}」を削除しますか？`)) {
                delete links[catName];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ
        box.ondragover = (e) => { e.preventDefault(); box.style.borderColor = "rgba(255,255,255,0.5)"; };
        box.ondragleave = () => { box.style.borderColor = "rgba(255,255,255,0.1)"; };
        box.ondrop = (e) => {
            e.preventDefault();
            box.style.borderColor = "rgba(255,255,255,0.1)";
            const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
            if (url && url.startsWith('http')) {
                let title = url;
                // HTMLデータからタイトルを抽出
                const html = e.dataTransfer.getData('text/html');
                if (html) {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    title = doc.querySelector('a')?.textContent || doc.title || url;
                }
                links[catName].push({ title: title.trim(), url: url.trim() });
                saveAndRender();
            }
        };

        const listDiv = box.querySelector('.link-list');
        links[catName].forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';

            // 名称表示・編集エリア
            const titleSpan = document.createElement('span');
            titleSpan.className = 'link-title link-item';
            titleSpan.textContent = item.title;
            titleSpan.title = "クリックして名前を変更 / 右クリックでURLを開く";

            // 左クリックで名称変更
            titleSpan.onclick = (e) => {
                e.preventDefault();
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'edit-input';
                input.value = item.title;
                
                input.onblur = () => { // フォーカスが外れたら保存
                    if (input.value.trim()) {
                        links[catName][index].title = input.value.trim();
                        saveAndRender();
                    }
                };
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') input.blur();
                };

                wrapper.replaceChild(input, titleSpan);
                input.focus();
            };

            // 中クリック or Ctrl+クリックでページを開く
            titleSpan.onauxclick = () => window.open(item.url, '_blank');
            // 通常の遷移（ダブルクリックや特定の操作で開くようにしてもOKですが、今はシンプルに右側のアイコン等なしで実装）
            // 補助として「開く」アイコンを付けることも可能ですが、まずはリネームを優先

            const delBtn = document.createElement('span');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '&times;';
            delBtn.onclick = () => {
                links[catName].splice(index, 1);
                saveAndRender();
            };

            // URLを開くためのボタン（名称がクリックで編集になったため、別途配置）
            const linkBtn = document.createElement('span');
            linkBtn.innerHTML = '🔗';
            linkBtn.style.cursor = 'pointer';
            linkBtn.style.fontSize = '12px';
            linkBtn.style.opacity = '0.5';
            linkBtn.onclick = () => window.open(item.url, '_blank');

            wrapper.appendChild(titleSpan);
            wrapper.appendChild(linkBtn);
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

document.getElementById('add-cat-btn').onclick = () => {
    const newName = prompt("新しいカテゴリ名を入力してください");
    if (newName && !links[newName]) { links[newName] = []; saveAndRender(); }
};

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

window.addEventListener('DOMContentLoaded', () => { loadBackground(); renderBoard(); });