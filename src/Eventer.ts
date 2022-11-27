export class Eventer extends EventTarget {
	public on = (eventName: string, listener: (...args: any) => void) => {
		return this.addEventListener(eventName, listener);
	}
	public off = (eventName: string, listener: (...args: any) => void) => {
		return this.removeEventListener(eventName, listener);
	}
	public emit = (eventName: string, data: any = {}) => {
		const event = new CustomEvent(eventName, { detail: data });
		this.dispatchEvent(event);
	}
}