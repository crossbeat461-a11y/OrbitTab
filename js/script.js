/**
 * OrbitTab v1.3.3 - 最終安定版
 * セクション分けコメント適用済み
 */

// --- 1. 定数・初期設定 ---
const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const DEFAULT_NOTE = [{ 
    title: "🚀 クイックガイド", 
    body: "右下のボタンからブックマークを読み込み、＋ボタンでBOXを追加してください。リンクの個別削除やBOXのリサイズも自由自在です。" 
}];

// --- 2. データ保存・取得処理 ---
function getStored(key, def) {
    const val = localStorage.getItem(key);
    try { 
        return (val === null) ? def : JSON.parse(val); 
    } catch(e) { 
        return def; 
    }
}

let links = getStored('orbitTab_v1_links', {});
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let bookmarkCatalog = {}; 
let maxZ = 100;

function saveLinks() { localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); }
function saveNotes() { localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); }

// --- 3. 時計・表示更新機能 ---
function updateClock() {
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

// --- 4. インポート・背景設定 (リピート防止・全画面表示版) ---
function setupImportFeature() {
    // ... (前略：インポートボタンの処理はそのまま) ...

    const bgBtn = document.getElementById('bg-change-btn');
    const bgInput = document.getElementById('bg-input');
    const bgContainer = document.getElementById('bg-container');

    if (bgBtn && bgInput && bgContainer) {
        bgBtn.onclick = () => bgInput.click();
        bgInput.onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const url = ev.target.result;
                
                // 背景画像をセットし、スタイルを強制的に調整
                bgContainer.style.backgroundImage = `url(${url})`;
                bgContainer.style.backgroundSize = "cover";      // 画面一杯に広げる
                bgContainer.style.backgroundPosition = "center";  // 中央合わせ
                bgContainer.style.backgroundRepeat = "no-repeat"; // 繰り返し禁止
                bgContainer.style.backgroundAttachment = "fixed"; // スクロールしても固定
                
                localStorage.setItem('orbitTab_bg_v4', url);
            };
            reader.readAsDataURL(e.target.files[0]);
        };
    }
}

// --- 7. 初期化処理 (window.onload) ---
window.onload = () => { 
    updateClock(); 
    setInterval(updateClock, 1000); 
    render(); 
    setupImportFeature(); 
    setupButtonActions(); 
    
    // 保存された背景の復元
    const bg = localStorage.getItem('orbitTab_bg_v4');
    const bgContainer = document.getElementById('bg-container');
    if (bg && bgContainer) {
        bgContainer.style.backgroundImage = `url(${bg})`;
        bgContainer.style.backgroundSize = "cover";
        bgContainer.style.backgroundPosition = "center";
        bgContainer.style.backgroundRepeat = "no-repeat";
        bgContainer.style.backgroundAttachment = "fixed";
    }
};

// --- 5. 描画処理 (カテゴリBOX・付箋 / サイズ維持・安定版) ---
function makeWidget(el, key, def) {
    const pos = getStored(key, def);
    el.style.left = pos.left + "px";
    el.style.top = pos.top + "px";
    el.style.width = pos.w + "px";
    el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    header.onmousedown = function(e) {
        if (e.target.closest('.cat-btn') || e.target.closest('.delete-link-btn')) return;
        maxZ++; 
        el.style.zIndex = maxZ;
        let startX = e.clientX - el.offsetLeft;
        let startY = e.clientY - el.offsetTop;
        document.onmousemove = (me) => {
            el.style.left = (me.clientX - startX) + "px";
            el.style.top = (me.clientY - startY) + "px";
        };
        document.onmouseup = () => { 
            document.onmousemove = null; 
            savePos(el, key); 
        };
    };
    new ResizeObserver(() => savePos(el, key)).observe(el);
}

function savePos(el, key) {
    localStorage.setItem(key, JSON.stringify({ 
        left: el.offsetLeft, 
        top: el.offsetTop, 
        w: el.offsetWidth, 
        h: el.offsetHeight 
    }));
}

