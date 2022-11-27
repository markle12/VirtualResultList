export class Eventer extends EventTarget {
    constructor() {
        super(...arguments);
        this.on = (eventName, listener) => {
            return this.addEventListener(eventName, listener);
        };
        this.off = (eventName, listener) => {
            return this.removeEventListener(eventName, listener);
        };
        this.emit = (eventName, data = {}) => {
            const event = new CustomEvent(eventName, { detail: data });
            this.dispatchEvent(event);
        };
    }
}
