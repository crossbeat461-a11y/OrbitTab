// ==========================================
// 0. 初期設定 & 定数
// ==========================================
const DB_NAME = "OrbitTabDB";
const STORE_NAME = "settings";

// 確定した木村さんのnoteマガジンURL
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

const WELCOME_MSG = "🚀 OrbitTab へようこそ！\n\nここはあなた専用のデジタル管制塔です。\n\n・右下の ＋ でカテゴリー追加\n・ブラウザからリンクをドロップして登録\n・📅 でカレンダー連携\n・🖼️ でお気に入りの背景を設定\n\nすべての窓は、上のグレー部分を掴んで移動、右下でサイズ変更できます。";

const DEFAULT_BG_STYLE = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

// --- ★大改修：初期レイアウト定数（image_1.pngに基づく） ---
// 画面幅1280px, 高さ800pxを基準とした初期値
const INITIAL_LAYOUT = {
    calendar: { left: 100, top: 300, w: 500, h: 400 }, // 左側中段
    note:     { left: 680, top: 300, w: 500, h: 400 }, // 右側中段
    cats: [
        { left: 100, top: 750, w: 320, h: 300 }, // 下段左
        { left: 480, top: 750, w: 320, h: 300 }, // 下段中央
        { left: 860, top: 750, w: 320, h: 300 }  // 下段右
    ]
};

// 重なり順（z-index）のグローバル管理
let maxZIndex = 10;

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
// 4. ★大改修：汎用ウィジェット化関数
// ==========================================
// ドラッグ、リサイズ、重なり順、配置保存を統合
function makeWidget(el, storageKey, defaultLayout) {
    if (!el) return;

    let isDragging = false;
    let isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    // 配置・サイズを復元
    const saved = getSafeStorage(storageKey, defaultLayout);
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.width = saved.w + 'px';
    el.style.height = saved.h + 'px';

    // リサイズハンドルを追加
    if (!el.querySelector('.resizer')) {
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        el.appendChild(resizer);
        
        // リサイズイベント
        resizer.onmousedown = (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
            e.stopPropagation(); // ドラッグイベントを阻止
            bringToFront(el);
            document.body.style.userSelect = 'none'; // テキスト選択防止
        };
    }

    // ヘッダー（ドラッグハンドル）を取得
    const header = el.querySelector('.widget-header');
    if (!header) return;

    // クリック時に最前に持ってくる
    el.onmousedown = () => bringToFront(el);

    // ドラッグイベント
    header.onmousedown = (e) => {
        // 子要素（削除ボタンなど）がクリックされた場合は無視
        if (e.target !== header && !e.target.classList.contains('widget-title')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = el.offsetLeft;
        startTop = el.offsetTop;
        bringToFront(el);
        document.body.style.userSelect = 'none';
    };

    // マウス移動（ドキュメント全体で監視）
    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            el.style.left = (startLeft + (e.clientX - startX)) + 'px';
            el.style.top = (startTop + (e.clientY - startY)) + 'px';
        }
        if (isResizing) {
            el.style.width = (startW + (e.clientX - startX)) + 'px';
            el.style.height = (startH + (e.clientY - startY)) + 'px';
        }
    });

    // マウスアップ（保存）
    window.addEventListener('mouseup', () => {
        if (isDragging || isResizing) {
            localStorage.setItem(storageKey, JSON.stringify({
                left: parseInt(el.style.left),
                top: parseInt(el.style.top),
                w: parseInt(el.style.width),
                h: parseInt(el.style.height)
            }));
        }
        isDragging = false;
        isResizing = false;
        document.body.style.userSelect = 'auto';
    });
}

// 最前に持ってくる関数
function bringToFront(el) {
    maxZIndex++;
    el.style.zIndex = maxZIndex;
    // 他のウィジェットのアクティブクラスを解除
    document.querySelectorAll('.widget').forEach(w => w.classList.remove('active'));
    el.classList.add('active');
}

