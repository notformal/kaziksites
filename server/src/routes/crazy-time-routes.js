import { Router } from 'express';
import { CrazyTimeEngine } from '../crazy-time/engine.js';

const router = Router();
let engine = null;

export function setCrazyTimeEngine(e) { engine = e; }

// Create session
router.post('/session/create', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  const result = engine.createSession(req.body.userId || req.ip);
  res.json(result);
});

// Place bet on slip
router.post('/bets/slip', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  const { sessionId, betTypeId, amountCents } = req.body;
  if (!sessionId || !betTypeId) return res.status(400).json({ error: 'Missing required fields' });
  const result = engine.placeBet(sessionId, betTypeId, (amountCents || 5000) / 100);
  res.json(result);
});

// Clear slip bets
router.delete('/bets/slip', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const result = engine.clearBets(sessionId);
  res.json(result);
});

// Spin the wheel
router.post('/spin', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  const result = engine.spin(sessionId);
  res.json(result);
});

// Play bonus round
router.post('/bonus/:bonusName', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  const { bonusName } = req.params;
  const result = engine.playBonus(bonusName);
  res.json(result);
});

// Get history
router.get('/history', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  res.json({ history: engine.getHistory() });
});

// Get bet types
router.get('/bets/types', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  res.json({ bets: engine.getBetTypes() });
});

// Get wheel segments
router.get('/wheel/segments', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  res.json({ segments: engine.getWheelSegments() });
});

// Get bonus config
router.get('/bonus/config', (req, res) => {
  if (!engine) return res.status(503).json({ error: 'Engine not initialized' });
  res.json({ bonuses: engine.getBonusConfig() });
});

export default router;
