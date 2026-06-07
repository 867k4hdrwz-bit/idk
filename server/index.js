import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import robot from 'robotjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.BACKEND_PORT || 4173;
const HOST = process.env.BACKEND_HOST || 'localhost';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Store active sessions
const sessions = new Map();
const clients = new Map();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Session management
class Session {
  constructor() {
    this.id = uuidv4().slice(0, 8);
    this.pairCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    this.host = null;
    this.phone = null;
    this.createdAt = Date.now();
  }
}

// Routes
app.get('/api/new-session', (req, res) => {
  const session = new Session();
  sessions.set(session.id, session);
  console.log(`[SESSION] New session created: ${session.id} (pair code: ${session.pairCode})`);
  res.json({
    sessionId: session.id,
    pairCode: session.pairCode,
  });
});

app.post('/api/join-session', (req, res) => {
  const { sessionId, pairCode, role } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.pairCode !== pairCode) {
    return res.status(403).json({ error: 'Invalid pair code' });
  }

  if (role === 'host' && session.host) {
    return res.status(409).json({ error: 'Host already connected' });
  }

  if (role === 'phone' && session.phone) {
    return res.status(409).json({ error: 'Phone already connected' });
  }

  res.json({ success: true, sessionId });
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({
    id: session.id,
    hostConnected: !!session.host,
    phoneConnected: !!session.phone,
  });
});

// WebSocket handling
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session');
  const role = url.searchParams.get('role'); // 'host' or 'phone'

  if (!sessionId || !role) {
    ws.close(4000, 'Missing session or role');
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    ws.close(4004, 'Session not found');
    return;
  }

  console.log(`[WS] ${role} connected to session ${sessionId}`);

  // Store client info
  const clientInfo = { ws, sessionId, role, clientId };
  clients.set(clientId, clientInfo);

  // Assign to session
  if (role === 'host') {
    session.host = clientInfo;
  } else if (role === 'phone') {
    session.phone = clientInfo;
  }

  // Notify the other side
  const otherRole = role === 'host' ? session.phone : session.host;
  if (otherRole) {
    otherRole.ws.send(JSON.stringify({ type: 'peer-connected', role }));
  }

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientInfo, message, session);
    } catch (err) {
      console.error(`[WS] Error parsing message:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] ${role} disconnected from session ${sessionId}`);
    clients.delete(clientId);

    if (role === 'host') {
      session.host = null;
      if (session.phone) {
        session.phone.ws.send(JSON.stringify({ type: 'peer-disconnected', role: 'host' }));
      }
    } else if (role === 'phone') {
      session.phone = null;
      if (session.host) {
        session.host.ws.send(JSON.stringify({ type: 'peer-disconnected', role: 'phone' }));
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error:`, err);
  });
});

// Message handling
function handleMessage(client, message, session) {
  const { type, data } = message;

  // Host sends screen stream offers/answers
  if (client.role === 'host' && type === 'offer') {
    if (session.phone) {
      session.phone.ws.send(JSON.stringify({ type: 'offer', data }));
    }
  }

  // Phone sends ICE candidates and answers
  if (client.role === 'phone' && (type === 'answer' || type === 'ice-candidate')) {
    if (session.host) {
      session.host.ws.send(JSON.stringify({ type, data }));
    }
  }

  // Phone sends input commands to host
  if (client.role === 'phone' && type === 'input') {
    handleInput(data);
    if (session.host) {
      session.host.ws.send(JSON.stringify({ type: 'input-sent', data }));
    }
  }
}

// Input handling
function handleInput(input) {
  try {
    const { action, key, x, y, button, isDown } = input;

    if (action === 'key') {
      if (isDown) {
        robot.keyToggle(key, 'down');
      } else {
        robot.keyToggle(key, 'up');
      }
      console.log(`[INPUT] Key ${isDown ? 'down' : 'up'}: ${key}`);
    }

    if (action === 'mouse') {
      robot.moveMouse(x, y);
    }

    if (action === 'click') {
      if (button === 'left' || button === 'right') {
        if (isDown) {
          robot.mouseToggle('down', button);
        } else {
          robot.mouseToggle('up', button);
        }
      }
      console.log(`[INPUT] Mouse ${button} ${isDown ? 'down' : 'up'}`);
    }

    if (action === 'scroll') {
      robot.scroll(0, key); // key contains scroll direction/amount
      console.log(`[INPUT] Scroll: ${key}`);
    }
  } catch (err) {
    console.error(`[INPUT] Error handling input:`, err);
  }
}

// Cleanup old sessions
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > MAX_AGE) {
      sessions.delete(id);
      console.log(`[SESSION] Cleaned up old session: ${id}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Start server
server.listen(PORT, HOST, () => {
  console.log(`\n🎮 Minecraft Pocket Remote`);
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`📱 Open host page: http://localhost:${PORT}/host`);
  console.log(``);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
