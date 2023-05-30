import { Event } from './event'

export enum AppStatus {
    LAUNCHING = "LAUNCHING",
    LAUNCHED = "LAUNCHED",
    FAILED = "FAILED",
    SUSPENDING = "SUSPENDING",
    TERMINATED = "TERMINATED"
}

interface ContainerState {
    type: "WAITING" | "RUNNING" | "TERMINATED"
}
interface ContainerWaitingState extends ContainerState {
    message?: string
    reason?: string
}
interface ContainerRunningState extends ContainerState {
    started_at?: number
}
interface ContainerTerminatedState extends ContainerState {
    exit_code: number
    started_at?: number
    finished_at?: number
    message?: string
    reason?: string
}
export interface ContainerStatus {
    container_name: string
    container_state: ContainerWaitingState | ContainerRunningState | ContainerTerminatedState
}

export interface AppStatusData {
    appId: string
    status: AppStatus
    containerStates: ContainerStatus[]
}
export class AppStatusEvent extends Event<AppStatusData> {
    constructor(data: AppStatusData) {
        super("app_status", data)
    }
}
export class InitialAppStatusesEvent extends Event<AppStatusEvent[]> {
    constructor(data: AppStatusEvent[]) {
        super("initial_app_statuses", data)
    }
    serialize() {
        return {
            type: this.getType(),
            data: this.getData().map((event) => event.serialize())
        }
    }
}