const process = require('process')


// General event-publishing routes need to include this secret
// in their header. Only pods authorized by the service should
// be able to access those endpoints, but this is an extra layer
// of security to protect against any potential reverse proxy bypass.
export const publisherSecret: string = process.env.PUBLISHER_SECRET ?? ""
if (!process.env.REQUIRE_PUBLISH_SECRET) throw new Error("Environment variable REQUIRE_PUBLISH_SECRET must be set")
export const requirePublishSecret = process.env.REQUIRE_PUBLISH_SECRET.toLowerCase() === "true"