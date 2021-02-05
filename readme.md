# 会員制 Web 掲示板サービス

# 製作物概要
http://ec2-3-86-254-116.compute-1.amazonaws.com/

## 機能一覧

- 新規ユーザー登録
- ログイン
- ログアウト
- マイページ
- プロフィールページ
- 自分のプロフィールの編集
- 掲示板の表示
- 掲示板への投稿

## 使用技術一覧

- redis によるセッション管理
- nginx による静的コンテンツ配信
- postgreSQL の使用
- docker-compose の使用(redis, nginx, node, postgreSQL)
