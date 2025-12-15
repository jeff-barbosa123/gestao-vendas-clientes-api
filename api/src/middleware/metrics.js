const httpCounters = new Map();

function labelsKey(method, path, status) {
  return `${method}|${path}|${status}`;
}

function recordRequest(method, path, status, durationMs) {
  const key = labelsKey(method, path, status);
  if (!httpCounters.has(key)) {
    httpCounters.set(key, { count: 0, sum: 0 });
  }
  const entry = httpCounters.get(key);
  entry.count += 1;
  entry.sum += durationMs;
}

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1e6;
    recordRequest(req.method, req.route ? req.route.path || req.originalUrl : req.originalUrl, res.statusCode, durationMs);
  });
  next();
}

function renderPrometheus() {
  const lines = [];
  lines.push("# HELP http_requests_total Total de requisições HTTP");
  lines.push("# TYPE http_requests_total counter");
  for (const [key, entry] of httpCounters.entries()) {
    const [method, path, status] = key.split("|");
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${entry.count}`);
  }

  lines.push("# HELP http_request_duration_ms_sum Soma de duração das requisições em ms");
  lines.push("# TYPE http_request_duration_ms_sum counter");
  for (const [key, entry] of httpCounters.entries()) {
    const [method, path, status] = key.split("|");
    lines.push(`http_request_duration_ms_sum{method="${method}",path="${path}",status="${status}"} ${entry.sum.toFixed(2)}`);
  }

  return lines.join("\n") + "\n";
}

module.exports = { metricsMiddleware, renderPrometheus };
