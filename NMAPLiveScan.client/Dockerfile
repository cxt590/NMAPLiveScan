# ── Stage 1: build React app ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# ── Stage 2: serve with nginx ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built assets from stage 1
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]