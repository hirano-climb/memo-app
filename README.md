# share memo
メモの共有アプリ
<br>
# URL
[share memo](https://athletic-miracle-production.up.railway.app/)<br>
<br>
# 概要
メモの一覧、登録、更新、削除機能とユーザーの登録、削除機能を前提に、ログイン（ユーザー登録）することでメモの中身の閲覧と新規登録を可能とし、メモの更新及び削除はそのメモを登録したユーザーのみが編集可能とする機能を実装しました。<br>
メモの検索機能については、検索層を設置して部分一致でメモのタイトル、区分、作成ユーザー名を抽出可能としました。<br>
ルーティングやCRUD、デプロイの練習で作成したアプリなので、不足や不安定な箇所が多々あると思いますが、今後さらに学習を進めていく中で、高度なWEB開発が行えるスキルを身につけていきたいです。
<br>
# 環境
"bcryptjs": "^2.4.3",<br>
"body-parser": "^1.20.3",<br>
"dotenv": "^16.4.7",<br>
"ejs": "^3.1.10",<br>
"express": "^4.21.2",<br>
"express-session": "^1.18.1",<br>
"mysql2": "^3.12.0"
