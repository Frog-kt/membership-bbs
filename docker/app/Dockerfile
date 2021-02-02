# ベースイメージを指定
FROM node:14.15

# 環境変数設定
ENV NODE_ENV="development"

# 作業ディレクトリ作成&設定
WORKDIR /src

CMD bash -c "npm install -g pnpm && pnpm install -g @prisma/cli && pnpm install -g nodemon && pnpm g:prisma && pnpm run dev"