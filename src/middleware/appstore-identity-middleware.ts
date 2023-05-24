import { Request, Response, NextFunction } from 'express'

interface AppstoreIdentity {
    remoteUser: string
    accessToken: string
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

export default (req: Request, res: Response, next: NextFunction) => {
    const remoteUser = req.headers["remote_user"]
    const accessToken = req.headers["authorization"]

    if (typeof remoteUser === "string" && typeof accessToken === "string") {
        req.appstoreIdentity = {
            remoteUser,
            accessToken
        }
        next()
    } else {
        res.status(401)
        res.send(
            `You shouldn\'t be seeing this message. \
             There's probably something wrong with the deployment configuration \
             or a security vulnerabilty.
            `
        )
    }
}