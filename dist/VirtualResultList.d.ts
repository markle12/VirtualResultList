import { Cursor } from './Cursor.js';
import { ResultFetcher, ResultRange } from "./index.js";
export declare class VirtualResultList<Datatype> {
    private fetcher;
    private initialFetch;
    private ranges;
    private _length;
    private eventer;
    constructor(fetcher: ResultFetcher | null, initialFetch: {
        offset: number;
        count: number;
    });
    reset: () => void;
    setFetcher: (fetcher: ResultFetcher, initialFetch?: {
        offset: number;
        count: number;
    }) => void;
    cursor: (offset: number, pageSize: number, preloadPages: number) => Cursor<Datatype>;
    update: (data: ResultRange<Datatype>) => void;
    onRangeUpdate: (listener: (range: {
        offset: number;
        count: number;
    }) => void) => () => void;
    onRowCountUpdate: (listener: (data: {
        totalRows: number;
    }) => void) => () => void;
    private addRange;
    fetch: (offset: number, count: number) => void;
    getRange: (offset: number, count: number) => {
        values: any[];
        missing: {
            from: number;
            to: number;
        }[];
    };
    get length(): number;
}
