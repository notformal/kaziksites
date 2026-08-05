// Exhaustive-ish unit tests for the poker hand evaluator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate5, compare, best5of7, anteOdds, qualifies, shuffledDeck, videoPokerPayout, CATEGORIES } from '../src/poker.js';

const c = (rank, suit = 0) => ({ rank, suit });
const cat = (cards) => CATEGORIES[evaluate5(cards).category];

test('evaluate5 classifies every category', () => {
  assert.equal(cat([c(1), c(13), c(12), c(11), c(10)]), 'straight-flush'); // royal (A high, same suit)
  assert.equal(cat([c(9), c(8), c(7), c(6), c(5)]), 'straight-flush');
  assert.equal(cat([c(1, 0), c(2, 0), c(3, 0), c(4, 0), c(5, 0)]), 'straight-flush'); // wheel SF
  assert.equal(cat([c(7), c(7, 1), c(7, 2), c(7, 3), c(13)]), 'four-kind');
  assert.equal(cat([c(13), c(13, 1), c(13, 2), c(3), c(3, 1)]), 'full-house');
  assert.equal(cat([c(13), c(10), c(7), c(4), c(2)]), 'flush'); // all suit 0
  assert.equal(cat([c(9), c(8, 1), c(7), c(6, 1), c(5)]), 'straight'); // mixed suits
  assert.equal(cat([c(1, 0), c(2, 1), c(3, 0), c(4, 1), c(5, 0)]), 'straight'); // wheel straight, mixed
  assert.equal(cat([c(8), c(8, 1), c(8, 2), c(13), c(2, 1)]), 'three-kind');
  assert.equal(cat([c(13), c(13, 1), c(5), c(5, 1), c(9, 2)]), 'two-pair');
  assert.equal(cat([c(10), c(10, 1), c(13), c(7, 1), c(2)]), 'pair');
  assert.equal(cat([c(13), c(10, 1), c(7), c(4, 1), c(2)]), 'high-card');
});

test('compare orders categories and tiebreakers', () => {
  const twoPair = evaluate5([c(13), c(13, 1), c(5), c(5, 1), c(9, 2)]);
  const pair = evaluate5([c(10), c(10, 1), c(13), c(7, 1), c(2)]);
  assert.ok(compare(twoPair, pair) > 0);
  const quads = evaluate5([c(7), c(7, 1), c(7, 2), c(7, 3), c(13)]);
  const boat = evaluate5([c(13), c(13, 1), c(13, 2), c(3), c(3, 1)]);
  assert.ok(compare(quads, boat) > 0);
  const hiStraight = evaluate5([c(10), c(9, 1), c(8), c(7, 1), c(6)]);
  const loStraight = evaluate5([c(9), c(8, 1), c(7), c(6, 1), c(5)]);
  assert.ok(compare(hiStraight, loStraight) > 0);
  // Kicker breaks a pair tie.
  const pairAk = evaluate5([c(1), c(1, 1), c(13), c(7), c(2)]);
  const pairAq = evaluate5([c(1), c(1, 1), c(12), c(7), c(2)]);
  assert.ok(compare(pairAk, pairAq) > 0);
  assert.equal(compare(pairAk, pairAk), 0);
});

test('shuffledDeck is a deterministic 52-card single deck', () => {
  const d = shuffledDeck('server-seed-abc', 'client', 0);
  assert.deepEqual(d, shuffledDeck('server-seed-abc', 'client', 0));
  assert.equal(d.length, 52);
  assert.equal(new Set(d.map((c) => `${c.rank}-${c.suit}`)).size, 52); // no duplicates
  assert.notDeepEqual(shuffledDeck('server-seed-xyz', 'client', 0), d);
  assert.notDeepEqual(shuffledDeck('server-seed-abc', 'client', 0, 'vpoker'), d); // tag namespaces the stream
});

test('videoPokerPayout follows the Jacks-or-Better 9/6 table', () => {
  const c = (rank, suit = 0) => ({ rank, suit });
  assert.equal(videoPokerPayout(evaluate5([c(1), c(13), c(12), c(11), c(10)])), 250); // royal
  assert.equal(videoPokerPayout(evaluate5([c(9), c(8), c(7), c(6), c(5)])), 50); // straight flush
  assert.equal(videoPokerPayout(evaluate5([c(7), c(7, 1), c(7, 2), c(7, 3), c(13)])), 25); // quads
  assert.equal(videoPokerPayout(evaluate5([c(13), c(13, 1), c(13, 2), c(3), c(3, 1)])), 9); // full house
  assert.equal(videoPokerPayout(evaluate5([c(13), c(10), c(7), c(4), c(2)])), 6); // flush
  assert.equal(videoPokerPayout(evaluate5([c(10), c(9, 1), c(8), c(7, 1), c(6)])), 4); // straight
  assert.equal(videoPokerPayout(evaluate5([c(8), c(8, 1), c(8, 2), c(13), c(2, 1)])), 3); // trips
  assert.equal(videoPokerPayout(evaluate5([c(13), c(13, 1), c(5), c(5, 1), c(9, 2)])), 2); // two pair
  assert.equal(videoPokerPayout(evaluate5([c(11), c(11, 1), c(13), c(7), c(2)])), 1); // pair of jacks
  assert.equal(videoPokerPayout(evaluate5([c(10), c(10, 1), c(13), c(7), c(2)])), 0); // pair of tens: nothing
  assert.equal(videoPokerPayout(evaluate5([c(13), c(10, 1), c(7), c(4), c(2)])), 0); // high card
});

test('best5of7 finds the strongest hand', () => {
  // 2 hole + 5 community; best is a flush in suit 0.
  const seven = [c(13, 0), c(2, 1), c(10, 0), c(7, 0), c(4, 0), c(2, 0), c(9, 2)];
  assert.equal(CATEGORIES[best5of7(seven).category], 'flush');
});

test('anteOdds and dealer qualification', () => {
  assert.equal(anteOdds(evaluate5([c(1), c(13), c(12), c(11), c(10)])), 100); // royal
  assert.equal(anteOdds(evaluate5([c(9), c(8), c(7), c(6), c(5)])), 20); // straight flush
  assert.equal(anteOdds(evaluate5([c(7), c(7, 1), c(7, 2), c(7, 3), c(13)])), 10); // quads
  assert.equal(anteOdds(evaluate5([c(13), c(13, 1), c(13, 2), c(3), c(3, 1)])), 3); // full house
  assert.equal(anteOdds(evaluate5([c(13), c(10), c(7), c(4), c(2)])), 2); // flush
  assert.equal(anteOdds(evaluate5([c(10), c(9, 1), c(8), c(7, 1), c(6)])), 1); // straight -> 1:1

  assert.equal(qualifies(evaluate5([c(13), c(13, 1), c(5), c(5, 1), c(9, 2)])), true); // two pair
  assert.equal(qualifies(evaluate5([c(4), c(4, 1), c(13), c(7), c(2)])), true); // pair of 4s
  assert.equal(qualifies(evaluate5([c(3), c(3, 1), c(13), c(7), c(2)])), false); // pair of 3s
  assert.equal(qualifies(evaluate5([c(13), c(10), c(7, 1), c(4), c(2)])), false); // high card
});
