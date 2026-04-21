import express from 'express';
import { createServer } from 'http';
import { buildProxyRouter } from './proxyRegistry.js';
import { BlitzortungFanout } from './wsProxy.js';

const app = express();
const PORT = 3001;

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use('/api', buildProxyRouter());

// Wrap Express in an http.Server so we can attach the WebSocket fan-out
const httpServer = createServer(app);

// Blitzortung lightning fan-out at ws://host:3001/ws/lightning
new BlitzortungFanout(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Lightning fan-out at ws://localhost:${PORT}/ws/lightning`);
});
