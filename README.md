# OrbitTab 🚀

**Version 1.5.4** — Turn every new Chrome tab into your personal digital cockpit.

[English](#english) | [日本語](#japanese)

---

<a name="english"></a>
## English

**Your browser’s new-tab page, upgraded into a command center.**  
OrbitTab replaces Chrome’s default new tab with a customizable cockpit: bookmark category boxes, sticky notes, AI side panel, calendar shortcut, and your own background.

### ✨ Key Features

* **New Tab Cockpit** — Clock, date, and a free-form workspace every time you open a tab.
* **Bookmark import** — Load exported Chrome bookmark HTML and place folders as movable boxes.
* **Draggable widgets** — Move and resize category boxes and notes; layout is saved automatically.
* **AI Side Panel** — One-click access to Gemini, ChatGPT, or Claude in Chrome’s side panel (right-click to reset).
* **Sticky notes** — Add digital memos on the board; edit titles and body freely.
* **Google Calendar** — Quick open from the toolbar.
* **Custom background** — Set your own image; it also applies to the built-in guide page.
* **Privacy-friendly** — Layout, notes, and background stay in local browser storage.
* **Support** — Toolbar ☕ opens [Buy Me a Coffee](https://buymeacoffee.com/k_tech_studio).

### 📥 Installation

Official Chrome Web Store listing:  
👉 **[Install OrbitTab](https://chromewebstore.google.com/detail/orbittab/dmaobemdkkijdjgeefanfaffglbokkde)**

Landing page:  
👉 **[OrbitTab LP](https://orbit-lp-sigma.vercel.app/)**

### 🛠 How to Use

1. Install OrbitTab and open a **new tab**.
2. Click **📥** and import a Chrome bookmarks HTML export (optional but recommended).
3. Click **＋**, pick a folder number (or `0` for an empty box).
4. Drag box headers to move; drag the bottom-right corner to resize.
5. Use **✨** for AI (side panel; right-click to reset), **📝** for sticky notes, **📅** for Google Calendar, **🖼️** for background, **☕** for Buy Me a Coffee.

### 📖 In-app Guide

Click **📖** on the OrbitTab toolbar to open the full guide (`guide.html`).

### 🧑‍💻 Load unpacked (development)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this repository folder
4. Open a new tab to try OrbitTab

### 📁 Project structure

```
OrbitTab/
├── manifest.json      # Chrome MV3 extension config
├── index.html         # New tab cockpit
├── guide.html         # Usage guide
├── css/style.css
├── js/script.js
├── js/guide-script.js
└── icons/
```

### 🔒 Permissions

| Permission | Why |
|---|---|
| `sidePanel` | Open AI assistants in Chrome’s side panel |
| `host_permissions` (`<all_urls>`) | Allow side panel paths for AI sites |
| `chrome_url_overrides.newtab` | Replace the default new tab page |

No account required. Widget positions, notes, bookmark boxes, and background are stored locally (`localStorage`).

### Disclaimer (no warranty)

This software is provided **as is**, without warranty of any kind. The developer does not guarantee that it will work in every environment. Use at your own risk.

---

<a name="japanese"></a>
## 日本語

**新しいタブを、自分専用のデジタル管制塔に。**  
OrbitTab は Chrome の新規タブをカスタマイズ可能なコクピットに置き換えます。ブックマーク BOX・付箋・AI サイドパネル・カレンダー・背景画像まで、ひとつの画面にまとめられます（**v1.5.4**）。

### ✨ 主な特徴

* **新規タブ＝コクピット** — 時計・日付と、自由配置のワークスペース。
* **ブックマーク取り込み** — 書き出した HTML を読み込み、フォルダを BOX として配置。
* **ドラッグ＆リサイズ** — BOX / 付箋を好きな位置・サイズに。配置は自動保存。
* **AI サイドパネル** — Gemini / ChatGPT / Claude をサイドパネルで起動（右クリックでリセット）。
* **付箋メモ** — 画面上にデジタル付箋を追加・編集。
* **Google カレンダー** — ワンクリックで開く。
* **背景カスタム** — お気に入り画像を設定（ガイドページにも反映）。
* **ローカル完結** — レイアウトやメモはブラウザ内に保存。
* **サポート** — 右下の ☕ から [Buy Me a Coffee](https://buymeacoffee.com/k_tech_studio) を開けます。

### 📥 インストール

Chrome ウェブストア：  
👉 **[OrbitTab をインストール](https://chromewebstore.google.com/detail/orbittab/dmaobemdkkijdjgeefanfaffglbokkde)**

LP：  
👉 **[OrbitTab LP](https://orbit-lp-sigma.vercel.app/)**

### 🛠 使い方

1. OrbitTab を入れたら **新しいタブ** を開きます。
2. **📥** から Chrome のブックマーク HTML をインポート（任意・推奨）。
3. **＋** でカテゴリ番号を入力（`0` で空の BOX）。
4. BOX 上部をドラッグで移動、右下端でリサイズ。
5. **✨** AI（右クリックでリセット） / **📝** 付箋 / **📅** カレンダー / **🖼️** 背景 / **☕** Coffee を使ってカスタム。

### 📖 ガイド

画面の **📖** からアプリ内ガイド（`guide.html`）を開けます。

### 🧑‍💻 開発者向け（パッケージ未公開の読み込み）

1. `chrome://extensions` を開く
2. **デベロッパーモード** をオン
3. **パッケージ化されていない拡張機能を読み込む** → このリポジトリフォルダを選択
4. 新しいタブで動作確認

### 📁 構成

```
OrbitTab/
├── manifest.json      # Chrome MV3 設定
├── index.html         # 新規タブ（コクピット）
├── guide.html         # 使い方ガイド
├── css/style.css
├── js/script.js
├── js/guide-script.js
└── icons/
```

### 🔒 権限について

| 権限 | 用途 |
|---|---|
| `sidePanel` | AI を Chrome サイドパネルで開く |
| `host_permissions`（`<all_urls>`） | AI サイトをサイドパネル表示するため |
| `chrome_url_overrides.newtab` | デフォルトの新規タブを置き換え |

アカウント登録は不要です。BOX の位置・付箋・背景などは端末の `localStorage` に保存されます。

### 免責（無保証）

本ソフトウェアは **現状有姿（無保証）** で提供します。あらゆる環境での動作を保証しません。利用は自己責任です。

---

## 🔗 Links

* **Chrome Web Store:** [OrbitTab](https://chromewebstore.google.com/detail/orbittab/dmaobemdkkijdjgeefanfaffglbokkde)
* **Landing Page:** [OrbitTab LP](https://orbit-lp-sigma.vercel.app/)
* **Developer / Studio:** [K-Tech Studio](https://github.com/crossbeat461-a11y)
* **Buy Me a Coffee:** [k_tech_studio](https://buymeacoffee.com/k_tech_studio)

---

© 2026 OrbitTab / K-Tech Studio.  
Built as a Chrome Manifest V3 new-tab extension.
