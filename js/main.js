/**
 * js/main.js
 */
const runMainDashboard = () => {
    // 背景と時計のロジック (略さず全文)
    const updateBackground = () => {
        const bgUrl = `https://picsum.photos/${window.innerWidth}/${window.innerHeight}?random=${Date.now()}`;
        const body = document.body;
        if (body) {
            const img = new Image();
            img.src = bgUrl;
            img.onload = () => { body.style.backgroundImage = `url('${bgUrl}')`; };
        }
    };

    const updateClock = () => {
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        const hour = now.getHours();
        const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        const userName = localStorage.getItem('nesttab_username') || 'Kimura';

        const area = document.getElementById('widgetsArea');
        if (area) {
            area.innerHTML = `
                <div style="text-align: center; color: #001f3f;">
                    <h1 style="font-size: 6rem; font-weight: 200; margin: 0; line-height: 1;">${timeStr}</h1>
                    <p id="greetingText" style="font-size: 1.5rem; font-weight: 300; letter-spacing: 4px; margin-top: 15px; cursor: pointer; text-transform: uppercase;">
                        ${greeting}, ${userName}.
                    </p>
                </div>
            `;

            // 🔴 描画した直後にイベントを紐付ける（これが一番確実）
            const textBtn = document.getElementById('greetingText');
            if (textBtn) {
                textBtn.addEventListener('click', () => {
                    const newName = prompt("名前を入力:", userName);
                    if (newName) {
                        localStorage.setItem('nesttab_username', newName);
                        updateClock();
                    }
                });
            }
        }
    };

    updateBackground();
    updateClock();
    setInterval(updateClock, 1000);
};

// 安全に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runMainDashboard);
} else {
    runMainDashboard();
}