/**
 * js/storage-manager.js
 * 役割：データの保存・読み込み（ブラウザのストレージを使用）
 */

const StorageManager = {
    /**
     * カテゴリ一覧を保存する
     * @param {Array} categories - カテゴリオブジェクトの配列
     */
    saveCategories: function(categories) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ 'nesttab_categories': categories }, () => {
                console.log('Categories saved to storage.');
                resolve();
            });
        });
    },

    /**
     * カテゴリ一覧を読み込む
     * @returns {Promise<Array>} - 保存されているカテゴリ配列
     */
    loadCategories: function() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['nesttab_categories'], (result) => {
                const categories = result.nesttab_categories || [];
                resolve(categories);
            });
        });
    },

    /**
     * 特定のカテゴリに紐づくブックマークを保存する
     * @param {string} categoryId - カテゴリのID
     * @param {Array} bookmarks - ブックマークオブジェクトの配列
     */
    saveBookmarks: function(categoryId, bookmarks) {
        return new Promise((resolve) => {
            const key = `bookmarks_${categoryId}`;
            chrome.storage.local.set({ [key]: bookmarks }, () => {
                console.log(`Bookmarks for ${categoryId} saved.`);
                resolve();
            });
        });
    },

    /**
     * 特定のカテゴリに紐づくブックマークを読み込む
     * @param {string} categoryId
     * @returns {Promise<Array>}
     */
    loadBookmarks: function(categoryId) {
        return new Promise((resolve) => {
            const key = `bookmarks_${categoryId}`;
            chrome.storage.local.get([key], (result) => {
                const bookmarks = result[key] || [];
                resolve(bookmarks);
            });
        });
    }
};