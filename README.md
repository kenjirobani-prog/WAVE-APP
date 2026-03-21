# Shonan Wave Forecast

湘南特化・パーソナライズ波診断アプリ。

## セットアップ

```bash
npm install
npm run dev
```

## 環境変数

`.env.local` に以下を設定してください。

```
WAVE_API_PROVIDER=open-meteo

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Firestore セキュリティルール

Firebase コンソール → Firestore → ルール に以下を設定してください。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // スポットデータ（管理画面から読み書き）
    match /spots/{spotId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // ユーザーごとのサーフログ（本人のみアクセス可）
    match /users/{uid}/surfLogs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### ルールの説明

| パス | 読み取り | 書き込み |
|------|---------|---------|
| `spots/{spotId}` | 全員 | 管理者のみ（`admin` カスタムクレーム必須） |
| `users/{uid}/surfLogs/{logId}` | 本人のみ | 本人のみ |

Surf Log は Firebase 匿名認証（`signInAnonymously`）で発行した `uid` でデータを分離します。
匿名ユーザーはアプリ初回起動時に自動で作成され、同一デバイスでは永続します。

## データ移行

localStorage に保存済みの Surf Log データは、次回オンライン時に自動で Firestore へ移行されます。
移行後は localStorage のデータが削除されます。
