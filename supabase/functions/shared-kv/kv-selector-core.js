/* KeySuite V5.00.17 — KV selector core. Mirrors the CR hydraulic method and
   preserves workbook shut-off power at Q=0. */
(function (g) {
  'use strict';
  const VERSION = '5.00.17';

  function solve(A, b) {
    A = A.map(row => row.slice());
    b = b.slice();
    for (let i = 0; i < A.length; i++) {
      let pivot = i;
      for (let row = i + 1; row < A.length; row++) if (Math.abs(A[row][i]) > Math.abs(A[pivot][i])) pivot = row;
      [A[i], A[pivot]] = [A[pivot], A[i]];
      [b[i], b[pivot]] = [b[pivot], b[i]];
      const divisor = Math.abs(A[i][i]) < 1e-15 ? 1e-15 : A[i][i];
      for (let col = i; col < A.length; col++) A[i][col] /= divisor;
      b[i] /= divisor;
      for (let row = 0; row < A.length; row++) if (row !== i) {
        const factor = A[row][i];
        for (let col = i; col < A.length; col++) A[row][col] -= factor * A[i][col];
        b[row] -= factor * b[i];
      }
    }
    return b;
  }

  function polyfit(xs, ys, order) {
    const count = order + 1;
    const A = Array.from({ length: count }, () => Array(count).fill(0));
    const b = Array(count).fill(0);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) A[row][col] = xs.reduce((sum, x) => sum + x ** (row + col), 0);
      b[row] = xs.reduce((sum, x, index) => sum + ys[index] * x ** row, 0);
    }
    return solve(A, b);
  }

  function cleanPoints(xs, ys, scaleX = 1, scaleY = 1) {
    const points = [];
    const seen = new Set();
    for (let i = 0; i < (xs || []).length; i++) {
      const x = Number(xs[i]);
      const y = Number(ys?.[i]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const key = x.toFixed(8);
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ x: x * scaleX, y: y * scaleY });
    }
    return points.sort((a, b) => a.x - b.x);
  }

  function makeFit(points, order) {
    if (!points || points.length < 2) return null;
    const degree = Math.min(order, points.length - 1);
    return {
      pts: points,
      c: polyfit(points.map(point => point.x), points.map(point => point.y), degree),
      order: degree,
      min: points[0].x,
      max: points[points.length - 1].x,
    };
  }

  function fitValue(fit, x) {
    if (!fit || !Number.isFinite(Number(x))) return NaN;
    const exact = fit.pts?.find(point => Math.abs(point.x - Number(x)) < 1e-9);
    if (exact) return exact.y;
    return (fit.c || []).reduce((sum, coefficient, index) => sum + coefficient * Number(x) ** index, 0);
  }

  function mixFor(model) {
    const total = Number(model.totalImpellers || model.stages || 1);
    const full = Number(model.fullImpellers ?? total);
    const medium = Number(model.smallImpellers || 0);
    const small = Number(model.smallestImpellers || 0);
    return { total, full, medium, small };
  }

  function mixedPoints(curve, model, key, keyMedium, keySmall, hzRatio, yRatio, average = false) {
    const mix = mixFor(model);
    const points = [];
    const seen = new Set();
    for (let i = 0; i < (curve.flow || []).length; i++) {
      const q = Number(curve.flow[i]);
      const full = Number(curve[key]?.[i]);
      const medium = mix.medium ? Number(curve[keyMedium]?.[i]) : 0;
      const small = mix.small ? Number(curve[keySmall]?.[i]) : 0;
      if (!Number.isFinite(q) || !Number.isFinite(full) || (mix.medium && !Number.isFinite(medium)) || (mix.small && !Number.isFinite(small))) continue;
      const dedupe = q.toFixed(8);
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      let y = mix.full * full + mix.medium * medium + mix.small * small;
      if (average) y /= Math.max(1, mix.total);
      points.push({ x: q * hzRatio, y: y * yRatio });
    }
    return points.sort((a, b) => a.x - b.x);
  }

  function evaluateModel(db, model, q, h, hz = 50) {
    const curve = db?.curves?.[model.series];
    if (!curve) return null;
    const ratio = Number(hz) / Number(db.base_hz || 50);
    const headFit = makeFit(mixedPoints(curve, model, 'head_per_stage', 'head_per_stage_2', 'head_per_stage_3', ratio, ratio * ratio), 2);
    const effFit = makeFit(mixedPoints(curve, model, 'efficiency', 'efficiency_2', 'efficiency_3', ratio, 1, true), 5);
    const npshFit = makeFit(cleanPoints(curve.flow, curve.npshr, ratio, ratio * ratio), 3);
    if (!headFit || !effFit || !npshFit || q < headFit.min || q > headFit.max) return null;
    const predHead = fitValue(headFit, q);
    if (!Number.isFinite(predHead) || predHead <= 0) return null;
    const efficiency = Math.max(1, Math.min(100, fitValue(effFit, q)));
    const npsh = Math.max(0, fitValue(npshFit, q));
    const shutoff = curve.shutoff_power_per_impeller_kw || {};
    const mix = mixFor(model);
    const zeroPower = (mix.full * Number(shutoff.full || 0) + mix.medium * Number(shutoff.medium || 0) + mix.small * Number(shutoff.small || 0)) * ratio ** 3;
    const powerPoints = headFit.pts.map(point => {
      if (Math.abs(point.x) < 1e-9) return { x: 0, y: zeroPower };
      const eff = Math.max(1, Math.min(100, fitValue(effFit, point.x)));
      return { x: point.x, y: 9.81 * point.x * point.y / 3600 / (eff / 100) };
    });
    const powerFit = makeFit(powerPoints, 3);
    const shaft = Math.max(0, fitValue(powerFit, q));
    return {
      ...model,
      predHead,
      margin: predHead - Number(h),
      eff: efficiency,
      npsh,
      shaft,
      shutoff_power_kw: zeroPower,
      headFit,
      effFit,
      npshFit,
      powerFit,
      rpm: Number(curve.speed_rpm || 2900) * ratio,
    };
  }

  function bepInfo(candidate, dutyQ) {
    if (!candidate?.effFit || !(dutyQ > 0)) return { flow: NaN, eff: NaN, delta: Infinity, group: 4 };
    let flow = NaN;
    let efficiency = -Infinity;
    for (let i = 0; i <= 240; i++) {
      const q = candidate.effFit.min + (candidate.effFit.max - candidate.effFit.min) * i / 240;
      const value = fitValue(candidate.effFit, q);
      if (Number.isFinite(value) && value > efficiency) { efficiency = value; flow = q; }
    }
    const delta = flow / dutyQ - 1;
    const group = delta >= -.05 && delta <= .03 ? 1 : delta >= -.10 && delta <= .08 ? 2 : delta >= -.18 && delta <= .13 ? 3 : 4;
    return { flow, eff: efficiency, delta, group };
  }

  function compare(a, b, dutyQ) {
    if (Math.abs(a.motor_kw - b.motor_kw) > 1e-9) return a.motor_kw - b.motor_kw;
    if (Math.abs(b.eff - a.eff) > 1e-9) return b.eff - a.eff;
    const A = bepInfo(a, dutyQ);
    const B = bepInfo(b, dutyQ);
    if (A.group !== B.group) return A.group - B.group;
    if (Math.abs(Math.abs(A.delta) - Math.abs(B.delta)) > 1e-9) return Math.abs(A.delta) - Math.abs(B.delta);
    if (Math.abs(a.margin - b.margin) > 1e-9) return a.margin - b.margin;
    return String(a.model).localeCompare(String(b.model), undefined, { numeric: true, sensitivity: 'base' });
  }

  function select(db, q, h, hz = 50) {
    q = Number(q); h = Number(h); hz = Number(hz);
    if (!(q > 0 && h > 0 && hz > 0)) return { selected: null, candidates: [], version: VERSION };
    let candidates = (db.models || []).map(model => evaluateModel(db, model, q, h, hz)).filter(item => item && item.margin >= -.01 && item.motor_kw + 1e-9 >= item.shaft);
    if (!candidates.length) candidates = (db.models || []).map(model => evaluateModel(db, model, q, h, hz)).filter(item => item && item.margin >= -.01);
    candidates.sort((a, b) => compare(a, b, q));
    return { selected: candidates[0] || null, candidates, version: VERSION };
  }

  function sampleFit(fit, count = 90) {
    if (!fit) return [];
    const result = [];
    for (let i = 0; i <= count; i++) {
      const x = fit.min + (fit.max - fit.min) * i / count;
      const y = fitValue(fit, x);
      if (Number.isFinite(y)) result.push({ x, y });
    }
    return result;
  }

  g.KeySuiteKVCore = Object.freeze({ VERSION, evaluateModel, select, fitValue, sampleFit, bepInfo, compare });
})(globalThis);
