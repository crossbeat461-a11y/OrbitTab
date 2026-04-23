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