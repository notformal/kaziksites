# 🌐 API Integration Guide — Game Platform

## 📋 Overview

This document describes the API integration between client-side PIXI.js games and the server-side game engine.

---

## 🔐 Authentication

### All API requests require Bearer token:
```http
Authorization: Bearer <user_token>
```

### Token refresh:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🎮 Game Endpoints

### 1. Initialize Game Session

```http
POST /api/games/{gameId}/session
Content-Type: application/json

{
  "user_id": "usr_123456",
  "currency": "USD",
  "locale": "en-US"
}

Response 200:
{
  "session_id": "sess_abc123",
  "user_id": "usr_123456",
  "balance": 10000.00,
  "currency": "USD",
  "provably_fair": {
    "server_seed_hash": "abc123def456...",
    "client_seed": "client_seed_123",
    "nonce": 0
  },
  "expires_at": "2026-07-29T18:00:00Z"
}
```

### 2. Submit Spin Result

```http
POST /api/games/{gameId}/session/{sessionId}/spin
Content-Type: application/json

{
  "session_id": "sess_abc123",
  "bet_amount": 10.00,
  "game_state": {
    "reels": [[1,2,3],[4,5,6],[7,8,9]],
    "paylines": [[0,0,0,0,0],[1,1,1,1,1]],
    "win_lines": [{"payline": 0, "symbols": [1,1,1,1,1], "amount": 50.00}],
    "total_win": 50.00,
    "free_spins": {
      "remaining": 8,
      "multiplier": 2
    }
  },
  "provably_fair": {
    "server_seed_hash": "abc123def456...",
    "client_seed": "client_seed_123",
    "nonce": 1
  }
}

Response 200:
{
  "result": {
    "balance_before": 10000.00,
    "bet_amount": 10.00,
    "win_amount": 50.00,
    "balance_after": 10040.00,
    "rtp_current": 0.96,
    "rtp_lifetime": 0.958,
    "events": [
      {
        "type": "win",
        "amount": 50.00,
        "multiplier": 5,
        "timestamp": "2026-07-29T17:00:00Z"
      },
      {
        "type": "free_spin",
        "remaining": 8,
        "timestamp": "2026-07-29T17:00:00Z"
      }
    ]
  },
  "provably_fair": {
    "server_seed": null,
    "client_seed": "client_seed_123",
    "nonce": 1,
    "hash": "verified_hash_abc123"
  }
}
```

### 3. Cashout

```http
POST /api/games/{gameId}/session/{sessionId}/cashout
Content-Type: application/json

{
  "amount": 500.00
}

Response 200:
{
  "transaction_id": "txn_xyz789",
  "amount": 500.00,
  "balance": 9500.00,
  "timestamp": "2026-07-29T17:00:00Z"
}
```

### 4. Get Game History

```http
GET /api/games/{gameId}/session/{sessionId}/history?page=1&limit=50

Response 200:
{
  "data": [
    {
      "id": "spin_001",
      "bet": 10.00,
      "win": 50.00,
      "multiplier": 5,
      "timestamp": "2026-07-29T17:00:00Z",
      "game_state": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### 5. Verify Provably Fair

```http
GET /api/games/{gameId}/verify?nonce=1&server_seed=abc123&client_seed=client_seed_123

Response 200:
{
  "valid": true,
  "expected_hash": "expected_hash_abc123",
  "actual_hash": "abc123def456...",
  "nonce": 1,
  "result": "deterministic_result_xyz"
}
```

---

## 📊 Webhook Events

### Server → Client callbacks:

```javascript
// Register for webhooks
POST /api/webhooks/register
{
  "url": "https://client.example.com/webhooks",
  "events": ["balance_update", "session_expire", "bonus_offered"],
  "secret": "webhook_secret_123"
}

// Received event
POST https://client.example.com/webhooks
{
  "event": "balance_update",
  "data": {
    "user_id": "usr_123456",
    "balance": 9500.00,
    "timestamp": "2026-07-29T17:00:00Z"
  },
  "signature": "webhook_signature_abc123"
}
```

---

## 🔒 Security Requirements

### 1. Input Validation
```javascript
// All inputs must be validated server-side
function validateBet(bet, minBet, maxBet) {
  if (typeof bet !== 'number' || bet <= 0) {
    throw new ValidationError('Invalid bet amount');
  }
  if (bet < minBet || bet > maxBet) {
    throw new ValidationError(`Bet must be between ${minBet} and ${maxBet}`);
  }
  return true;
}
```

### 2. Rate Limiting
```javascript
// Per-user rate limiting
const spinRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // max 10 spins per second
  message: 'Too many spins'
});

