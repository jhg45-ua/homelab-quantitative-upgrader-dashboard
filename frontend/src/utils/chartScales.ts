export interface SvgPoint {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createLinearScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax) || !Number.isFinite(rangeMin) || !Number.isFinite(rangeMax)) {
    return (_value: number) => (rangeMin + rangeMax) / 2;
  }

  const span = domainMax - domainMin;
  if (!Number.isFinite(span) || span === 0) {
    return (_value: number) => (rangeMin + rangeMax) / 2;
  }

  return (value: number) => {
    if (!Number.isFinite(value)) {
      return (rangeMin + rangeMax) / 2;
    }
    const normalized = (value - domainMin) / span;
    return rangeMin + normalized * (rangeMax - rangeMin);
  };
}

export function createLogScale(domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const safeMin = Math.max(Number.MIN_VALUE, domainMin);
  const safeMax = Math.max(safeMin * 10, domainMax);
  const logMin = Math.log10(safeMin);
  const logMax = Math.log10(safeMax);
  const span = logMax - logMin;

  if (!Number.isFinite(span) || span <= 0) {
    return (_value: number) => (rangeMin + rangeMax) / 2;
  }

  return (value: number) => {
    const safeValue = clamp(value, safeMin, safeMax);
    const normalized = (Math.log10(safeValue) - logMin) / span;
    return rangeMin + normalized * (rangeMax - rangeMin);
  };
}

export function getLogTickValues(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || max < min) {
    return [];
  }

  const startPower = Math.floor(Math.log10(min));
  const endPower = Math.ceil(Math.log10(max));
  const ticks: number[] = [];

  for (let power = startPower; power <= endPower; power += 1) {
    const value = Math.pow(10, power);
    if (value >= min && value <= max) {
      ticks.push(value);
    }
  }

  if (ticks.length === 0) {
    return [min, max];
  }

  if (ticks[0] !== min) {
    ticks.unshift(min);
  }
  if (ticks[ticks.length - 1] !== max) {
    ticks.push(max);
  }

  return Array.from(new Set(ticks)).sort((a, b) => a - b);
}

export function getTickValues(min: number, max: number, count: number): number[] {
  if (count <= 1 || max <= min) return [min, max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function polylinePath(points: SvgPoint[]): string {
  if (points.length === 0) return '';
  const validPoints = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (validPoints.length === 0) return '';
  return validPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export function areaPath(points: SvgPoint[], baselineY: number): string {
  if (points.length === 0 || !Number.isFinite(baselineY)) return '';
  const validPoints = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (validPoints.length === 0) return '';
  const line = polylinePath(validPoints);
  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

export function niceUpperBound(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / power) * power;
}
