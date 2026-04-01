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

// --- 2. 背景画像管理 (localStorage) ---
const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');
const bgContainer = document.getElementById('bg-container');

bgBtn.addEventListener('click', () => bgInput.click());

bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imgBase64 = event.target.result;
        bgContainer.style.backgroundImage = `url(${imgBase64})`;
        localStorage.setItem('nestTab_v2_bg', imgBase64);
    };
    reader.readAsDataURL(file);
});

// --- 3. リンク管理 & ドラッグ＆ドロップ ---
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
    const savedBg = localStorage.getItem('nestTab_v2_bg');
    if (savedBg) bgContainer.style.backgroundImage = `url(${savedBg})`;
    renderLinks();
});