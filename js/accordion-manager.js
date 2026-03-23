/**
 * js/accordion-manager.js
 * 役割：カテゴリに紐づくリンクを表示（確認ダイアログなしの即時削除版）
 */

const AccordionManager = {
    container: null,

    init: function() {
        this.container = document.getElementById('accordionContainer');
    },

    displayCategoryLinks: async function(categoryId, categoryName) {
        this.init();
        this.container.innerHTML = '';

        const bookmarks = await StorageManager.loadBookmarks(categoryId);

        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.padding = '15px';
        header.style.background = '#eee';
        header.style.fontWeight = 'bold';
        header.style.borderRadius = '8px 8px 0 0';
        header.innerHTML = `
            <span>${categoryName}</span>
            <span style="font-size: 0.8rem; color: #666;">${bookmarks.length} items</span>
        `;
        
        const content = document.createElement('div');
        content.className = 'accordion-content';
        content.style.border = '1px solid #eee';
        content.style.borderRadius = '0 0 8px 8px';
        content.style.background = 'white';

        if (bookmarks.length === 0) {
            content.innerHTML = '<p style="padding:20px; color:#999; text-align:center;">No links yet.</p>';
        } else {
            const list = document.createElement('div');

            bookmarks.forEach((link, index) => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.padding = '12px 15px';
                row.style.borderBottom = index === bookmarks.length - 1 ? 'none' : '1px solid #f5f5f5';

                const linkAnchor = document.createElement('a');
                linkAnchor.href = link.url;
                linkAnchor.target = '_blank';
                linkAnchor.style.textDecoration = 'none';
                linkAnchor.style.color = '#333';
                linkAnchor.style.flexGrow = '1';
                linkAnchor.innerHTML = `
                    <div style="font-weight: 600;">${link.name}</div>
                    <div style="font-size: 0.75rem; color: #0066cc; word-break: break-all;">${link.url}</div>
                `;

                // 削除ボタン（ダイアログなしで即実行）
                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.style.border = 'none';
                delBtn.style.background = 'transparent';
                delBtn.style.color = '#ccc';
                delBtn.style.cursor = 'pointer';
                delBtn.style.padding = '5px 10px';
                delBtn.onmouseover = () => delBtn.style.color = '#ff4444';
                delBtn.onmouseout = () => delBtn.style.color = '#ccc';

                delBtn.onclick = async (e) => {
                    e.preventDefault();
                    // ダイアログなしで削除実行
                    const updatedBookmarks = bookmarks.filter(b => b.id !== link.id);
                    await StorageManager.saveBookmarks(categoryId, updatedBookmarks);
                    this.displayCategoryLinks(categoryId, categoryName);
                };

                row.appendChild(linkAnchor);
                row.appendChild(delBtn);
                list.appendChild(row);
            });
            content.appendChild(list);
        }

        accordionItem.appendChild(header);
        accordionItem.appendChild(content);
        this.container.appendChild(accordionItem);
    }
};