import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { appstoreHost } from '../config'

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

// We need to authenticate appstore identity here rather than through nginx/ambassador
// because otherwise someone could open a websocket connection directly through ambassador with forged
// auth headers.
export default async (req: Request, res: Response, next: NextFunction) => {
    const authRes = await axios.get(`http://${ appstoreHost }/auth`, {
        headers: {
            Cookie: req.headers.cookie
        }
    })
    const remoteUser: string = authRes.headers["Remote_user"]
    const accessToken: string = authRes.headers["Access_token"]


    if (authRes.status === 200 && remoteUser && accessToken) {
        req.appstoreIdentity = {
            remoteUser,
            accessToken
        }
        next()
    } else {
        res.status(401)
        res.send(`You aren't authorized to access this route.`)
    }
}