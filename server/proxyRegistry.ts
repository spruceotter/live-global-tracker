import { Router, Request, Response } from 'express';
import { CacheManager } from './cache/CacheManager.js';
import { sources } from './sources.config.js';

export function buildProxyRouter(): Router {
  const router = Router();
  const cache = new CacheManager();
  cache.startEvictionLoop();

  for (const source of sources) {
    router.get(`/${source.route}`, async (req: Request, res: Response) => {
      const cacheKey = `${source.route}:${JSON.stringify(req.params)}`;

      const cached = cache.get(cacheKey);
      if (cached) {
        res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
        return res.send(cached);
      }

      const upstreamUrl =
        typeof source.upstream === 'function'
          ? source.upstream(req.params as Record<string, string>)
          : source.upstream;

      try {
        const response = await fetch(upstreamUrl);
        if (!response.ok) {
          // On 429, serve stale cache if available
          if (response.status === 429) {
            const stale = cache.getStale(cacheKey);
            if (stale) {
              console.warn(`[proxy] ${source.route}: 429 rate limited, serving stale cache`);
              res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
              return res.send(stale);
            }
          }
          throw new Error(`Upstream ${response.status}: ${response.statusText}`);
        }

        const data =
          source.contentType === 'json'
            ? await response.json()
            : await response.text();

        // Validate response before caching (e.g., reject CelesTrak rate-limit messages)
        if (source.validate && !source.validate(data)) {
          console.warn(`[proxy] ${source.route}: response failed validation, not caching`);
          // Still serve the stale cache if available
          const stale = cache.getStale(cacheKey);
          if (stale) {
            res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
            return res.send(stale);
          }
          // No stale data -- return the invalid response anyway with a warning header
          res.set('X-Proxy-Warning', 'upstream-response-invalid');
          res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
          return res.send(data);
        }

        cache.set(cacheKey, data, source.cacheTtlMs);

        res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
        res.send(data);
      } catch (err) {
        const stale = cache.getStale(cacheKey);
        if (stale) {
          res.type(source.contentType === 'json' ? 'application/json' : 'text/plain');
          return res.send(stale);
        }
        res.status(502).json({ error: (err as Error).message });
      }
    });
  }

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