// Per-IP rate limiting
const ipRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // max 100 requests per minute
});
```

### 3. Anti-Cheat Measures
```javascript
// Server-side result validation
function validateSpinResult(gameState, provablyFair) {
  // Verify provably fair hash
  const expectedHash = crypto
    .createHmac('sha256', provablyFair.serverSeed)
    .update(provablyFair.clientSeed + provablyFair.nonce)
    .digest('hex');
  
  if (expectedHash !== provablyFair.serverSeedHash) {
    throw new SecurityError('Provably fair verification failed');
  }
  
  // Verify game state integrity
  const stateHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(gameState))
    .digest('hex');
  
  if (stateHash !== gameState.integrity_hash) {
    throw new SecurityError('Game state tampering detected');
  }
  
  return true;
}
```

### 4. Session Management
```javascript
// Session expiration
const SESSION_TTL = 3600000; // 1 hour

function checkSessionExpiration(session) {
  if (Date.now() > session.expires_at) {
    throw new SessionError('Session expired');
  }
  return true;
}
```

---

## 📈 Analytics Integration

### Client-side event tracking:
```javascript
// Track game events
class GameAnalytics {
  track(event, data) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
          timezone: Intl.DateTimeFormat().timezoneOffset
        }
      })
    }).catch(() => {
      // Silently fail - analytics shouldn't break the game
    });
  }
  
  trackSpin(bet, win, multiplier) {
    this.track('game_spin', {
      gameId: this.gameId,
      bet,
      win,
      multiplier,
      duration: this.spinDuration
    });
  }
  
  trackWin(amount, type) {
    this.track('game_win', {
      gameId: this.gameId,
      amount,
      type
    });
  }
}
```

---

## 🔄 Error Handling

### Standard error response:
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for this bet",
    "details": {
      "required": 100.00,
      "available": 50.00
    },
    "timestamp": "2026-07-29T17:00:00Z"
  }
}
```

### Error codes:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| INSUFFICIENT_BALANCE | 402 | User doesn't have enough balance |
| INVALID_BET | 400 | Bet amount is invalid |
| SESSION_EXPIRED | 401 | Game session has expired |
| GAME_IN_PROGRESS | 409 | Another spin is in progress |
| GAME_NOT_FOUND | 404 | Game ID doesn't exist |
| PROVABLY_FAIR_ERROR | 400 | Provably fair verification failed |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## 📱 Mobile API Optimization

### Compressed response format:
```json
{
  "compressed": true,
  "format": "json-minified",
  "data": {...}
}
```

### Batched requests:
```http
POST /api/batch
Content-Type: application/json

{
  "requests": [
    {"method": "GET", "path": "/api/games/history?page=1"},
    {"method": "POST", "path": "/api/games/slots/spin", "body": {...}}
  ]
}
```

---

## 🧪 Testing

### Mock server setup:
```javascript
// Use mock server for local development
const { createMockServer } = require('@game-platform/mock');

const mock = createMockServer({
  port: 3001,
  responses: {
    '/api/games/slots/session': {
      delay: 100,
      response: {
        session_id: 'mock_session_123',
        balance: 10000,
        provably_fair: {
          server_seed_hash: 'mock_hash',
          client_seed: 'mock_client_seed',
          nonce: 0
        }
      }
    }
  }
});

mock.start();
```

### Test suite:
```javascript
describe('Game API', () => {
  it('should initialize session', async () => {
    const res = await fetch('/api/games/slots/session', {
      method: 'POST',
      headers: { Authorization: 'Bearer test_token' },
      body: JSON.stringify({ currency: 'USD' })
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('session_id');
    expect(data).toHaveProperty('balance');
  });
  
  it('should validate bet amount', async () => {
    const res = await fetch('/api/games/slots/session/spin', {
      method: 'POST',
      headers: { Authorization: 'Bearer test_token' },
      body: JSON.stringify({ bet_amount: -10 })
    });
    
    expect(res.status).toBe(400);
  });
});
```

---

## 📚 SDKs

### JavaScript SDK:
```javascript
import { GameClient } from '@game-platform/sdk';

const client = new GameClient({
  baseUrl: 'https://api.game-platform.com',
  token: 'user_token',
  gameId: 'wild-west-gold'
});

// Initialize session
const session = await client.initSession();

// Spin
const result = await client.spin({
  bet: 10,
  autoCashout: null
});

// Cashout
await client.cashout({ amount: 500 });
```

### Python SDK:
```python
from game_platform import GameClient

client = GameClient(
    base_url='https://api.game-platform.com',
    token='user_token',
    game_id='wild-west-gold'
)

# Initialize session
session = client.init_session(currency='USD')

# Spin
result = client.spin(bet=10)

# Cashout
client.cashout(amount=500)
```

---

*Last updated: 2026-07-29*