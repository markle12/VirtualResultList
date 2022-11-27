import { PendingRow } from './index.js';
import { VirtualResultList } from './VirtualResultList.js';
export interface CursorView<Datatype> {
    offset: number;
    page: number;
    pageSize: number;
    preloadPages: number;
    totalRows: number;
    rows: Array<Datatype | PendingRow>;
}
export declare class Cursor<Datatype> {
    private resultSet;
    private settings;
    private eventer;
    private _destroyed;
    private _view;
    private cleanup;
    constructor(resultSet: VirtualResultList<Datatype>, settings?: {
        offset: number;
        pageSize: number;
        preloadPages: number;
    });
    get destroyed(): boolean;
    get view(): CursorView<Datatype>;
    destroy(): void;
    pageSize(size?: number): number;
    getRows(): any[];
    onUpdate: (listener: (data: CursorView<Datatype>) => void) => () => void;
    private preload;
    jumpToOffset(offset: number): void;
    jumpToPage: (page: number) => void;
    next(): void;
    previous(): void;
    prev: () => void;
    first(): void;
    last(): void;
}
