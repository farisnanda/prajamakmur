FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl tzdata su-exec
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 TZ=Asia/Jakarta
COPY --from=build /app /app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Pastikan akhir baris LF (file dari Windows) dan bisa dieksekusi.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
# Entrypoint menyiapkan folder sebagai root lalu menjalankan aplikasi sebagai "node".
ENTRYPOINT ["docker-entrypoint.sh"]
