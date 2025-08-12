# マルチステージビルド: ビルド環境
FROM node:18-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production && npm cache clean --force

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# マルチステージビルド: 本番環境
FROM nginx:alpine AS production

# ビルド済みファイルをnginxに配置
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx設定ファイルをコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ポート80を公開
EXPOSE 80

# nginxを起動
CMD ["nginx", "-g", "daemon off;"]