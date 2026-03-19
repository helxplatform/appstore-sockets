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

// Start of fix for ASVS req_id V4.4.2
// Comma-separated list of origins permitted to open WebSocket connections.
// E.g. WS_ALLOWED_ORIGINS=https://helx.example.com,https://helx-staging.example.com
// If empty, all origins are allowed — this MUST be set in production deployments.
export const allowedWsOrigins: string[] =
    process.env.WS_ALLOWED_ORIGINS
        ? process.env.WS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
        : []
// End of fix for req_id V4.4.2

// Start of fix for ASVS req_id V7.4.1
// Interval (ms) at which open WebSocket sessions re-verify identity against the appstore.
// Default: 300 000 ms (5 minutes). Connections are closed if re-verification fails.
export const wsSessionRecheckIntervalMs: number =
    parseInt(process.env.WS_SESSION_RECHECK_INTERVAL_MS ?? '300000', 10)
// End of fix for req_id V7.4.1