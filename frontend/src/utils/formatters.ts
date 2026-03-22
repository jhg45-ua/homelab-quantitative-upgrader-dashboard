export const formatMetric = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num)) return '-';
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

export const formatUptime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  return `${hours}h`;
};
