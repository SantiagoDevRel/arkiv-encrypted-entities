// Origin is a serialized origin, never a general URL. Forwarded headers do not select trust.
function sameDeploymentOrigin(origin, host) {
  if (typeof origin !== 'string' || typeof host !== 'string' || !host || !(origin.startsWith('https://') || origin.startsWith('http://'))) return false;
  const parsed = new URL(origin);
  const hostname = host.split(':', 1)[0].toLowerCase();
  const scheme = hostname === 'localhost' || hostname === '127.0.0.1' ? 'http://' : 'https://';
  const deployment = new URL(scheme + host);
  if (/[/\\?#@\s]/.test(host) || deployment.username || deployment.password || deployment.pathname !== '/' || deployment.search || deployment.hash) return false;
  return !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash && parsed.origin === origin && parsed.origin === deployment.origin;
}

import { rabdi } from '@arkiv-network/sdk/chains';

const limits = new Map();
const allowed = new Set(['eth_chainId', 'eth_blockNumber', 'eth_gasPrice', 'eth_getBlockByNumber', 'eth_getBalance', 'eth_getTransactionCount', 'eth_getTransactionReceipt', 'eth_call', 'eth_estimateGas', 'arkiv_getEntity']);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  const respond = (status, value) => res.status(status).json(value);
  const origin = req.headers?.origin;
  if (origin !== undefined) {
    try {
      if (!sameDeploymentOrigin(origin, req.headers?.host)) return respond(403, { error: 'Origin not allowed.' });
    } catch { return respond(403, { error: 'Origin not allowed.' }); }
  }
  if (String(req.headers?.['sec-fetch-site'] ?? '').split(',').some(site => site.trim().toLowerCase() === 'cross-site')) return respond(403, { error: 'Origin not allowed.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  const contentType = req.headers?.['content-type'];
  if (typeof contentType !== 'string' || contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return respond(415, { error: 'Use application/json for read requests.' });
  if (!process.env.ARKIV_ACCESS_KEY) return res.status(503).json({ error: 'Server access key is missing. Configure ARKIV_ACCESS_KEY; obtain a key at https://hub.arkiv.network/access-keys.' });
  const address = String(req.headers['x-forwarded-for'] ?? 'unknown').split(',')[0];
  const minute = Math.floor(Date.now() / 60000);
  if (limits.size > 10000) limits.clear();
  const prior = limits.get(address), count = prior?.minute === minute ? prior.count + 1 : 1;
  limits.set(address, { minute, count });
  if (count > 120) return res.status(429).json({ error: 'Read limit reached. Try again later.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON.' }); }
  if (!body || Array.isArray(body) || !allowed.has(body.method) || !Array.isArray(body.params ?? []) || JSON.stringify(body).length > 280000) return res.status(400).json({ error: 'Unsupported read request.' });
  const p = body.params ?? [];
  const id = typeof body.id === 'number' || typeof body.id === 'string' && body.id.length <= 64 ? body.id : null;
  const hex = (v, length) => typeof v === 'string' && new RegExp(`^0x[0-9a-fA-F]{${length}}$`).test(v);
  const noParams = ['eth_chainId','eth_blockNumber','eth_gasPrice'].includes(body.method) && p.length === 0;
  const entityOrReceipt = ['arkiv_getEntity','eth_getTransactionReceipt'].includes(body.method) && p.length === 1 && hex(p[0],64);
  const head = body.method === 'eth_getBlockByNumber' && p.length === 2 && p[0] === 'latest' && p[1] === false;
  const account = ['eth_getBalance','eth_getTransactionCount'].includes(body.method) && p.length === 2 && hex(p[0],40) && p[1] === 'latest';
  const estimateOrCall = ['eth_estimateGas','eth_call'].includes(body.method) && p.length === 2 && p[1] === 'latest' && p[0]?.to?.toLowerCase() === '0x4400000000000000000000000000000000000044' && typeof p[0]?.data === 'string' && /^0x[0-9a-fA-F]*$/.test(p[0].data);
  if (!(noParams || entityOrReceipt || head || account || estimateOrCall)) return res.status(400).json({ error: 'Unsupported read parameters. State reads require latest.' });
  try {
    const chain = rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY });
    const upstream = await fetch(chain.rpcUrls.default.http[0], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method: body.method, params: p }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) throw Error('Upstream unavailable');
    const result = await upstream.json();
    // Never forward provider messages/data: those may contain provider URLs and access keys.
    if (result.error) return res.status(200).json({ jsonrpc: '2.0', id, error: { code: -32000, message: 'Rabdi read failed. Check the entity and retry the read later.' } });
    return res.status(200).json({ jsonrpc: '2.0', id, result: result.result });
  } catch { return res.status(502).json({ error: 'Rabdi read unavailable. Retry the read later.' }); }
}
