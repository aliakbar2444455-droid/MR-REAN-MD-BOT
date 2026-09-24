# MRREANMD Bot

This repository is prepared for deployment from GitHub to Railway. It contains the Telegram pairing bot and the WhatsApp command system.

## Railway deployment

1. Create a **private GitHub repository** and upload the project files. Do not upload `.env` files, tokens, session folders, or ZIP archives.
2. In Railway, choose **New Project → Deploy from GitHub Repo** and select the repository.
3. Railway will build the included `Dockerfile`. The image installs Node.js 22, `ffmpeg`, and `yt-dlp` for the download commands.
4. Add the required Railway variable:

   ```text
   BOT_TOKEN=your_telegram_bot_token
   ```

5. Redeploy the service. The start command is already defined as `npm start`.
6. Add a Railway Volume mounted at `/app/kingbadboitimewisher/pairing` if WhatsApp pairing sessions must survive redeploys. Without persistent storage, sessions can be lost when Railway replaces the container.

The service is a polling bot and does not need a public HTTP port.

## Download commands

The following commands accept public links and use local `yt-dlp` instead of the old hardcoded third-party API keys:

```text
.play <song name or YouTube URL>
.ytmp3 <YouTube URL>
.ytmp4 <YouTube URL>
.tiktok <TikTok URL>
.instagram <Instagram Reel/Post URL>
.facebook <Facebook video URL>
```

The downloader limits files to 50 MB, disables playlists, uses a two-minute timeout, cleans temporary files after sending, and supports YouTube, TikTok, Instagram, Facebook, `fb.watch`, and short TikTok links. Private, login-required, age-restricted, or region-blocked media may still fail because the source does not expose a public download.

Use only media that you have permission to download and redistribute, and follow the relevant platform terms.

## Existing bot notes

The Telegram force-join check is configured in `bot.js` under `REQUIRED_CHATS`. The bot must be an administrator in all required chats.

## Local checks

```bash
npm ci
npm test
node --check allfunc/media-downloader.js
```

Keep secrets in Railway Variables. `token.js` intentionally reads `BOT_TOKEN` from the environment and contains no token.
