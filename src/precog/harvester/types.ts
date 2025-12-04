export interface HarvestRequest {
  url: string;
  type: 'static' | 'dynamic' | 'media';
  options?: {
    waitForSelector?: string;
    extractRules?: Record<string, string>; // CSS selectors for specific fields
    proxy?: string;
    headers?: Record<string, string>;
  };
  priority?: 'high' | 'normal' | 'low';
}

export interface HarvestResult {
  url: string;
  content: string; // Raw text or HTML
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    publishedAt?: string;
    contentType: string;
    timestamp: number;
  };
  media?: {
    images: string[];
    videos: string[];
  };
  raw?: any; // Original response if needed
}

export interface ICollector {
  collect(request: HarvestRequest): Promise<HarvestResult>;
}

export interface IRefinery {
  refine(content: string, type: string): Promise<any>;
}
