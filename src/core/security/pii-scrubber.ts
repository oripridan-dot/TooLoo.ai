export class PIIScrubber {
  private static patterns = [
    { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { name: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
    { name: 'ipv4', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
    { name: 'api_key', regex: /(sk-[a-zA-Z0-9]{20,})/g }, // Simple OpenAI key detection
  ];

  static scrub(text: string): string {
    if (!text) return text;
    let scrubbed = text;
    for (const pattern of this.patterns) {
      scrubbed = scrubbed.replace(pattern.regex, `[REDACTED_${pattern.name.toUpperCase()}]`);
    }
    return scrubbed;
  }

  static scrubObject(obj: any): any {
    if (typeof obj === 'string') return this.scrub(obj);
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map((item) => this.scrubObject(item));
      }
      const newObj: any = {};
      for (const key in obj) {
        // Don't scrub keys, only values
        newObj[key] = this.scrubObject(obj[key]);
      }
      return newObj;
    }
    return obj;
  }
}
