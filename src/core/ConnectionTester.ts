import type { LayerManifest } from './types';

export interface TestResult {
  success: boolean;
  message: string;
  sampleCount: number;
  responseTimeMs: number;
  timestamp: number;
}

export async function testConnection(
  manifest: LayerManifest,
  apiKey?: string
): Promise<TestResult> {
  const start = performance.now();
  const timestamp = Date.now();

  try {
    let url =
      typeof manifest.source.url === 'function'
        ? manifest.source.url(apiKey ? { firmsApiKey: apiKey, owmApiKey: apiKey } : {})
        : manifest.source.url;

    if (!url) {
      return { success: false, message: 'No URL configured', sampleCount: 0, responseTimeMs: 0, timestamp };
    }

    // Append API key as query param if needed
    if (apiKey && manifest.source.auth.kind === 'api-key-query') {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}${manifest.source.auth.paramName}=${apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {};
    if (manifest.source.auth.kind === 'api-key-header' && apiKey) {
      headers[(manifest.source.auth as { headerName: string }).headerName] = apiKey;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);
    const responseTimeMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const statusText =
        response.status === 401 ? 'Invalid API key'
        : response.status === 403 ? 'Access forbidden'
        : response.status === 429 ? 'Rate limited — try again later'
        : `HTTP ${response.status}`;
      return { success: false, message: statusText, sampleCount: 0, responseTimeMs, timestamp };
    }

    // Try to count features
    let sampleCount = 0;
    const contentType = response.headers.get('content-type') ?? '';

    if (manifest.source.format === 'csv' || manifest.source.format === 'tle') {
      const text = await response.text();
      sampleCount = text.split('\n').filter((l) => l.trim().length > 0).length;
    } else if (contentType.includes('json') || manifest.source.format === 'json' || manifest.source.format === 'geojson') {
      const json = await response.json();
      if (Array.isArray(json)) sampleCount = json.length;
      else if (json.features) sampleCount = json.features.length;
      else if (json.results) sampleCount = json.results.length;
      else if (json.data) sampleCount = Array.isArray(json.data) ? json.data.length : 1;
      else if (json.states) sampleCount = json.states.length;
      else sampleCount = 1;
    }

    return {
      success: true,
      message: `Connected — ${sampleCount.toLocaleString()} records found`,
      sampleCount,
      responseTimeMs,
      timestamp,
    };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start);
    const message =
      (err as Error).name === 'AbortError'
        ? 'Connection timed out (10s)'
        : (err as Error).message ?? 'Connection failed';
    return { success: false, message, sampleCount: 0, responseTimeMs, timestamp };
  }
}
