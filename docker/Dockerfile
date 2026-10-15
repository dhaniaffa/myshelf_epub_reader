# Stage 1: Build production assets
FROM node:22-alpine AS builder

WORKDIR /app

# Salin manifest dependensi
COPY package.json package-lock.json ./

# Pasang dependensi secara clean
RUN npm ci

# Salin kode sumber
COPY . .

# Build aplikasi ke dist/
RUN npm run build

# Stage 2: Serve dengan Nginx Alpine
FROM nginx:alpine AS runner

# Hapus konfigurasi default nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Salin konfigurasi nginx kustom
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Salin hasil build dari stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Jalankan nginx di foreground
CMD ["nginx", "-g", "daemon off;"]
