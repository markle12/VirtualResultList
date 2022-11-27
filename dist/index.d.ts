export { VirtualResultList } from "./VirtualResultList.js";
export { Cursor, type CursorView } from "./Cursor.js";
export type ResultFetcher = (offset: number, count: number) => Promise<FetchResult>;
export interface FetchResult {
    rows: Array<any>;
    totalRows: number;
}
export interface ResultRange<Datatype> {
    offset: number;
    fetchDate: Date;
    fetchSize: number;
    values: Array<Datatype>;
    originalSize?: number;
    originalOffset?: number;
}
export declare class PendingRow {
    readonly data?: any;
    readonly isPending = true;
    constructor(data?: any);
}
