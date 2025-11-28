FROM node:20-alpine AS base
WORKDIR /app

# Base image optimizations - including ClamAV for virus scanning
RUN apk update && \
    apk add --no-cache curl bash clamav clamav-daemon && \
    npm install -g npm@latest && \
    # Initialize ClamAV database
    freshclam || true

###################################################
# final stage
###################################################

FROM base AS final
ENV NODE_ENV=production
WORKDIR /app

# Create directories for uploads and quarantine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeapp && \
    mkdir -p /app/uploads && \
    mkdir -p /app/quarantine && \
    mkdir -p /app/prisma && \
    mkdir -p /app/node_modules && \
    chown -R nodeapp:nodejs /app

# Switch to non-root user
USER nodeapp

# Install production dependencies only
COPY --chown=nodeapp:nodejs backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# Copy backend files
COPY --chown=nodeapp:nodejs backend ./src
# Copy MongoDB configuration files if any
COPY --chown=nodeapp:nodejs backend/models ./models

# Install mongoose
RUN npm install mongoose --save

EXPOSE 3000
CMD ["node", "src/server.js"]




###################################################
# Frontend Stages
###################################################

FROM base AS client-base
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM client-base AS client-build
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

###################################################
# Final Stage
###################################################

FROM nginx:1.25-alpine as nginx

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Create necessary directories with proper permissions
RUN mkdir -p /etc/nginx/ssl /etc/nginx/conf.d /app/uploads && \
    chmod -R 755 /etc/nginx/ssl /etc/nginx/conf.d /app/uploads

# Copy static assets from client build
COPY --from=client-build /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]