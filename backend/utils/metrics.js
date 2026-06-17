// Lightweight runtime metrics (Operation Red Zone Phase 6).
//
// Exposes Prometheus text-format metrics with zero extra dependencies — a small
// in-process counter registry rendered on demand. Kept dependency-free on
// purpose: it gives real, scrape-able observability (request volume, error rate,
// audit/alert activity, process health) without pulling prom-client and its
// transitive deps into the image. Scraped directly off the backend container.

const counters = {
  http_requests_total: 0,
  http_errors_total: 0, // 5xx
  http_client_errors_total: 0, // 4xx
  audit_writes_total: 0,
  security_alerts_total: 0,
}

// Per-status-class breakdown for http_requests (2xx/3xx/4xx/5xx).
const httpByClass = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 }

function recordHttp(statusCode) {
  counters.http_requests_total += 1
  const cls = `${Math.floor(statusCode / 100)}xx`
  if (httpByClass[cls] !== undefined) httpByClass[cls] += 1
  if (statusCode >= 500) counters.http_errors_total += 1
  else if (statusCode >= 400) counters.http_client_errors_total += 1
}

function inc(name, n = 1) {
  if (counters[name] !== undefined) counters[name] += n
}

function render() {
  const lines = []
  const mem = process.memoryUsage()

  lines.push("# HELP app_http_requests_total Total HTTP requests handled")
  lines.push("# TYPE app_http_requests_total counter")
  lines.push(`app_http_requests_total ${counters.http_requests_total}`)
  for (const [cls, val] of Object.entries(httpByClass)) {
    lines.push(`app_http_requests_by_class{class="${cls}"} ${val}`)
  }

  lines.push("# HELP app_http_errors_total Total 5xx responses")
  lines.push("# TYPE app_http_errors_total counter")
  lines.push(`app_http_errors_total ${counters.http_errors_total}`)

  lines.push("# HELP app_http_client_errors_total Total 4xx responses")
  lines.push("# TYPE app_http_client_errors_total counter")
  lines.push(`app_http_client_errors_total ${counters.http_client_errors_total}`)

  lines.push("# HELP app_audit_writes_total Total audit-log entries written")
  lines.push("# TYPE app_audit_writes_total counter")
  lines.push(`app_audit_writes_total ${counters.audit_writes_total}`)

  lines.push("# HELP app_security_alerts_total Total security alerts raised")
  lines.push("# TYPE app_security_alerts_total counter")
  lines.push(`app_security_alerts_total ${counters.security_alerts_total}`)

  lines.push("# HELP app_process_uptime_seconds Process uptime in seconds")
  lines.push("# TYPE app_process_uptime_seconds gauge")
  lines.push(`app_process_uptime_seconds ${Math.round(process.uptime())}`)

  lines.push("# HELP app_process_resident_memory_bytes Resident set size in bytes")
  lines.push("# TYPE app_process_resident_memory_bytes gauge")
  lines.push(`app_process_resident_memory_bytes ${mem.rss}`)

  lines.push("# HELP app_process_heap_used_bytes Heap used in bytes")
  lines.push("# TYPE app_process_heap_used_bytes gauge")
  lines.push(`app_process_heap_used_bytes ${mem.heapUsed}`)

  return lines.join("\n") + "\n"
}

module.exports = { recordHttp, inc, render }
