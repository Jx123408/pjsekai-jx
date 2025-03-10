# SonolusWP_dev
Node.js, Vite, React, Assembly Scriptを利用した開発環境を構築するためのディレクトリが格納されたリポジトリです。
# 環境構築方法
私の環境は次の通りです。
> Windows 11
> nvm-windows v1.2.2 
## リポジトリをダウンロード
リポジトリをダウンロードして展開します。
次のツリーのようなファイル構成になっているはずです。
(`env`ディレクトリをカレントディレクトリとします。
また、`./build`ディレクトリ、`./src/as/build`ディレクトリは作成してください。)
```
env
│  asconfig.json
│  package.json
│  vite.config.js
│
├─build
└─src
    │  engine.js
    │  i18n.js
    │  index.html
    │  manifest.json
    │  style.css
    │  system.jsx
    │
    ├─as
    │  ├─assembly
    │  │      index.d.ts
    │  │      node_calc.ts
    │  │
    │  └─build
    └─public
        │  sw.js
        │
        ├─icons
        │      favicon.ico
        │      favicon.png
        │
        ├─localization
        │      en-localization-react.json
        │      ja-localization-react.json
        │
        ├─textures
        │      cancel.svg
        │      caution.svg
        │      caution_orange.svg
        │      close.svg
        │      cloud_download.png
        │      delete.svg
        │      edit.svg
        │      loading.svg
        │      system_tex.webp
        │      unknown.png
        │
        └─zlib
                gunzip.min.js
                unzip.min.js
```
## node.jsをインストール
(すでにnode.jsとnpmが使える環境下であればこの項目の操作をする必要はありません。)
nvmをインストールしてください。私のWin11環境では[nvm-windows](https://github.com/coreybutler/nvm-windows)をインストールしました。
そのあと、次のコマンドでnode.jsとnpm(LTS)をインストールしてください。
```
nvm install lts
```
次に現在起動しているnode.jsを確認してください。
```
nvm list
```
シェル上の`*`がついたバージョンが起動しているnode.jsです。
`*`がついていないか、LTS以外についている場合は、次のコマンドで切り替えてください。
```
nvm use lts
```
## モジュールをインストール
次のコマンドをカレントディレクトリで実行してください。
```
npm install
```
## assembly scriptをコンパイル
次のコマンドでassembly scriptをコンパイルしてください。
```
npm run asc_release
```

## サイトをビルド
次のコマンドでビルドしてください。
```
npm run build
```

## サイトを表示
VSCodeのLive Serverなどを利用し、index.htmlを開いてください。

