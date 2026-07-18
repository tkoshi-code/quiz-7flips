# quiz-7flips

スアールのクイズイベントで使用する進行・ルール表示アプリです。Flip 7、コーナー説明、告知スライド、休憩表示などをまとめています。

## 公開サイト

https://tkoshi-code.github.io/quiz-7flips/

`master` ブランチへpushすると、GitHub Actionsが自動的にビルドしてGitHub Pagesへ公開します。

## ローカル起動

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

ブラウザで `http://127.0.0.1:5173/` を開きます。

## ビルド確認

```sh
npm run build
```
