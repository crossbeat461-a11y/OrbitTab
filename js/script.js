const NOTE_URL = "https://note.com/ktech_dev/m/m04f657544153";
const DEFAULT_LINKS = {
    "Search & Mail": [
        { title: "Google", url: "https://www.google.com" },
        { title: "Gmail", url: "https://mail.google.com" }
    ]
};
const DEFAULT_NOTE = [{ title: "タスク", body: "🚀 OrbitTabへようこそ！" }];

function getStored(key, def) {
    const val = localStorage.getItem(key);
    return (val === null || val === "{}") ? def : JSON.parse(val);
}

let links = getStored('orbitTab_v1_links', DEFAULT_LINKS);
let notes = getStored('orbitTab_notes_v4', DEFAULT_NOTE);
let calUrl = localStorage.getItem('orbitTab_calUrl') || "";
let maxZ = 100;

// 時計
function updateClock() {
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');
    if (!clock || !date) return;
    const now = new Date();
    clock.innerText = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    date.innerText = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
setInterval(updateClock, 1000);

// ウィジェット機能（ドラッグ改善）
function makeWidget(el, key, def) {
    const pos = getStored(key, def);
    el.style.left = pos.left + "px"; el.style.top = pos.top + "px";
    el.style.width = pos.w + "px"; el.style.height = pos.h + "px";

    const header = el.querySelector('.widget-header');
    
    // ヘッダーを掴んだときだけドラッグを開始
    header.onmousedown = function(e) {
        // ボタンや入力欄の上なら無視
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('cat-delete-btn')) return;
        
        maxZ++; el.style.zIndex = maxZ;
        let startX = e.clientX - el.offsetLeft;
        let startY = e.clientY - el.offsetTop;

        document.onmousemove = function(me) {
            el.style.left = (me.clientX - startX) + "px";
            el.style.top = (me.clientY - startY) + "px";
        };

        document.onmouseup = function() {
            document.onmousemove = null;
            localStorage.setItem(key, JSON.stringify({
                left: el.offsetLeft, 
                top: el.offsetTop, 
                w: el.offsetWidth, 
                h: el.offsetHeight
            }));
        };
    };
    
    // 中身をクリックしても最前面に来るようにする
    el.onclick = function() {
        maxZ++; el.style.zIndex = maxZ;
    };
}

// 描画エンジン
function render() {
    const container = document.getElementById('widgets-container');
    if (!container) return;
    container.innerHTML = "";

    // カテゴリBOX
    Object.keys(links).forEach(function(cat, i) {
        const box = document.createElement('div');
        box.className = 'widget';
        box.innerHTML = '<div class="widget-header"><span class="widget-title">' + cat + '</span><span class="cat-delete-btn">🗑️</span></div><div class="link-list"></div>';
        
        box.querySelector('.cat-delete-btn').onclick = function(e) { 
            e.stopPropagation();
            if(confirm("このカテゴリを削除しますか？")){ 
                delete links[cat]; 
                localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); 
                render(); 
            } 
        };
        
        const list = box.querySelector('.link-list');
        links[cat].forEach(function(item, idx) {
            const row = document.createElement('div');
            row.className = 'link-wrapper';
            row.innerHTML = '<span>' + item.title + '</span>';
            row.onclick = function() { window.open(item.url, '_blank'); };
            list.appendChild(row);
        });
        container.appendChild(box);
        makeWidget(box, "pos_cat_" + cat.replace(/\s+/g, '_'), {left: 100 + i*340, top: 550, w: 300, h: 250});
    });

    // 付箋（入力不具合を修正）
    notes.forEach(function(n, i) {
        const nb = document.createElement('div');
        nb.className = 'widget';
        nb.innerHTML = '<div class="widget-header"><input type="text" class="nt-input" value="' + n.title + '" placeholder="見出し"><span class="cat-delete-btn">🗑️</span></div><textarea class="ni-textarea" placeholder="メモを入力...">' + n.body + '</textarea>';
        
        const nt = nb.querySelector('.nt-input');
        const ni = nb.querySelector('.ni-textarea');
        const del = nb.querySelector('.cat-delete-btn');

        // 文字入力ができるようにイベントのバブリングを停止
        nt.onmousedown = ni.onmousedown = (e) => e.stopPropagation();

        nt.oninput = function() { notes[i].title = nt.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        ni.oninput = function() { notes[i].body = ni.value; localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); };
        
        del.onclick = function(e) { 
            e.stopPropagation();
            notes.splice(i, 1); 
            localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); 
            render(); 
        };
        
        container.appendChild(nb);
        makeWidget(nb, "pos_note_" + i, {left: 450 + i*30, top: 150 + i*30, w: 300, h: 250});
    });
}

// 矢印キーでスクロール
window.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const step = 60;
    const main = document.querySelector('.main-interface');
    if (e.key === 'ArrowRight') main.scrollLeft += step;
    if (e.key === 'ArrowLeft') main.scrollLeft -= step;
    if (e.key === 'ArrowDown') main.scrollTop += step;
    if (e.key === 'ArrowUp') main.scrollTop -= step;
});

// 操作ボタン
document.getElementById('guide-btn').onclick = () => window.open(NOTE_URL, '_blank');
document.getElementById('add-cat-btn').onclick = () => {
    const n = prompt("カテゴリ名:");
    if(n) { links[n] = []; localStorage.setItem('orbitTab_v1_links', JSON.stringify(links)); render(); }
};
document.getElementById('note-setup-btn').onclick = () => {
    if(notes.length < 4) { notes.push({title: "タスク", body: ""}); localStorage.setItem('orbitTab_notes_v4', JSON.stringify(notes)); render(); }
};
document.getElementById('cal-setup-btn').onclick = () => {
    const u = prompt("カレンダーURL:");
    if(u) { localStorage.setItem('orbitTab_calUrl', u); location.reload(); }
};

window.onload = function() { updateClock(); render(); };