const { EventEmitter } = require('events');

// Next dev emits max-listener warnings during E2E runs due to repeated stream wiring.
// Raising the cap in the test-only runtime keeps signal-to-noise high without affecting app logic.
EventEmitter.defaultMaxListeners = 40;
process.setMaxListeners(40);

// Node prints warnings when NO_COLOR and FORCE_COLOR are both present.
if (Object.prototype.hasOwnProperty.call(process.env, 'NO_COLOR')) {
  delete process.env.NO_COLOR;
}
