const process = require('process')


if (!process.env.APPSTORE_HOST) throw new Error("Environment variable APPSTORE_HOST must be set")
export const appstoreHost: string = process.env.APPSTORE_HOST
// General event-publishing routes need to include this secret
// in their header. Only pods authorized by the service should
// be able to access those endpoints, but this is an extra layer
// of security to protect against any potential reverse proxy bypass.
export const publisherSecret: string = process.env.PUBLISHER_SECRET ?? ""
if (!process.env.REQUIRE_PUBLISH_SECRET) throw new Error("Environment variable REQUIRE_PUBLISH_SECRET must be set")
export const requirePublishSecret = process.env.REQUIRE_PUBLISH_SECRET.toLowerCase() === "true"

// Allowlist of Origin header values permitted to open websocket connections.
// Required to prevent Cross-Site WebSocket Hijacking.
// Format: comma-separated list of full origins (scheme://host[:port]). Compared
// case-insensitively. Use "*" only for local development.
if (!process.env.ALLOWED_WS_ORIGINS) throw new Error("Environment variable ALLOWED_WS_ORIGINS must be set")
const parsedOrigins: string[] = (process.env.ALLOWED_WS_ORIGINS as string)
    .split(',')
    .map((o: string) => o.trim())
    .filter((o: string) => o.length > 0)
export const allowAnyWsOrigin: boolean = parsedOrigins.includes("*")
export const allowedWsOrigins: string[] = parsedOrigins.map((o: string) => o.toLowerCase())
if (allowAnyWsOrigin) {
    console.log('--- ALLOWED_WS_ORIGINS contains "*"; websocket origin verification is DISABLED ---')
}

// How often (seconds) each open websocket re-validates its appstore session.
// Without this, sockets outlive logout/expiry because authentication only happens
// at handshake. Default 300s (5 min); the staleness window is bounded by this value.
const rawReauthInterval = process.env.WS_REAUTH_INTERVAL_SECONDS
const parsedReauthInterval = rawReauthInterval ? parseInt(rawReauthInterval, 10) : 300
if (Number.isNaN(parsedReauthInterval) || parsedReauthInterval <= 0) {
    throw new Error("Environment variable WS_REAUTH_INTERVAL_SECONDS must be a positive integer")
}
export const wsReauthIntervalMs: number = parsedReauthInterval * 1000