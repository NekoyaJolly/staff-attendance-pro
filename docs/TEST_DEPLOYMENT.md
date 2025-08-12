# 勤怠管理システム - テスト・CI/CD ドキュメント

## 概要

このドキュメントでは、勤怠管理システムのテスト戦略、CI/CDパイプライン、および本番環境のセットアップについて説明します。

## テスト戦略

### 1. ユニットテスト（Vitest）

#### 設定
- **テストランナー**: Vitest
- **テスト環境**: jsdom
- **カバレッジツール**: v8
- **設定ファイル**: `vitest.config.ts`

#### 実行コマンド
```bash
# 一回実行
npm run test:unit

# 監視モード
npm run test:watch

# カバレッジ付き実行
npm run test:coverage

# UIモード
npm run test:ui
```

#### テスト対象
- React コンポーネント
- カスタムフック
- ユーティリティ関数
- ビジネスロジック

### 2. E2Eテスト（Playwright）

#### 設定
- **テストランナー**: Playwright
- **ブラウザ**: Chromium, Firefox, WebKit
- **モバイルテスト**: Chrome Mobile, Safari Mobile
- **設定ファイル**: `playwright.config.ts`

#### 実行コマンド
```bash
# 全ブラウザでテスト実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui

# デバッグモード
npm run test:e2e:debug
```

#### テスト対象
- ユーザーフロー
- 認証機能
- 管理者機能
- レスポンシブデザイン

### 3. Lintテスト

#### 設定
- **ESLint**: JavaScript/TypeScript静的解析
- **Prettier**: コードフォーマット
- **設定ファイル**: `eslint.config.js`, `.prettierrc.json`

#### 実行コマンド
```bash
# Lint実行
npm run lint

# Lint修正
npm run lint:fix

# フォーマットチェック
npm run format:check

# フォーマット適用
npm run format
```

## CI/CDパイプライン

### GitHub Actions ワークフロー

`.github/workflows/ci-cd.yml` で定義された自動化パイプライン:

#### 1. ビルドテスト
- 依存関係のインストール
- TypeScriptコンパイル
- Viteビルド
- 成果物のアップロード

#### 2. Lintテスト
- ESLint実行
- Prettier チェック
- コード品質の確認

#### 3. ユニットテスト
- Vitest実行
- カバレッジレポート生成
- Codecovへのアップロード

#### 4. E2Eテスト
- Playwright実行
- 複数ブラウザでのテスト
- テスト結果のアップロード

#### 5. セキュリティ監査
- npm audit実行
- 脆弱性チェック

#### 6. デプロイメント
- 本番環境へのデプロイ（mainブランチのみ）
- スモークテスト実行

## 本番環境セットアップ

### Docker構成

#### フロントエンド
- **ベースイメージ**: nginx:alpine
- **ビルド**: マルチステージビルド
- **設定**: カスタムnginx設定

#### バックエンドAPI
- **ベースイメージ**: node:18-alpine
- **フレームワーク**: Express.js
- **認証**: JWT
- **レート制限**: 実装済み

#### データベース
- **種類**: PostgreSQL 15
- **初期化**: `database/init.sql`
- **バックアップ**: 自動設定

#### 監視
- **Prometheus**: メトリクス収集
- **Grafana**: ダッシュボード

### 起動方法

#### 開発環境
```bash
# フロントエンド
npm run dev

# バックエンド（別ターミナル）
cd backend && npm install && npm run dev
```

#### 本番環境
```bash
# Docker Compose起動
docker-compose up -d

# ヘルスチェック
curl http://localhost/health
curl http://localhost:3000/health
```

## テスト実行手順

### 1. 環境準備
```bash
# 依存関係インストール
npm ci

# Playwright ブラウザインストール
npx playwright install
```

### 2. 全テスト実行
```bash
# 全テスト
npm run test:all

# または個別実行
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

### 3. CI実行
```bash
# CI用一括実行
npm run ci
```

## テストデータ

### 認証情報
- **管理者**: ID: `admin`, パスワード: `admin123`
- **スタッフ**: ID: `S001`, パスワード: `staff123`
- **作成者**: ID: `C001`, パスワード: `creator123`

### QRコード
- メインエントランス: `QR_MAIN_ENTRANCE`
- スタッフルーム: `QR_STAFF_ROOM`
- オフィス: `QR_OFFICE`

## パフォーマンス目標

### フロントエンド
- **初回ページ読み込み**: < 3秒
- **ページ遷移**: < 1秒
- **Lighthouse スコア**: > 90

### バックエンド
- **API応答時間**: < 500ms
- **同時接続数**: 1000+
- **可用性**: 99.9%

## セキュリティ

### 実装済み対策
- HTTPS強制
- CORS設定
- レート制限
- CSPヘッダー
- XSS対策
- JWT認証

### 定期監査
- npm audit (CI/CD)
- 依存関係更新
- セキュリティパッチ適用

## トラブルシューティング

### よくある問題

#### テスト失敗
```bash
# キャッシュクリア
npm cache clean --force

# node_modules再インストール
rm -rf node_modules package-lock.json
npm install
```

#### E2Eテスト失敗
```bash
# ブラウザ再インストール
npx playwright install --with-deps

# デバッグモード実行
npm run test:e2e:debug
```

#### ビルド失敗
```bash
# TypeScript型チェック
npm run type-check

# 依存関係確認
npm audit
```

## 監視・ログ

### メトリクス
- アプリケーション稼働状況
- API応答時間
- エラー率
- リソース使用量

### ダッシュボード
- **Grafana**: http://localhost:3001
- **認証**: admin/admin

### ログ
- アプリケーションログ: Docker volumes
- アクセスログ: Nginx
- エラーログ: Winston

## チーム開発ガイドライン

### Git ワークフロー
1. 機能ブランチ作成
2. 開発・テスト
3. プルリクエスト作成
4. CI/CD実行
5. レビュー・マージ

### コード品質
- プルリクエスト必須
- 全テスト合格必須
- カバレッジ80%以上
- コードレビュー必須

この構成により、本番レベルの品質と安定性を持つ勤怠管理システムが実現されます。