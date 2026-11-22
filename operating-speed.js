/* Shared operating-frequency policy for all commercial curve engines. */
(function (root) {
  'use strict';
  const DEFAULT_HZ = 50, MAX_HZ = 60;
  const selector = '#speedInput,#gSpeed,#manualFrequency,[data-keysuite-frequency]';
  function clamp(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_HZ, n)) : DEFAULT_HZ;
  }
  function valid(value) { return Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= MAX_HZ; }
  function paint(input, hz) {
    if (input) input.classList.toggle('keysuite-speed-over50', Number(hz) > DEFAULT_HZ);
  }
  function configure(input, unit, baseRpm = 2900) {
    const rpm = unit && unit.value === 'rpm';
    input.max = String(rpm ? baseRpm * MAX_HZ / DEFAULT_HZ : MAX_HZ);
    input.step = 'any';
    const hz = Number(input.value) / (rpm ? baseRpm / DEFAULT_HZ : 1);
    paint(input, hz);
    return hz;
  }
  function convert(input, unit, hidden, label, output, baseRpm = 2900) {
    const rpmMode = unit.value === 'rpm';
    const candidate = configure(input, unit, baseRpm);
    if (candidate > MAX_HZ || !Number.isFinite(candidate)) return null;
    const hz = clamp(candidate);
    const rpm = hz * baseRpm / DEFAULT_HZ;
    // Preserve entered decimals. Invalid high values leave the last curve intact.
    if (Number(input.value) < 0) input.value = '0';
    hidden.value = String(hz);
    label.textContent = rpmMode ? 'Calculated Frequency' : 'Calculated Speed';
    output.textContent = rpmMode ? `${Number(hz.toFixed(6))} Hz` : `${rpm.toFixed(0)} RPM`;
    paint(input, hz);
    return hz;
  }
  function changeUnit(input, unit, hidden, label, output, baseRpm = 2900) {
    const hz = clamp(hidden.value);
    input.value = String(unit.value === 'rpm' ? hz * baseRpm / DEFAULT_HZ : hz);
    return convert(input, unit, hidden, label, output, baseRpm);
  }
  const api = Object.freeze({ DEFAULT_HZ, MAX_HZ, clamp, valid, paint, configure, convert, changeUnit });
  root.KeySuiteOperatingSpeed = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = 'input.keysuite-speed-over50{background-color:#fecaca!important}';
  document.head.appendChild(style);
  // Shared delegation also covers dynamically mounted commercial series.
  document.addEventListener('input', event => {
    const input = event.target;
    if (!input.matches || !input.matches(selector)) return;
    const unit = document.getElementById(input.id === 'gSpeed' ? 'gSpeedUnit' : 'speedUnit');
    const baseRpm = Number(input.dataset.baseRpm) || 2900;
    configure(input, unit, baseRpm);
    if (Number(input.value) > Number(input.max)) { event.stopImmediatePropagation(); return; }
    paint(input, configure(input, unit, baseRpm));
  }, true);
})(typeof window === 'undefined' ? globalThis : window);
