import express from 'express';
import { buildProxyRouter } from './proxyRegistry.js';

const app = express();
const PORT = 3001;

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use('/api', buildProxyRouter());

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
