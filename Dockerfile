FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV YTDLP_BIN=/usr/local/bin/yt-dlp

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN node --check index.js \
  && node --check bot.js \
  && node --check drenox.js \
  && node --check allfunc/media-downloader.js \
  && yt-dlp --version

CMD ["npm", "start"]
