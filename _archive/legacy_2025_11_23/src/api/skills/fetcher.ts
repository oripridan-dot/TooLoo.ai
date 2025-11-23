// TooLoo.ai URL Fetcher Skill
// Handles web content retrieval and cleaning

export async function fetchUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL required');
  }

  // Validate URL format
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Only HTTP/HTTPS URLs supported');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TooLoo.ai/2.0 Research Bot'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('Unsupported content type');
    }

    let content = await response.text();
    
    // Basic HTML cleaning
    if (contentType.includes('text/html')) {
      content = cleanHtml(content);
    }

    // Truncate if too long
    const maxLength = 120000;
    const truncated = content.length > maxLength;
    if (truncated) {
      content = content.slice(0, maxLength);
    }

    return {
      url,
      content,
      snippet: content.slice(0, 5000),
      bytes: content.length,
      truncated,
      contentType,
      timestamp: Date.now(),
      title: extractTitle(content)
    };

  } catch (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

function cleanHtml(html) {
  // Remove scripts, styles, and other non-content tags
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert common block elements to newlines
  text = text
    .replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ') // Remove remaining tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n') // Remove excessive newlines
    .trim();

  return text;
}

function extractTitle(content) {
  // Try to extract title from HTML or first meaningful line
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim().slice(0, 100);
  }

  // Fallback to first substantial line
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 10);
  return lines[0]?.slice(0, 100) || 'Untitled';
}