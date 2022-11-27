export { VirtualResultList } from "./VirtualResultList.js";
export { Cursor } from "./Cursor.js";
export class PendingRow {
    constructor(data) {
        this.data = data;
        this.isPending = true;
    }
}