function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    // カテゴリBOXの描画
    Object.keys(links).forEach((cat, idx) => {
        const box = document.createElement('div');
        box.className = 'widget';
        // インデックス（番号）で位置を固定保存することでサイズ崩れを防止
        const safeKey = `pos_box_${idx}`; 

        box.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${cat}</span>
                <div class="header-btns">
                    <span class="cat-btn cat-delete-btn">🗑️</span>
                </div>
            </div>
            <div class="link-list"></div>`;

        box.querySelector('.cat-delete-btn').onclick = () => {
            if(confirm(`カテゴリ「${cat}」を削除しますか？`)) { 
                delete links[cat]; 
                saveLinks(); 
                render(); 
            }
        };

        const list = box.querySelector('.link-list');
        links[cat].forEach((item, lIdx) => {
            const row = document.createElement('div');
            row.className = 'link-item';
            row.innerHTML = `<span>${item.title}</span><span class="delete-link-btn">×</span>`;
            
            row.onclick = (e) => { 
                if(!e.target.classList.contains('delete-link-btn')) window.open(item.url, '_blank'); 
            };
            
            row.querySelector('.delete-link-btn').onclick = (e) => {
                e.stopPropagation();
                if(confirm(`「${item.title}」を削除しますか？`)) { 
                    links[cat].splice(lIdx, 1); 
                    saveLinks(); 
                    render(); 
                }
            };
            list.appendChild(row);
        });

        container.appendChild(box);
        makeWidget(box, safeKey, {left: 50 + idx * 350, top: 500, w: 300, h: 250});
    });

    // 付箋の描画
    notes.forEach((n, i) => {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = `
            <div class="widget-header">
                <input type="text" value="${n.title}">
                <span class="cat-btn note-del">🗑️</span>
            </div>
            <textarea>${n.body}</textarea>`;
        
        nb.querySelector('input').oninput = (e) => { notes[i].title = e.target.value; saveNotes(); };
        nb.querySelector('textarea').oninput = (e) => { notes[i].body = e.target.value; saveNotes(); };
        nb.querySelector('.note-del').onclick = () => { 
            notes.splice(i, 1); 
            saveNotes(); 
            render(); 
        };
        container.appendChild(nb);
        makeWidget(nb, `pos_note_${i}`, {left: 100, top: 100, w: 300, h: 200});
    });
}

// --- 6. ボタンアクション設定 (メイン操作) ---
function setupButtonActions() {
    // カテゴリ追加
    document.getElementById('add-cat-btn').onclick = () => {
        const keys = Object.keys(bookmarkCatalog);
        let msg = "追加するカテゴリ番号を入力してください:\n[0] 新規空BOXを作成\n";
        keys.forEach((n, i) => msg += `[${i+1}] ${n}\n`);
        const c = prompt(msg);
        if (c === "0") { 
            const n = prompt("新しいカテゴリ名:"); 
            if(n){ links[n]=[]; saveLinks(); render(); } 
        } else if (keys[c-1]) { 
            links[keys[c-1]] = [...bookmarkCatalog[keys[c-1]]]; 
            saveLinks(); 
            render(); 
        }
    };

    // AIアシスタント (サイドパネル)
    document.getElementById('ai-btn').onclick = () => {
        let ai = localStorage.getItem('orbitTab_last_ai');
        if (!ai) {
            const c = prompt("デフォルトAIを選択:\n[1] Gemini\n[2] ChatGPT\n[3] Claude", "1");
            const urls = { 
                "1": "https://gemini.google.com/app", 
                "2": "https://chatgpt.com/", 
                "3": "https://claude.ai/" 
            };
            ai = urls[c]; 
            if(ai) localStorage.setItem('orbitTab_last_ai', ai);
        }
        if (ai) {
            chrome.sidePanel.setOptions({ path: ai, enabled: true });
            chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        }
    };

    // AIリセット (右クリック)
    document.getElementById('ai-btn').oncontextmenu = (e) => { 
        e.preventDefault(); 
        localStorage.removeItem('orbitTab_last_ai'); 
        alert("AIの選択をリセットしました。"); 
    };

    // 外部ページ・その他
    document.getElementById('guide-btn').onclick = () => window.open(chrome.runtime.getURL('guide.html'), '_blank');
    document.getElementById('cal-setup-btn').onclick = () => window.open('https://calendar.google.com/', '_blank');
    document.getElementById('note-setup-btn').onclick = () => { 
        notes.push({title: "新規メモ", body: ""}); 
        saveNotes(); 
        render(); 
    };
}

// --- 7. 初期化処理 (window.onload) ---
window.onload = () => { 
    updateClock(); 
    setInterval(updateClock, 1000); 
    render(); 
    setupImportFeature(); 
    setupButtonActions(); 
    
    const bg = localStorage.getItem('orbitTab_bg_v4');
    if (bg) document.getElementById('bg-container').style.backgroundImage = `url(${bg})`;
};