// A JSON-serializable representation of an IEvent
interface SerializedEvent {
    type: string
    data: string | number | boolean | any[] | object
}
export interface IEvent<T> {
    getType(): string
    getData(): T
    serialize(): SerializedEvent
}
export abstract class Event<T> implements IEvent<T> {
    private readonly type: string
    private readonly data: T
    constructor(type: string, data: T) {
        this.type = type
        this.data = data
    }
    getType() { return this.type }
    getData() { return this.data }
    serialize() { 
        return {
            type: this.getType(),
            data: this.getData() as unknown as object
        }
    }
}