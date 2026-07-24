FROM node:20-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    python3 \
    python3-pip \
  && pip3 install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
ENV ROLE=api

CMD ["node", "src/index.js"]
