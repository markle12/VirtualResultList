export declare class Eventer extends EventTarget {
    on: (eventName: string, listener: (...args: any) => void) => void;
    off: (eventName: string, listener: (...args: any) => void) => void;
    emit: (eventName: string, data?: any) => void;
}
