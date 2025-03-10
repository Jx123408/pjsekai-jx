[English](https://github.com/1217pond/SonolusWP_dev/blob/main/README-en.md)
# SonolusWP_dev
Node.js, Vite, React, AssemblyScriptを利用した開発環境を構築するためのディレクトリが格納されたリポジトリです。MITライセンスで公開されています。
# 環境構築方法
私の環境は次の通りです。
- Windows 11
- nvm-windows v1.2.2 
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
        │　manifest.json
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
> [!NOTE]
> すでにnode.jsとnpmが使える環境下であればこの項目の操作をする必要はありません。

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
これで環境構築は完了です。

# 開発手順
## コードを書く
コードは次のような使い分けになっています。

- `index.html`: ページ
- `style.css`: スタイルシート
- `system.jsx`: ReactによるGUIのJavaScriptXML
- `engine.js`: エンジンをエミュレーションするJavaScript
- `node_calc.ts`: ノード計算や、メッシュ計算などを担当するAssemblyScript
- `sw.js`: Service Workerを担当するJavaScript
- `i18n.js`: i18nのクラスを定義するJavaScript

## AssemblyScriptをコンパイル
次のコマンドでAssemblyScriptをコンパイルしてください。
```
npm run asc_release
```
## リアルタイム更新しながらサイトをプレビューする
次のコマンドを実行してサーバーを起動してください。
```
npm run dev
```
次のように表示されるはずです。(`Network`は表示されない場合があります)
```
> sonolus-web-player@0.0.0 dev
> vite --host

  VITE v6.2.1  ready in <any> ms

  ➜  Local:   http://localhost:<port>/
  ➜  Network: http://<ip>:<port>/
  ➜  press h + enter to show help
```
どのURLからでもアクセスできます。(`Local`以外はファイアウォールのポート開放が必要な場合があります)  
`src`内のファイルを更新するとサイトも更新されます。コーディング中に使うことをおすすめします。  

## ビルドをプレビュー
次のコマンドを実行してサーバーを起動してください。
```
npm run preview
```
次のように表示されるはずです。(`Network`は表示されない場合があります)
```
> sonolus-web-player@0.0.0 preview
> vite preview

  ➜  Local:   http://localhost:<port>/
  ➜  Network: http://<ip>:<port>/
  ➜  press h + enter to show help
```
どのURLからでもアクセスできます。(`Local`以外はファイアウォールのポート開放が必要な場合があります)  
ビルド結果をプレビューすることができます。  
ビルドする前に正常に動作するか確認するときに使うことをおすすめします。  
(Viteはコンパイル済みのWASMを参照しているため、`node_calc.ts`を書きかえる度に[AssemblyScriptをコンパイル](#assemblyscriptをコンパイル)してください。)

## ビルド
次のコマンドを実行してビルドできます。
```
npm run build
```
`./build`ディレクトリ内にビルド済みのページデータが生成されます。  
ビルドするとき、最初に`./build`ディレクトリ内を削除してしまうため、`./build`ディレクトリ内でファイルを編集したり、作成したりしないでください。  
(`package.json`の`scripts/build`の`--emptyOutDir`を消すことで、`./build`ディレクトリ内が削除されなくなります。)  
