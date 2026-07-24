import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionAi, isAiActive, isAiTerminal } from './ai-state-machine.js';
import { Status } from './state-machine.js';

describe('ai-state-machine plan7 transitions', () => {
  it('allows queued → processing → ready', () => {
    assert.equal(canTransitionAi(Status.QUEUED, Status.PROCESSING), true);
    assert.equal(canTransitionAi(Status.PROCESSING, Status.READY), true);
  });

  it('allows cancel from queued or processing', () => {
    assert.equal(canTransitionAi(Status.QUEUED, Status.CANCELLED), true);
    assert.equal(canTransitionAi(Status.PROCESSING, Status.CANCELLED), true);
  });

  it('blocks ready → processing', () => {
    assert.equal(canTransitionAi(Status.READY, Status.PROCESSING), false);
  });

  it('classifies active vs terminal', () => {
    assert.equal(isAiActive(Status.QUEUED), true);
    assert.equal(isAiActive(Status.PROCESSING), true);
    assert.equal(isAiTerminal(Status.READY), true);
    assert.equal(isAiTerminal(Status.FAILED), true);
    assert.equal(isAiTerminal(Status.CANCELLED), true);
  });
});
