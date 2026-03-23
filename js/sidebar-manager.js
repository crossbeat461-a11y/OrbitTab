/**
 * js/sidebar-manager.js
 * 役割：カテゴリ追加ボタンの動作と、画面への描画をすべて担当する
 */

// --- 1. カテゴリを画面に追加する「実体」の関数 ---
const addNewCategoryToUI = (name) => {
    // A. サイドバー（左側）に項目を追加
    const categoryList = document.getElementById('categoryList');
    if (categoryList) {
        const navItem = document.createElement('div');
        navItem.className = 'category-item';
        navItem.textContent = name;
        // クリックしたら「アクティブ」にするなどの処理も後で足せます
        categoryList.appendChild(navItem);
    }

    // B. メインエリア（右側）にアコーディオン（枠組み）を追加
    const accordionContainer = document.getElementById('accordionContainer');
    if (accordionContainer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'accordion-wrapper';
        wrapper.style.marginBottom = "20px";
        wrapper.innerHTML = `
            <div class="widget">
                <h3 style="color: #001f3f; margin-bottom: 10px; border-bottom: 1px solid rgba(0,31,63,0.1); padding-bottom: 5px;">
                    ${name}
                </h3>
                <p style="opacity: 0.6; font-size: 0.9rem;">No links yet. Right-click to add.</p>
            </div>
        `;
        accordionContainer.appendChild(wrapper);
    }
};

// --- 2. ボタンのクリックを監視する ---
document.addEventListener('click', (event) => {
    // クリックされた要素のIDが 'addCategoryBtn' かチェック
    if (event.target && event.target.id === 'addCategoryBtn') {
        
        const categoryName = prompt("新しいカテゴリ名を入力してください:");
        
        if (categoryName && categoryName.trim() !== "") {
            // 他のファイルを呼ばず、上の関数を直接実行！
            addNewCategoryToUI(categoryName.trim());
        }
    }
});

console.log("Sidebar Manager: 自己完結モードで起動しました。");