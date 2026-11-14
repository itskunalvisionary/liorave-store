import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';

export type RealtimeEventType =
  | 'connected'
  | 'catalog:updated'
  | 'cms:updated'
  | 'orders:updated'
  | 'coupons:updated'
  | 'leads:updated';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  action?: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  productId?: number;
  categoryId?: number;
  couponId?: number;
  timestamp: string;
}

interface AliveWebSocket extends WebSocket {
  isAlive?: boolean;
}

let wssInstance: WebSocketServer | null = null;

export function initWebSocketServer(httpServer: HttpServer): WebSocketServer {
  if (wssInstance) return wssInstance;

  const wss = new WebSocketServer({ noServer: true });
  wssInstance = wss;

  httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const rawUrl = request.url || '/';
    const pathname = rawUrl.split('?')[0];
    if (pathname !== '/ws') {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (rawWs: WebSocket) => {
    const ws = rawWs as AliveWebSocket;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const welcome: RealtimeEventPayload = {
      type: 'connected',
      timestamp: new Date().toISOString(),
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(welcome));
    }
  });

  const interval = setInterval(() => {
    wss.clients.forEach((rawClient) => {
      const client = rawClient as AliveWebSocket;
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

export function broadcastRealtime(
  event: Omit<RealtimeEventPayload, 'timestamp'>
): void {
  if (!wssInstance) return;
  const payload: RealtimeEventPayload = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  const message = JSON.stringify(payload);
  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
