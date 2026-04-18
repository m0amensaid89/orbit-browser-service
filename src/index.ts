import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const API_SECRET = process.env.BROWSER_SERVICE_SECRET || 'orbit-secret';

app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const auth = req.headers['x-api-secret'];
  if (auth !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ACTIVE', service: 'Orbit Browser Service' });
});

app.post('/execute', async (req, res) => {
  const { task, url, steps } = req.body;
  if (!task) { res.status(400).json({ error: 'task is required' }); return; }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const screenshots: string[] = [];
  const log: string[] = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--mute-audio',
        '--no-first-run',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    if (url) {
      log.push(`Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const shot = await page.screenshot({ type: 'jpeg', quality: 60 });
      screenshots.push(shot.toString('base64'));
      log.push(`Loaded: ${await page.title()}`);
    }

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        try {
          if (step.action === 'click') {
            await page.click(step.selector, { timeout: 5000 });
            log.push(`Clicked: ${step.selector}`);
          } else if (step.action === 'type') {
            await page.fill(step.selector, step.value, { timeout: 5000 });
            log.push(`Typed into ${step.selector}`);
          } else if (step.action === 'goto') {
            await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            log.push(`Navigated to ${step.url}`);
          } else if (step.action === 'wait') {
            await page.waitForTimeout(step.ms || 1000);
          }
          const shot = await page.screenshot({ type: 'jpeg', quality: 60 });
          screenshots.push(shot.toString('base64'));
        } catch (stepErr) {
          log.push(`Step failed: ${(stepErr as Error).message}`);
        }
      }
    }

    const finalTitle = await page.title();
    const finalUrl = page.url();
    const finalShot = await page.screenshot({ type: 'jpeg', quality: 60 });
    screenshots.push(finalShot.toString('base64'));

    await browser.close();
    res.json({ success: true, task, finalUrl, finalTitle, screenshots, log });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    res.json({ success: false, task, error: (err as Error).message, screenshots, log });
  }
});

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Orbit Browser Service running on port ${PORT}`);
});
