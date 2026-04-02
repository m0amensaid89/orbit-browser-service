import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

const API_SECRET = process.env.BROWSER_SERVICE_SECRET || 'orbit-secret';

// Auth middleware
app.use((req, res, next) => {
  const auth = req.headers['x-api-secret'];
  if (auth !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ACTIVE', service: 'Orbit Browser Service' });
});

// Main execution endpoint
app.post('/execute', async (req, res) => {
  const { task, url, steps } = req.body;

  if (!task) {
    res.status(400).json({ error: 'task is required' });
    return;
  }

  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const screenshots: string[] = [];
  const log: string[] = [];

  try {
    // Navigate to URL if provided
    if (url) {
      log.push(`Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      const shot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
      screenshots.push(shot.toString('base64'));
      log.push(`Loaded: ${await page.title()}`);
    }

    // Execute steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        try {
          if (step.action === 'click') {
            await page.click(step.selector, { timeout: 5000 });
            log.push(`Clicked: ${step.selector}`);
          } else if (step.action === 'type') {
            await page.fill(step.selector, step.value, { timeout: 5000 });
            log.push(`Typed "${step.value}" into ${step.selector}`);
          } else if (step.action === 'goto') {
            await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            log.push(`Navigated to ${step.url}`);
          } else if (step.action === 'wait') {
            await page.waitForTimeout(step.ms || 1000);
            log.push(`Waited ${step.ms || 1000}ms`);
          } else if (step.action === 'screenshot') {
            log.push(`Screenshot taken`);
          }
          // Take screenshot after each step
          await page.waitForTimeout(800);
          const shot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
          screenshots.push(shot.toString('base64'));
        } catch (stepErr) {
          log.push(`Step failed: ${step.action} — ${(stepErr as Error).message}`);
        }
      }
    }

    // Final page state
    const finalTitle = await page.title();
    const finalUrl = page.url();
    const finalShot = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
    screenshots.push(finalShot.toString('base64'));

    res.json({
      success: true,
      task,
      finalUrl,
      finalTitle,
      screenshots,
      log,
      screenshotCount: screenshots.length,
    });

  } catch (err) {
    const errorShot = await page.screenshot({ type: 'jpeg', quality: 80 }).catch(() => null);
    if (errorShot) screenshots.push(errorShot.toString('base64'));

    res.json({
      success: false,
      task,
      error: (err as Error).message,
      screenshots,
      log,
    });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Orbit Browser Service running on port ${PORT}`);
});
