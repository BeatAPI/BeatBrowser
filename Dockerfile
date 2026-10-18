# BeatBrowser stdio MCP server.
# Glama builds this from the repository root (no Chrome, extension, bridge, or secrets).
# initialize and tools/list answer immediately. A browser tool call returns an error
# when the local bridge is not reachable.
#
#   docker build -t beat-browser-mcp .
#   docker run --rm -i beat-browser-mcp
#
# Glama Dockerfile admin page: paste this file as-is. No build args and no env vars.
# If that form also asks for command arguments, use: node src/cli.js mcp

FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY . .

ENV NODE_ENV=production
ENV HOME=/home/node

USER node

CMD ["node", "src/cli.js", "mcp"]
