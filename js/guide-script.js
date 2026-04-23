// guide.html専用の閉じ処理
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.close();
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. 背景画像の適用
    const savedBg = localStorage.getItem('orbitTab_bg_v4');
    if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
    }

    // 2. 閉じるボタンの処理
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.close();
        });
    }
});