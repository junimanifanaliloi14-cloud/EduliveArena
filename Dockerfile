# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Batasi memori Node.js saat build agar tidak crash di server kecil
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm run build

# Stage 3: Production runner (Sangat Ringan)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
# Batasi memori Node.js saat aplikasi berjalan
ENV NODE_OPTIONS="--max-old-space-size=256"

# Hanya salin file yang diperlukan dari folder standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 7860
# Jalankan server bawaan standalone
CMD ["node", "server.js"]