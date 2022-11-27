import { VirtualResultList } from "./VirtualResultList.js";
import { Cursor } from "./Cursor.js";
export { VirtualResultList, Cursor };
export class PendingRow {
    constructor(data) {
        this.data = data;
        this.isPending = true;
    }
}
