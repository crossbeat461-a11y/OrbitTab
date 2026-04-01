// 1. 時計の更新
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

// 2. 背景画像の変更と保存
const bgInput = document.getElementById('bg-input');
const bgBtn = document.getElementById('bg-change-btn');
const bgContainer = document.getElementById('bg-container');

bgBtn.addEventListener('click', () => bgInput.click());

bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64Image = event.target.result;
        bgContainer.style.backgroundImage = `url(${base64Image})`;
        localStorage.setItem('nestTab_bg', base64Image); // メモリ対策：ストレージに保存
    };
    reader.readAsDataURL(file);
});

// タブ復活時や読み込み時に背景を復元
window.onload = () => {
    const savedBg = localStorage.getItem('nestTab_bg');
    if (savedBg) {
        bgContainer.style.backgroundImage = `url(${savedBg})`;
    }
};