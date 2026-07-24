import http from 'node:http';
import net from 'node:net';
import { config } from './config.js';
import { startControlServer } from './control-api.js';
import { closePool } from './db.js';
import { runFetchWorker } from './workers/fetch-worker.js';
import { runMediaWorker } from './workers/media-worker.js';
import { runCleanupWorker } from './workers/cleanup-worker.js';
import { runDiscoveryWorker } from './workers/discovery-worker.js';
import { runPackageWorker } from './workers/package-worker.js';
import { runAiWorker } from './workers/ai-worker.js';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return PRIVATE_RANGES.some((re) => re.test(ip));
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  return false;
}

/**
 * Minimal CONNECT/HTTP forward proxy for fetch-worker egress only.
 * Blocks private-range targets and non-HTTPS CONNECT.
 */
function startEgressProxy() {
  const server = http.createServer((req, res) => {
    res.writeHead(405);
    res.end('Use CONNECT for HTTPS egress');
  });

  server.on('connect', (req, clientSocket, head) => {
    const target = req.url || '';
    const [host, portStr] = target.split(':');
    const port = Number(portStr || 443);

    if (port !== 443) {
      clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    net.lookup(host, { verbatim: true }, (err, address) => {
      if (err || isPrivateIp(address)) {
        clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        clientSocket.destroy();
        return;
      }

      const serverSocket = net.connect(port, address, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      serverSocket.on('error', () => {
        clientSocket.destroy();
      });
      clientSocket.on('error', () => {
        serverSocket.destroy();
      });
    });
  });

  server.listen(3128, '0.0.0.0', () => {
    console.log('[egress-proxy] listening on :3128');
  });
  return server;
}

async function main() {
  const role = (config.role || 'api').toLowerCase();
  const ac = new AbortController();
  const shutdown = async () => {
    ac.abort();
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  switch (role) {
    case 'api':
      await startControlServer();
      break;
    case 'fetch-worker':
      await runFetchWorker(ac.signal);
      break;
    case 'media-worker':
      await runMediaWorker(ac.signal);
      break;
    case 'cleanup-worker':
      await runCleanupWorker(ac.signal);
      break;
    case 'discovery-worker':
      await runDiscoveryWorker(ac.signal);
      break;
    case 'package-worker':
      await runPackageWorker(ac.signal);
      break;
    case 'ai-worker':
      await runAiWorker(ac.signal);
      break;
    case 'egress-proxy':
      startEgressProxy();
      break;
    default:
      console.error(`Unknown ROLE=${role}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
