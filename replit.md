# 日本ベゴニア協会 図鑑システム

## Overview

日本ベゴニア協会の会員専用ベゴニア図鑑システムです。約2万件のベゴニア種データを管理し、会員が検索・閲覧できる図鑑を提供します。

## 主要機能

- **種マスター管理**: 学名、作出者名、分類、花色、産地等のベゴニア種データの登録・検索・閲覧
- **会員ログイン**: Replit Auth による認証
- **ロール別権限制御**: member（会員）、admin（管理者）、reviewer（理事）
- **招待URL入会**: 管理者が個別に招待URLを発行し、新規会員が自己登録
- **写真管理**: 協会運営による写真の登録・公開（会員限定配信）
- **審査機能**: 理事による写真提出の審査（先着順、1名承認、却下時は即時削除）
- **監査ログ**: 操作履歴の記録

## 技術構成

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Replit Auth (OpenID Connect)
- **Routing**: wouter (frontend), Express (backend)
- **画像処理**: sharp（EXIF自動回転・リサイズ・サムネイル生成）

## プロジェクト構造

```
├── client/src/
│   ├── components/         # UIコンポーネント
│   │   ├── ui/            # shadcn/uiコンポーネント
│   │   ├── app-sidebar.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/              # カスタムフック
│   │   ├── use-auth.ts
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/                # ユーティリティ
│   │   ├── queryClient.ts
│   │   ├── utils.ts
│   │   └── auth-utils.ts
│   ├── pages/              # ページコンポーネント
│   │   ├── landing.tsx     # ランディングページ
│   │   ├── home.tsx        # ホーム
│   │   ├── encyclopedia.tsx # 図鑑検索
│   │   ├── species-detail.tsx
│   │   ├── review.tsx      # 審査キュー
│   │   ├── admin/
│   │   │   ├── species.tsx # 種マスター管理
│   │   │   ├── members.tsx # 会員管理
│   │   │   └── photos.tsx  # 写真管理
│   │   └── not-found.tsx
│   ├── App.tsx
│   └── index.css           # デザイントークン
├── server/
│   ├── index.ts            # サーバーエントリー
│   ├── routes.ts           # APIルート
│   ├── storage.ts          # データアクセス層
│   ├── db.ts               # データベース接続
│   └── replit_integrations/auth/  # 認証モジュール
├── shared/
│   ├── schema.ts           # Drizzleスキーマ
│   └── models/auth.ts      # 認証関連スキーマ
└── uploads/                # 画像ファイル保存
```

## データモデル

### users (認証ユーザー)
Replit Auth で自動作成されるユーザー情報

### members (会員)
| カラム | 型 | 説明 |
|--------|------|------|
| id | varchar | 主キー |
| userId | varchar | usersへの参照 |
| memberNumber | varchar | 会員番号 |
| displayName | varchar | 表示名 |
| role | varchar | ロール (member/admin/reviewer) |
| status | varchar | 状態 (active/inactive/suspended) |

### species (種マスター)
| カラム | 型 | 説明 |
|--------|------|------|
| id | varchar | 主キー |
| scientificName | text | 学名 |
| authorName | text | 作出者名 |
| classification | text | 分類 |
| flowerColor | text | 花色 |
| origin | text | 産地・出典 |
| japaneseName | text | 和名・読み |
| notes | text | 備考 |

### photos (公開写真)
承認済み写真。speciesIdが必須

### photo_submissions (写真提出)
審査待ち・却下写真。却下時はfileKeyがnull化

## API エンドポイント

### 認証
- `GET /api/login` - ログインフロー開始
- `GET /api/logout` - ログアウト
- `GET /api/auth/user` - 現在のユーザー取得
- `GET /api/me` - 現在の会員情報取得

### 種 (全会員)
- `GET /api/species` - 種検索 (q, page, limit)
- `GET /api/species/recent` - 最近の種
- `GET /api/species/:id` - 種詳細 + 写真

### 管理者 (admin)
- `POST /api/admin/species` - 種追加
- `PATCH /api/admin/species/:id` - 種更新
- `DELETE /api/admin/species/:id` - 種削除
- `POST /api/admin/species/import` - CSVインポート
- `GET /api/admin/members` - 会員一覧
- `POST /api/admin/members` - 会員登録
- `PATCH /api/admin/members/:id` - 会員更新
- `GET /api/admin/photos` - 公開写真一覧
- `POST /api/admin/photos` - 写真登録

### 理事 (reviewer)
- `GET /api/review/queue` - 審査キュー
- `POST /api/review/:id/approve` - 承認
- `POST /api/review/:id/reject` - 却下 (code必須)

### ファイル
- `GET /api/files/:key` - 画像配信 (認証必須)

## ロールと権限

| 機能 | member | admin | reviewer |
|------|--------|-------|----------|
| 図鑑検索・閲覧 | ○ | ○ | ○ |
| 種マスター編集 | × | ○ | × |
| 会員管理 | × | ○ | × |
| 写真登録 | × | ○ | × |
| 審査 | × | × | ○ |

## 却下理由コード

- R01: 権利確認不可
- R02: 被写体不適切
- R03: 画質不足
- R04: 同定情報不足
- R05: 規約抵触

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run db:push    # スキーマをDBに反映
```

## デザインシステム

ボタニカルグリーンをベースカラーとした自然な配色。
ライトモード・ダークモード対応。
