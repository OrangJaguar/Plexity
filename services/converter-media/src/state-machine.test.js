import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, Status } from './state-machine.js';

describe('state-machine plan6 statuses', () => {
  it('allows discovery flow', () => {
    assert.equal(canTransition(Status.DISCOVERING, Status.DISCOVERED, 'discovery'), true);
    assert.equal(canTransition(Status.DISCOVERING, Status.FAILED, 'discovery'), true);
  });

  it('allows package flow', () => {
    assert.equal(canTransition(Status.QUEUED, Status.PACKAGING, 'package'), true);
    assert.equal(canTransition(Status.PACKAGING, Status.READY, 'package'), true);
  });

  it('allows job pause/resume', () => {
    assert.equal(canTransition(Status.QUEUED, Status.PAUSED, 'job'), true);
    assert.equal(canTransition(Status.PAUSED, Status.QUEUED, 'job'), true);
  });
});
