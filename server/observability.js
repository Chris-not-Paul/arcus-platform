const startedAt = Date.now();
const counters = new Map();

export function recordRequest({ durationMs, method, path, statusCode }) {
  const key = `${method} ${path} ${statusCode}`;
  const current = counters.get(key) || {
    count: 0,
    durationMs: 0,
  };

  counters.set(key, {
    count: current.count + 1,
    durationMs: current.durationMs + durationMs,
  });
}

export function requestStats() {
  const summary = {
    byStatusClass: {},
    total: 0,
  };

  counters.forEach((value, key) => {
    const [, , statusCode] = key.split(" ");
    const statusClass = `${String(statusCode || "0").slice(0, 1)}xx`;

    summary.total += value.count;
    summary.byStatusClass[statusClass] =
      (summary.byStatusClass[statusClass] || 0) + value.count;
  });

  return summary;
}

export function prometheusMetrics(gauges = {}) {
  const lines = [
    "# HELP arcus_uptime_seconds ARCUS API process uptime in seconds.",
    "# TYPE arcus_uptime_seconds gauge",
    `arcus_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP arcus_http_requests_total Completed ARCUS HTTP requests.",
    "# TYPE arcus_http_requests_total counter",
  ];

  counters.forEach((value, key) => {
    const [method, path, statusCode] = key.split(" ");

    lines.push(
      `arcus_http_requests_total{method="${method}",path="${path}",status="${statusCode}"} ${value.count}`
    );
  });

  lines.push(
    "# HELP arcus_http_request_duration_ms_sum Total ARCUS HTTP request duration in milliseconds.",
    "# TYPE arcus_http_request_duration_ms_sum counter"
  );

  counters.forEach((value, key) => {
    const [method, path, statusCode] = key.split(" ");

    lines.push(
      `arcus_http_request_duration_ms_sum{method="${method}",path="${path}",status="${statusCode}"} ${value.durationMs}`
    );
  });

  Object.entries(gauges).forEach(([name, value]) => {
    if (Number.isFinite(Number(value))) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${Number(value)}`);
    }
  });

  return `${lines.join("\n")}\n`;
}
