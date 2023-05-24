import { Request, Response, NextFunction } from 'express'
import type { WebSocket } from 'ws'

interface Clients {
    [remoteUser: string]: WebSocket
}
interface GetClient {
    (remoteUser: string): WebSocket
}
interface AddClient {
    (remoteUser: string, ws: WebSocket): void
}
interface DeleteClient {
    (remoteUser: string): void
}

const clients: Clients = {}
const getClient = (remoteUser: string) => clients[remoteUser]
const addClient = (remoteUser: string, ws: WebSocket) => {
    clients[remoteUser] = ws
}
const deleteClient = (remoteUser: string) => {
    delete clients[remoteUser]
}

declare global {
    namespace Express {
        interface Request {
            getWsClient?: GetClient,
            addWsClient?: AddClient,
            deleteWsClient?: DeleteClient
        }
    }
}

export default (req: Request, res: Response, next: NextFunction) => {
    req.getWsClient = getClient
    req.addWsClient = addClient
    req.deleteWsClient = deleteClient
    next()
}