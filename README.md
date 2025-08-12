# 勤怠管理システム (Time Tracking System)

企業向けの包括的な勤怠管理アプリケーションです。モバイルファーストのレスポンシブデザインで、効率的なスタッフ管理と勤怠記録を実現します。

## 🚀 主要機能

### スタッフ機能
- ✅ シフト確認（月間・週間表示）
- ✅ 勤怠打刻（QRコード・手動入力）
- ✅ 個人勤怠情報閲覧
- ✅ シフト希望申請

### 作成者機能
- ✅ シフト作成・編集（ドラッグ＆ドロップ）
- ✅ スタッフ管理
- ✅ 勤怠承認

### 管理者機能
- ✅ ダッシュボード統計
- ✅ データエクスポート（Excel/CSV）
- ✅ 全権限アクセス

## 🛡️ 自動バックアップシステム

本番環境に対応した包括的なバックアップソリューションを提供：

### バックアップ機能
- **自動スケジュール**: 日次・週次・月次バックアップ
- **データ検証**: バックアップ整合性の自動チェック
- **ヘルス監視**: システム状態の継続監視
- **アラート通知**: 障害時の即座な通知
- **簡単復旧**: ワンクリックでのデータ復元

### 監視ダッシュボード
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **リアルタイム監視**: バックアップ状況の可視化

### クイックスタート
```bash
# バックアップシステムのデプロイ
sudo bash scripts/deploy-backup-system.sh

# システム健全性チェック
backup-health-check

# 手動バックアップ実行
backup-system
```

詳細な設定ガイド: [BACKUP_QUICK_START.md](BACKUP_QUICK_START.md)  
完全なドキュメント: [docs/BACKUP_SYSTEM.md](docs/BACKUP_SYSTEM.md)

## 🏗️ 技術スタック

### フロントエンド
- **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (アニメーション)
- **Vite** (ビルドツール)

### バックエンド
- **Node.js** + **Express**
- **PostgreSQL** (データベース)
- **Docker** (コンテナ化)

### インフラ・監視
- **Docker Compose** (オーケストレーション)
- **Nginx** (リバースプロキシ)
- **Prometheus** + **Grafana** (監視)
- **Fluentd** (ログ集約)

## 🔧 開発・デプロイ

### 開発環境の起動
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# バックエンドサーバー起動
npm run server
```

### 本番環境デプロイ
```bash
# Docker環境での起動
docker-compose up -d

# バックアップシステムのセットアップ
sudo bash scripts/deploy-backup-system.sh

# システムテスト実行
bash scripts/test-all.sh
```

### テスト
```bash
# 全テスト実行
npm test

# E2Eテスト
npm run test:e2e

# バックアップシステムテスト
bash scripts/test-backup-system.sh
```

## 📊 監視・メトリクス

### ダッシュボード
- **アプリケーション監視**: Grafana Dashboard
- **バックアップ状況**: 専用監視パネル
- **システム健全性**: リアルタイム状態表示

### アラート
- **バックアップ失敗**: 即座にメール・Slack通知
- **ディスク容量不足**: 事前警告
- **システム障害**: 自動検知・通知

## 🛡️ セキュリティ

### データ保護
- **暗号化**: 転送時・保存時の両方
- **アクセス制御**: ロールベース権限管理
- **監査ログ**: 全操作の記録

### バックアップセキュリティ
- **検証**: 自動整合性チェック
- **暗号化**: バックアップファイルの暗号化
- **アクセス制限**: 最小権限原則

## 📚 ドキュメント

- [バックアップシステム](docs/BACKUP_SYSTEM.md) - 包括的なバックアップドキュメント
- [クイックスタート](BACKUP_QUICK_START.md) - 迅速な導入ガイド
- [API仕様](docs/API.md) - バックエンドAPI詳細
- [セキュリティガイド](SECURITY.md) - セキュリティベストプラクティス

## 🤝 サポート

### トラブルシューティング
```bash
# システム健全性チェック
backup-health-check

# ログ確認
tail -f /var/log/backup-system.log

# 設定テスト
bash scripts/test-backup-system.sh
```

### 緊急時の復旧
```bash
# データベース復旧
backup-restore cli database /path/to/backup.sql.gz

# アプリケーション復旧
backup-restore cli files /path/to/backup.tar.gz
```

---

**本番環境対応**: ✅ 全機能テスト済み・本番デプロイ可能  
**バックアップシステム**: ✅ 自動化・監視・アラート完備  
**セキュリティ**: ✅ 企業レベルのセキュリティ対応

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。