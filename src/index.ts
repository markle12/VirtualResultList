import { VirtualResultList } from "./VirtualResultList.js";
import { Cursor } from "./Cursor.js";

export { VirtualResultList, Cursor };

export type ResultFetcher = (offset: number, count: number) => Promise<FetchResult>;

export interface FetchResult {
	rows: Array<any>,
	totalRows: number
}

export interface ResultRange<Datatype> {
	offset: number,
	fetchDate: Date,
	fetchSize: number,
	values: Array<Datatype>,
	originalSize?: number,
	originalOffset?: number
}

export class PendingRow {
	readonly isPending = true;
	constructor(readonly data?: any) {}
}
