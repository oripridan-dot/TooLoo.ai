import { chromium, Browser, Page } from 'playwright';
import { ICollector, HarvestRequest, HarvestResult } from '../types.js';

export class DynamicCollector implements ICollector {
  private browser: Browser | null = null;

  async collect(request: HarvestRequest): Promise<HarvestResult> {
    try {
      console.log(`[DynamicCollector] Launching browser for: ${request.url}`);

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
        });
      }

      const context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      // Navigate
      await page.goto(request.url, { waitUntil: 'networkidle' });

      if (request.options?.waitForSelector) {
        await page.waitForSelector(request.options.waitForSelector, {
          timeout: 10000,
        });
      }

      // Extract data
      const title = await page.title();

      // Get meta description
      const description =
        (await page
          .$eval('meta[name="description"]', (el) => el.getAttribute('content'))
          .catch(() => '')) || '';

      // Clean content (remove scripts/styles)
      await page.evaluate(() => {
        const elements = document.querySelectorAll('script, style, nav, footer, header, iframe');
        elements.forEach((el) => el.remove());
      });

      const content = await page.evaluate(() => document.body.innerText);

      // Extract images
      const images = await page.$$eval('img', (imgs) =>
        imgs.map((img) => img.src).filter((src) => src.startsWith('http'))
      );

      await context.close();

      return {
        url: request.url,
        content: content.replace(/\s+/g, ' ').trim(),
        metadata: {
          title,
          description,
          contentType: 'text/html',
          timestamp: Date.now(),
        },
        media: {
          images,
          videos: [],
        },
        raw: await page.content(), // Full HTML if needed
      };
    } catch (error: any) {
      console.error(`[DynamicCollector] Error processing ${request.url}:`, error.message);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