// ==========================================
// 5. ★大改修：リンク & カテゴリー管理（自由配置版）
// ==========================================
let links = getSafeStorage('orbitTab_v1_links', DEFAULT_LINKS);
// カテゴリーごとの配置データ
let catLayouts = getSafeStorage('orbitTab_v1_catLayouts', {});

// 保存して再描画
function saveAndRender() {
    try {
        localStorage.setItem('orbitTab_v1_links', JSON.stringify(links));
        // レイアウトデータはmakeWidget内で個別に保存されるが、
        // 削除時はここで整合性を取る必要がある
        const currentCats = Object.keys(links);
        const newLayouts = {};
        currentCats.forEach(cat => {
            if (catLayouts[cat]) newLayouts[cat] = catLayouts[cat];
        });
        catLayouts = newLayouts;
        localStorage.setItem('orbitTab_v1_catLayouts', JSON.stringify(catLayouts));

    } catch (e) { alert("保存容量がいっぱいです。"); }
    renderBoard();
}

// ★大改修：ボード全体のレンダリング
function renderBoard() {
    // 1. カテゴリーボックス（リンク集）の描画
    const container = document.getElementById('widgets-container');
    if (!container) return;

    // 既存のカテゴリーウィジェットを削除
    container.querySelectorAll('.widget.category-box').forEach(w => w.remove());

    const catNames = Object.keys(links);
    catNames.forEach((cat, index) => {
        const box = document.createElement('div');
        box.className = 'widget category-box';
        box.id = `cat-widget-${index}`; // IDを付与
        box.innerHTML = `
            <div class="widget-header category-header">
                <h3 class="widget-title category-title">${cat}</h3>
                <span class="cat-delete-btn" title="カテゴリー削除">🗑️</span>
            </div>
            <div class="link-list"></div>
        `;

        // 削除ロジック
        box.querySelector('.cat-delete-btn').onclick = () => {
            if (confirm(`カテゴリー「${cat}」を削除しますか？`)) {
                delete links[cat];
                delete catLayouts[cat];
                saveAndRender();
            }
        };

        // ドラッグ＆ドロップ登録ロジック（前回の内容を維持）
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

        // リンク一覧の描画
        const listDiv = box.querySelector('.link-list');
        links[cat].forEach((item, index_link) => {
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
                    links[cat][index_link].title = newT.trim().substring(0, 100);
                    saveAndRender();
                }
            };

            wrap.querySelector('.delete-btn').onclick = () => {
                links[cat].splice(index_link, 1);
                saveAndRender();
            };
            listDiv.appendChild(wrap);
        });

        // コンテナに追加
        container.appendChild(box);

        // --- ★大改修：ウィジェット化の適用 ---
        // 初期レイアウト（image_1.pngの3つ）か、新規追加用か、保存済みかを判断
        let defaultLayout;
        if (catLayouts[cat]) {
            defaultLayout = catLayouts[cat];
        } else if (index < INITIAL_LAYOUT.cats.length) {
            defaultLayout = INITIAL_LAYOUT.cats[index];
        } else {
            // 新規追加は画面中央に
            defaultLayout = { left: 480, top: 400, w: 320, h: 300 };
        }
        
        makeWidget(box, `orbitTab_catLayout_${cat}`, defaultLayout);
    });

    // 2. カレンダー & 付箋ウィジェットの描画（以前のrenderInfoRowから統合）
    renderSpecialWidgets();
}

// ==========================================
// 6. ★大改修：カレンダー & 付箋ウィジェットのレンダリング
// ==========================================
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let noteContent = localStorage.getItem('orbitTab_note');

// 初回起動時の付箋メッセージ
if (noteContent === null) noteContent = WELCOME_MSG;

