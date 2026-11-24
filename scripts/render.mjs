// Renders the animation to an MP4 (needs ffmpeg on PATH; python only for audio).
//   npm run render            -> out/controller-reveal.mp4
//   npm run render -- --fps 24 --no-audio
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const FPS = Number(args[args.indexOf('--fps') + 1]) || 24;
const DUR = 10, TOTAL = DUR * FPS;
const withAudio = !args.includes('--no-audio') && fs.existsSync('public/audio.wav');
const FR = 'out/frames';
fs.rmSync(FR, { recursive: true, force: true });
fs.mkdirSync(FR, { recursive: true });

const server = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.addInitScript(() => { window.__render = true; });
await page.goto('http://localhost:5199/');
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });

for (let i = 0; i < TOTAL; i++) {
  await page.evaluate(t => window.draw(t), i / FPS);
  await page.locator('canvas').screenshot({ path: `${FR}/f${String(i).padStart(4, '0')}.png` });
  if (i % 24 === 0) console.log(`frame ${i}/${TOTAL}`);
}
await browser.close(); await server.close();

const ff = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${FR}/f%04d.png`];
if (withAudio) ff.push('-i', 'public/audio.wav');
ff.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p');
if (withAudio) ff.push('-c:a', 'aac', '-b:a', '160k', '-shortest');
ff.push('out/controller-reveal.mp4');
const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
if (r.status !== 0) { console.error('ffmpeg failed – is it installed and on PATH?'); process.exit(1); }
console.log('Done → out/controller-reveal.mp4');
