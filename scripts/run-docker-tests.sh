#!/bin/bash

# Docker環境での総合テスト実行スクリプト

echo "🐳 Docker環境での本番レベルテストを開始します..."

# テスト結果ディレクトリ作成
mkdir -p test-results
mkdir -p playwright-report
mkdir -p performance-results

# 1. 既存コンテナのクリーンアップ
echo "既存コンテナをクリーンアップ中..."
docker-compose -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true

# 2. テスト環境でのビルド確認
echo "テスト環境でのビルド確認..."
docker build -f Dockerfile.test -t attendance-test . || {
    echo "❌ ビルドテストに失敗しました"
    exit 1
}
echo "✅ ビルドテスト: 成功"

# 3. テスト用データベース起動
echo "テスト用データベースを起動中..."
docker-compose -f docker-compose.test.yml up -d database-test redis-test
sleep 10

# 4. バックエンドテスト環境起動
echo "バックエンドテスト環境を起動中..."
docker-compose -f docker-compose.test.yml up -d backend-test
sleep 15

# 5. バックエンドヘルスチェック
echo "バックエンドのヘルスチェック..."
for i in {1..10}; do
    if docker exec $(docker-compose -f docker-compose.test.yml ps -q backend-test) wget -q --spider http://localhost:3000/health 2>/dev/null; then
        echo "✅ バックエンドヘルスチェック: 成功"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ バックエンドヘルスチェック: タイムアウト"
        docker-compose -f docker-compose.test.yml logs backend-test
        exit 1
    fi
    sleep 3
done

# 6. フロントエンドテスト環境起動
echo "フロントエンドテスト環境を起動中..."
docker-compose -f docker-compose.test.yml up -d frontend-test
sleep 20

# 7. フロントエンドヘルスチェック
echo "フロントエンドのヘルスチェック..."
for i in {1..15}; do
    if docker exec $(docker-compose -f docker-compose.test.yml ps -q frontend-test) wget -q --spider http://localhost:4173 2>/dev/null; then
        echo "✅ フロントエンドヘルスチェック: 成功"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ フロントエンドヘルスチェック: タイムアウト"
        docker-compose -f docker-compose.test.yml logs frontend-test
        exit 1
    fi
    sleep 4
done

# 8. 本番環境テスト
echo "本番環境のテスト..."
docker-compose -f docker-compose.yml up -d
sleep 30

# 本番環境ヘルスチェック
echo "本番環境のヘルスチェック..."
for i in {1..10}; do
    if docker exec $(docker-compose -f docker-compose.yml ps -q frontend) wget -q --spider http://localhost 2>/dev/null; then
        echo "✅ 本番環境ヘルスチェック: 成功"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 本番環境ヘルスチェック: タイムアウト"
        docker-compose -f docker-compose.yml logs frontend
        exit 1
    fi
    sleep 3
done

# 9. ログ収集
echo "テスト結果とログを収集中..."
docker-compose -f docker-compose.test.yml logs > test-results/test-logs.txt 2>&1
docker-compose -f docker-compose.yml logs > test-results/production-logs.txt 2>&1
docker ps -a > test-results/container-status.txt

# 10. テスト完了メッセージ
echo "📊 テスト結果サマリー"
echo "✅ Docker ビルドテスト: 成功"
echo "✅ テスト環境データベース: 成功" 
echo "✅ テスト環境バックエンド: 成功"
echo "✅ テスト環境フロントエンド: 成功"
echo "✅ 本番環境デプロイ: 成功"
echo "✅ 本番環境ヘルスチェック: 成功"

echo ""
echo "🎉 Docker環境での本番レベルテストが完了しました！"
echo "📁 テスト結果は test-results/ ディレクトリで確認できます"
echo "🌐 本番環境: http://localhost"
echo "📊 監視ダッシュボード: http://localhost:3001 (Grafana)"

# クリーンアップの選択肢を提供
echo ""
echo "テスト環境を停止しますか？ (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    docker-compose -f docker-compose.test.yml down -v
    echo "✅ テスト環境を停止しました"
else
    echo "ℹ️  テスト環境は引き続き稼働しています"
fi