function renderSpecialWidgets() {
    const calWidget = document.getElementById('cal-widget');
    const noteWidget = document.getElementById('note-widget');

    // --- カレンダー ---
    if (calUrl) {
        calWidget.style.display = 'flex';
        calWidget.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">Schedule</h3>
                <span class="cat-delete-btn" id="del-cal-btn">🗑️</span>
            </div>
            <iframe src="${calUrl}" sandbox="allow-scripts allow-same-origin allow-forms" class="calendar-iframe"></iframe>
        `;
        
        // ウィジェット化適用（初期レイアウト: image_1.png左中段）
        makeWidget(calWidget, 'orbitTab_calLayout_v2', INITIAL_LAYOUT.calendar);

        document.getElementById('del-cal-btn').onclick = () => {
            if (confirm("カレンダー連携を解除しますか？")) { 
                calUrl = ""; 
                localStorage.removeItem('orbitTab_calUrl'); 
                localStorage.removeItem('orbitTab_calLayout_v2'); // レイアウトも削除
                renderBoard(); // ボード全体を再描画
            }
        };
    } else { calWidget.style.display = 'none'; }

    // --- 付箋 ---
    if (noteContent !== null) {
        noteWidget.style.display = 'flex';
        noteWidget.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">Sticky Note</h3>
                <span class="cat-delete-btn" id="del-note-btn">🗑️</span>
            </div>
            <textarea class="note-textarea" id="note-input" placeholder="メモを入力...">${noteContent}</textarea>
        `;
        
        // ウィジェット化適用（初期レイアウト: image_1.png右中段）
        makeWidget(noteWidget, 'orbitTab_noteLayout_v2', INITIAL_LAYOUT.note);

        const ni = document.getElementById('note-input');
        ni.oninput = () => {
            noteContent = ni.value.substring(0, 5000);
            localStorage.setItem('orbitTab_note', noteContent);
        };
        document.getElementById('del-note-btn').onclick = () => {
            if (confirm("付箋を削除しますか？")) { 
                noteContent = null; 
                localStorage.removeItem('orbitTab_note'); 
                localStorage.removeItem('orbitTab_noteLayout_v2'); // レイアウトも削除
                renderBoard(); 
            }
        };
    } else { noteWidget.style.display = 'none'; }
}

// ==========================================
// 7. UIイベント（右下の小さなボタン群、前回の内容を維持）
// ==========================================

const guideBtn = document.getElementById('guide-btn');
if (guideBtn) { guideBtn.onclick = () => window.open(NOTE_URL, '_blank'); }

document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("新しいカテゴリー名:");
    if (n && n.trim()) {
        const name = n.trim().substring(0, 20);
        if (!links[name]) { 
            links[name] = []; 
            // レイアウトはmakeWidgetの新規追加ロジック（中央）に任せる
            saveAndRender(); 
        }
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
            renderBoard(); // 全体再描画
        } else { alert("有効なGoogleカレンダーURLではありません。"); }
    } else if (calUrl === "") {
        alert("カレンダーURLを入力してください。");
    } else {
        // すでに表示されている場合は何もしない、または前面に持ってくるロジックを追加可能
    }
};

document.getElementById('note-setup-btn').onclick = () => {
    if (noteContent === null) {
        noteContent = "";
        localStorage.setItem('orbitTab_note', "");
        renderBoard(); // 全体再描画
    } else {
        // すでに表示されている場合は前面に
        bringToFront(document.getElementById('note-widget'));
    }
};

const bgInput = document.getElementById('bg-input');
document.getElementById('bg-change-btn').onclick = () => bgInput.click();
bgInput.onchange = e => {
    const f = e.target.files[0];
    if (f) {
        if (f.size > 10 * 1024 * 1024) { alert("画像サイズは10MB以下にしてください。"); return; }
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

// ==========================================
// 8. 起動（一元化）
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    loadBackground();
    renderBoard(); // すべてのウィジェット（カレンダー、付箋、カテゴリー）をここで統合的に描画
});