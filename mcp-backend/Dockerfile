FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS release
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src
USER bun
ENV HOST=0.0.0.0
ARG PORT=3000
ENV PORT=${PORT}
ENV LOG_LEVEL=info
ENV SHUTDOWN_TIMEOUT_MS=10000
ENV MCP_ALLOWED_HOSTS=localhost,127.0.0.1,::1
EXPOSE ${PORT}
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e 'fetch("http://127.0.0.1:3000/health/live").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))'
ENTRYPOINT ["bun", "run", "src/main.ts"]
