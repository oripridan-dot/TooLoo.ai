import axios from "axios";
import * as cheerio from "cheerio";
import { ICollector, HarvestRequest, HarvestResult } from "../types.js";

export class StaticCollector implements ICollector {
  private userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  async collect(request: HarvestRequest): Promise<HarvestResult> {
    try {
      console.log(`[StaticCollector] Fetching: ${request.url}`);

      const response = await axios.get(request.url, {
        headers: {
          "User-Agent": this.getRandomUserAgent(),
          ...request.options?.headers,
        },
        proxy: request.options?.proxy
          ? this.parseProxy(request.options.proxy)
          : false,
      });

      const $ = cheerio.load(response.data);

      // Basic metadata extraction
      const title = $("title").text().trim();
      const description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content");
      const author = $('meta[name="author"]').attr("content");

      // Clean up content
      $("script").remove();
      $("style").remove();
      $("nav").remove();
      $("footer").remove();
      $("header").remove();

      const content = $("body").text().replace(/\s+/g, " ").trim();

      // Extract media links
      const images: string[] = [];
      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http")) images.push(src);
      });

      return {
        url: request.url,
        content,
        metadata: {
          title,
          description,
          author,
          contentType: response.headers["content-type"] || "text/html",
          timestamp: Date.now(),
        },
        media: {
          images,
          videos: [],
        },
        raw: response.data,
      };
    } catch (error: any) {
      console.error(
        `[StaticCollector] Error fetching ${request.url}:`,
        error.message,
      );
      throw error;
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private parseProxy(proxyString: string): any {
    // Basic parsing for http://user:pass@host:port
    try {
      const url = new URL(proxyString);
      return {
        protocol: url.protocol.replace(":", ""),
        host: url.hostname,
        port: parseInt(url.port),
        auth: {
          username: url.username,
          password: url.password,
        },
      };
    } catch (e) {
      return false;
    }
  }
}
