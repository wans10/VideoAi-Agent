# Keyvo SMS hook (Supabase Auth "Send SMS" hook -> Alibaba Cloud SMS).
# Build:  docker build -t keyvo-sms-hook:1.0.0 .
# All configuration comes from environment variables at run time; nothing secret is baked into the image.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8787
WORKDIR /app

# Mainland mirror; the lockfile pins every transitive version.
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY hook.js ./

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "hook.js"]
