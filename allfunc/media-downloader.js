const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120000;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('media download timed out'));
    }, DOWNLOAD_TIMEOUT_MS);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error((stderr || stdout || `yt-dlp exited with code ${code}`).trim().slice(-1200)));
    });
  });
}

function validateUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('invalid URL'); }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const allowed = [
    'youtube.com', 'youtu.be', 'm.youtube.com',
    'tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
    'instagram.com', 'instagr.am',
    'facebook.com', 'fb.watch', 'm.facebook.com'
  ];
  if (!allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    throw new Error('unsupported media URL');
  }
  return parsed.toString();
}

async function downloadMedia(url, mode = 'video') {
  const safeUrl = validateUrl(url);
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mrrean-media-'));
  const output = path.join(dir, 'media.%(ext)s');
  const args = [
    '--no-playlist', '--no-warnings', '--restrict-filenames',
    '--max-filesize', '50M', '--socket-timeout', '20',
    '--retries', '2', '--fragment-retries', '2', '-o', output
  ];
  if (mode === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '5');
  } else {
    args.push('-f', 'bv*[height<=720]+ba/b[height<=720]/b', '--merge-output-format', 'mp4');
  }
  args.push(safeUrl, '--print', 'after_move:_%(title)s');

  try {
    const result = await run(process.env.YTDLP_BIN || 'yt-dlp', args);
    const files = (await fs.promises.readdir(dir)).filter((name) => !name.startsWith('.'));
    if (!files.length) throw new Error('no media file was produced');
    const filePath = path.join(dir, files[0]);
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile() || stat.size === 0) throw new Error('downloaded media is empty');
    if (stat.size > MAX_FILE_SIZE) throw new Error('downloaded media is larger than WhatsApp limit');
    const title = result.stdout.split('\n').find((line) => line.startsWith('_'))?.slice(1).trim() || 'Downloaded media';
    return { filePath, title, mode, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
  } catch (error) {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    if (error.code === 'ENOENT') throw new Error('yt-dlp is not installed on this server');
    throw error;
  }
}

module.exports = { downloadMedia };

if (require.main === module) {
  const [url] = process.argv.slice(2);
  if (!url) {
    console.error('Usage: node allfunc/media-downloader.js <public-url>');
    process.exit(1);
  }
  downloadMedia(url).then(({ filePath, title, cleanup }) => {
    console.log(JSON.stringify({ filePath, title }));
    return cleanup();
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
