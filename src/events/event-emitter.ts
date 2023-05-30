import type { WebSocket } from 'ws'
import type { IEvent } from './event'
import { AppStatusEvent, InitialAppStatusesEvent, AppStatus, ContainerStatus, AppStatusData } from './app-status-events'

export interface IWebsocketEvents {
    addWebsocket(ws: WebSocket): void
    removeWebsocket(ws: WebSocket): void

    emitInitialAppStatuses(): void
    emitAppStatus(appId: string, status: AppStatus, containerStates: ContainerStatus[]): void
}

export class WebsocketEvents implements IWebsocketEvents {
    // Support multiple connections to the same "client"
    private websockets: WebSocket[] = []
    /** The idea of this is to keep a log of the most recent event that has occured on each unique app id.
     * This will let the frontend hydrate its app status state when it initially loads, since the UI doesn't actually
     * know the states of the apps until it receives an event for them.
     * Note: logs are purged for an app once it hits a terminated state.
     */
    private appStatusLogs: AppStatusEvent[] = []
    
    constructor() {}

    private emit<T>(event: IEvent<T>) {
        console.log(`Emitting ${ event.getType() } event (${ this.websockets.length } receivers)`)
        this.websockets.forEach((ws) => ws.send(JSON.stringify(event.serialize())))
    }
    
    public addWebsocket(ws: WebSocket) {
        this.websockets.push(ws)
    }
    public removeWebsocket(ws: WebSocket) {
        this.websockets = this.websockets.filter((_ws) => _ws !== ws)
    }

    public emitInitialAppStatuses() {
        const event = new InitialAppStatusesEvent(this.appStatusLogs)
        this.emit(event)
    }

    public emitAppStatus(appId: string, status: AppStatus, containerStates: ContainerStatus[]) {
        const event = new AppStatusEvent({
            appId,
            status,
            containerStates
        })
        // Remove other events from the logs concerning this app.
        this.appStatusLogs = this.appStatusLogs.filter((data) => data.getData().appId !== appId)
        // If this event isn't app termination, add it, otherwise, stop tracking the app.
        if (status !== AppStatus.TERMINATED) this.appStatusLogs.push(event)
        this.emit(event)
    }
}