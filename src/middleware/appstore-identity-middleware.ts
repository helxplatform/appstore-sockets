import { Request, Response, NextFunction } from 'express'
import { checkAppstoreAuth } from './appstore-auth'

interface AppstoreIdentity {
    remoteUser: string
    accessToken?: string // Sometimes access token is undefined, but that's not important since we are directly authenticating with the appstore server.
    // Cookie header captured at handshake. Persisted so background re-validation
    // can call /auth/ with the same credentials the user originally presented.
    cookie?: string
}

// Augment request typings globally to add our injected properties.
// This needs to be optional since the middleware may only be used on certain handlers.
declare global {
    namespace Express {
        interface Request {
            appstoreIdentity?: AppstoreIdentity
        }
    }
}

// We need to authenticate appstore identity here rather than through nginx/ambassador
// because otherwise someone could open a websocket connection directly through ambassador with forged
// auth headers.
export default async (req: Request, res: Response, next: NextFunction) => {
    const { remoteUser, accessToken } = await checkAppstoreAuth(req.headers.cookie)
    // In certain circumstances accecssToken will be undefined, not entirely sure why.
    // E.g. the admin account never seems to have an access token.
    if (remoteUser !== undefined) {
        req.appstoreIdentity = {
            remoteUser,
            accessToken,
            cookie: req.headers.cookie
        }
        next()
    } else {
        console.log(`User authentication rejected by Appstore, rejecting connection to ${ req.url }...`)
        res.status(401)
        res.send(`You aren't authorized to access this route.`)
    }
}