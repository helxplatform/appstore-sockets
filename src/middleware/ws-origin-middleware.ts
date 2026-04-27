import { Request, Response, NextFunction } from 'express'
import { allowAnyWsOrigin, allowedWsOrigins } from '../config'

// Verifies the Origin header on websocket-upgrade requests against an allowlist.
export default (req: Request, res: Response, next: NextFunction) => {
    if (allowAnyWsOrigin) return next()

    const origin = req.headers.origin
    // No Origin header -- reject by default
    if (typeof origin !== 'string' || origin.length === 0) {
        console.log(`Rejecting websocket connection with missing Origin header (url=${ req.url })`)
        res.status(403).send('Origin header is required.')
        return
    }
    if (!allowedWsOrigins.includes(origin.toLowerCase())) {
        console.log(`Rejecting websocket connection from disallowed origin "${ origin }" (url=${ req.url })`)
        res.status(403).send('Origin is not permitted.')
        return
    }
    next()
}
