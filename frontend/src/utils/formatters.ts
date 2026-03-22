/**
 * Parses a VictoriaMetrics PromQL instant-query response.
 * Returns the numeric value, or null if the result is empty or unparseable.
 * Always treats 0 as a valid value (no falsy short-circuit).
 */
export const parsePromQLResponse = (metricName: string, responseData: any): number | null => {
  const result = responseData?.data?.result;

  console.groupCollapsed(`[HQUD TELEMETRY] 📡 ${metricName}`);
  console.log('Raw JSON:', responseData);

  if (!result || result.length === 0) {
    console.warn(`⚠️ No data returned for ${metricName} (Empty result array)`);
    console.groupEnd();
    return null;
  }

  const rawValue = result[0]?.value?.[1]; // Always a string in PromQL: "0" | "1.234"
  const parsedValue = Number(rawValue);

  if (isNaN(parsedValue)) {
    console.error(`❌ Parse error for ${metricName}. Raw value:`, rawValue);
    console.groupEnd();
    return null;
  }

  console.log('✅ Parsed Value:', parsedValue);
  console.groupEnd();
  return parsedValue;
};

/**
 * Formats a metric value to at most 2 decimal places.
 * Returns '-' only for null/undefined. 0 renders as "0".
 */
export const formatMetric = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num)) return '-';
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
};

/**
 * Converts seconds to "NdNh" format for uptime cards.
 */
export const formatUptime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds <= 0) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
};
