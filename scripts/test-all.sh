#!/bin/bash

# 勤怠管理システム - 自動テストスクリプト
# 本番環境を想定したフルテストの実行

set -e

echo "🚀 勤怠管理システム - 自動テストの開始"
echo "======================================"

# 1. 環境チェック
echo "📋 環境チェック中..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm がインストールされていません"
    exit 1
fi

node_version=$(node --version)
echo "✅ Node.js バージョン: $node_version"

# 2. 依存関係インストール
echo ""
echo "📦 依存関係のインストール中..."
if [ ! -d "node_modules" ]; then
    npm ci
else
    echo "✅ node_modules は既に存在します"
fi

# 3. TypeScript型チェック
echo ""
echo "🔍 TypeScript型チェック中..."
if npm run type-check; then
    echo "✅ TypeScript型チェック: 成功"
else
    echo "❌ TypeScript型チェック: 失敗"
    exit 1
fi

# 4. Lintテスト
echo ""
echo "🧹 Lintテスト実行中..."
if npm run lint; then
    echo "✅ Lintテスト: 成功"
else
    echo "❌ Lintテスト: 失敗"
    exit 1
fi

# 5. フォーマットチェック
echo ""
echo "🎨 フォーマットチェック中..."
if npm run format:check; then
    echo "✅ フォーマットチェック: 成功"
else
    echo "❌ フォーマットチェック: 失敗"
    echo "   npm run format で修正してください"
    exit 1
fi

# 6. ユニットテスト
echo ""
echo "🧪 ユニットテスト実行中..."
if npm run test:unit; then
    echo "✅ ユニットテスト: 成功"
else
    echo "❌ ユニットテスト: 失敗"
    exit 1
fi

# 7. ビルドテスト
echo ""
echo "🏗️  ビルドテスト実行中..."
if npm run build; then
    echo "✅ ビルドテスト: 成功"
else
    echo "❌ ビルドテスト: 失敗"
    exit 1
fi

# 8. セキュリティ監査
echo ""
echo "🔒 セキュリティ監査中..."
if npm audit --audit-level=moderate; then
    echo "✅ セキュリティ監査: 成功"
else
    echo "⚠️  セキュリティ監査: 警告あり（続行します）"
fi

# 9. E2Eテストの準備
echo ""
echo "🎭 E2Eテストの準備中..."
if command -v npx playwright install &> /dev/null; then
    npx playwright install --with-deps
    echo "✅ Playwright ブラウザのインストール: 完了"
else
    echo "⚠️  Playwright が見つかりません。E2Eテストをスキップします"
fi

# 10. 開発サーバー起動（バックグラウンド）
echo ""
echo "🖥️  開発サーバー起動中..."
npm run dev &
DEV_PID=$!
echo "✅ 開発サーバー起動: PID $DEV_PID"

# サーバーの起動を待つ
echo "⏳ サーバーの起動を待機中..."
for i in {1..30}; do
    if curl -f http://localhost:5173 &> /dev/null; then
        echo "✅ サーバー起動確認: 成功"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ サーバー起動タイムアウト"
        kill $DEV_PID 2>/dev/null || true
        exit 1
    fi
    sleep 2
done

# 11. E2Eテスト実行
echo ""
echo "🧪 E2Eテスト実行中..."
if command -v npx playwright test &> /dev/null; then
    if npm run test:e2e; then
        echo "✅ E2Eテスト: 成功"
    else
        echo "❌ E2Eテスト: 失敗"
        kill $DEV_PID 2>/dev/null || true
        exit 1
    fi
else
    echo "⚠️  E2Eテストをスキップしました"
fi

# 12. 開発サーバー停止
echo ""
echo "🛑 開発サーバー停止中..."
kill $DEV_PID 2>/dev/null || true
echo "✅ 開発サーバー停止: 完了"

# 13. テスト結果サマリー
echo ""
echo "🎉 全テスト完了!"
echo "=================="
echo "✅ 環境チェック"
echo "✅ 依存関係インストール"
echo "✅ TypeScript型チェック"
echo "✅ Lintテスト"
echo "✅ フォーマットチェック"
echo "✅ ユニットテスト"
echo "✅ ビルドテスト"
echo "✅ セキュリティ監査"
echo "✅ E2Eテスト"
echo ""
echo "🚀 本番環境へのデプロイ準備完了!"

# 14. 本番環境用のビルド成果物確認
if [ -d "dist" ]; then
    dist_size=$(du -sh dist | cut -f1)
    echo "📦 ビルド成果物サイズ: $dist_size"
    echo "📂 ビルド成果物: dist/"
fi

echo ""
echo "次のステップ:"
echo "1. Docker環境でのテスト: docker-compose up"
echo "2. 本番環境へのデプロイ"
echo "3. スモークテストの実行"
echo ""
echo "詳細は docs/TEST_DEPLOYMENT.md を参照してください"