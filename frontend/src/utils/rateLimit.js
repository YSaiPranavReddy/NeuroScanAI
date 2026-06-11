// Client-side rate limiter: max 5 calls per 60 seconds
const LIMIT = 5
const WINDOW_MS = 60_000

export function checkRateLimit() {
  const now = Date.now()
  const raw = localStorage.getItem('rl_timestamps')
  let stamps = raw ? JSON.parse(raw) : []

  // Drop entries outside current window
  stamps = stamps.filter(t => now - t < WINDOW_MS)

  if (stamps.length >= LIMIT) {
    const oldest = stamps[0]
    const resetIn = Math.ceil((WINDOW_MS - (now - oldest)) / 1000)
    return { allowed: false, remaining: 0, resetIn }
  }

  stamps.push(now)
  localStorage.setItem('rl_timestamps', JSON.stringify(stamps))
  return { allowed: true, remaining: LIMIT - stamps.length, resetIn: 0 }
}

export function getRateLimitInfo() {
  const now = Date.now()
  const raw = localStorage.getItem('rl_timestamps')
  let stamps = raw ? JSON.parse(raw) : []
  stamps = stamps.filter(t => now - t < WINDOW_MS)
  return {
    used: stamps.length,
    remaining: Math.max(0, LIMIT - stamps.length),
    limit: LIMIT,
  }
}
