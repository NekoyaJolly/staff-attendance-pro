# 勤怠管理システム

本格的な業務用勤怠管理アプリケーション。スタッフの出退勤管理、シフト作成、QRコード認証機能を提供します。

## 🚀 主要機能

### 認証・権限管理
- **スタッフ**: シフト確認、勤怠記録、プロフィール管理
- **作成者**: シフト作成・編集機能
- **管理者**: 全機能へのアクセス、承認管理、データエクスポート

### 勤怠管理
- QRコード読み取りによる自動打刻
- 手動入力による勤怠記録（管理者承認必要）
- 勤怠データの月次・日次表示

### シフト管理
- ドラッグ&ドロップによる直感的なシフト作成
- 月間・週間カレンダー表示
- リアルタイム更新機能

### 管理機能
- スタッフ情報管理
- 勤怠データエクスポート（Excel/CSV）
- QRコード生成・管理
- 統計ダッシュボード

## 🏗️ 技術スタック

### フロントエンド
- **React 19** - UIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Shadcn/ui** - UIコンポーネント
- **Vite** - ビルドツール
- **React DnD** - ドラッグ&ドロップ

### バックエンド
- **Express.js** - APIサーバー
- **PostgreSQL** - データベース
- **Redis** - セッション管理
- **JWT** - 認証

### テスト・CI/CD
- **Vitest** - ユニットテスト
- **Playwright** - E2Eテスト
- **ESLint/Prettier** - コード品質
- **GitHub Actions** - CI/CDパイプライン

### 本番環境
- **Docker/Docker Compose** - コンテナ化
- **Nginx** - Webサーバー
- **Prometheus/Grafana** - 監視

## 🚀 クイックスタート

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# 別ターミナルでバックエンド起動
cd backend
npm install
npm run dev
```

アプリケーションは http://localhost:5173 で起動します。

### テストアカウント
- **管理者**: ID: `admin`, パスワード: `admin123`
- **スタッフ**: ID: `S001`, パスワード: `staff123`
- **作成者**: ID: `C001`, パスワード: `creator123`

## 🧪 テスト実行

### 全テスト実行
```bash
# 全テスト（推奨）
npm run test:all

# または個別実行
npm run lint          # コード品質チェック
npm run type-check    # TypeScript型チェック
npm run test:unit     # ユニットテスト
npm run test:e2e      # E2Eテスト
npm run build         # ビルドテスト
```

### テストカバレッジ
```bash
npm run test:coverage
```

### E2Eテスト（UI付き）
```bash
npm run test:e2e:ui
```

## 🐳 本番環境

### Docker環境起動
```bash
# 全サービス起動
npm run docker:up

# ログ確認
npm run docker:logs

# 停止
npm run docker:down
```

### サービスURL
- **フロントエンド**: http://localhost
- **バックエンドAPI**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 📁 プロジェクト構造

```
src/
├── components/          # Reactコンポーネント
│   ├── auth/           # 認証関連
│   ├── dashboard/      # ダッシュボード
│   ├── timecard/       # 勤怠記録
│   └── ui/             # shadcn/uiコンポーネント
├── hooks/              # カスタムフック
├── services/           # API通信
├── tests/              # テストファイル
│   ├── unit/          # ユニットテスト
│   └── e2e/           # E2Eテスト
└── lib/               # ユーティリティ

backend/
├── routes/            # APIルート
├── middleware/        # ミドルウェア
└── tests/            # バックエンドテスト

database/
└── init.sql          # DB初期化

.github/
└── workflows/        # CI/CDパイプライン
```

## 🔧 開発ガイドライン

### コード品質
- TypeScript必須
- ESLint/Prettierによる自動フォーマット
- テストカバレッジ80%以上
- プルリクエスト必須

### Git ワークフロー
1. 機能ブランチ作成: `git checkout -b feature/新機能名`
2. 開発・テスト実行
3. プルリクエスト作成
4. CI/CDパイプライン実行
5. コードレビュー・マージ

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発統合
- `feature/*`: 機能開発
- `hotfix/*`: 緊急修正

## 📚 ドキュメント

- [テスト・デプロイメント詳細](docs/TEST_DEPLOYMENT.md)
- [API仕様書](docs/API_SPEC.md)
- [PRD（製品要求仕様書）](src/prd.md)

## 🔒 セキュリティ

### 実装済み対策
- HTTPS強制通信
- JWT認証
- CORS設定
- CSPヘッダー
- レート制限
- 入力値検証

### セキュリティ監査
```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix
```

## 📊 監視・ログ

### メトリクス監視
- アプリケーション稼働状況
- API応答時間
- エラー率
- リソース使用量

### ログ管理
- アプリケーションログ
- アクセスログ
- エラーログ

## 🚨 トラブルシューティング

### よくある問題

#### ビルドエラー
```bash
# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### テスト失敗
```bash
# Playwright再インストール
npx playwright install --with-deps

# テスト個別実行
npm run test:unit -- --reporter=verbose
```

#### Docker起動エラー
```bash
# コンテナ状態確認
docker-compose ps

# ログ確認
docker-compose logs [service-name]
```

## 🤝 コントリビューション

1. フォーク作成
2. 機能ブランチ作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add amazing feature'`
4. ブランチをプッシュ: `git push origin feature/amazing-feature`
5. プルリクエスト作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🆘 サポート

問題や質問がある場合は、以下の方法でサポートを求めてください：

1. **Issue作成**: 新しいIssueを作成
2. **Discussion**: プロジェクトのDiscussionsを利用
3. **Wiki**: 追加ドキュメントを確認

---

**勤怠管理システム** - 安全で効率的な従業員管理を実現する本格的なWebアプリケーション