
import { Cursor } from './Cursor.js';
import { ResultFetcher, ResultRange, PendingRow } from "./index.js";
import { Eventer } from './Eventer.js';

export class VirtualResultList<Datatype> {
	private ranges : Array<ResultRange<Datatype>> = [];
	private _length = 0;
	private eventer : Eventer = new Eventer();
	constructor(private fetcher: ResultFetcher | null, private initialFetch: {offset: number, count: number}) {
		if (fetcher) {
			this.reset();
		}
		
	}

	public reset = () => {
		const resetEvent = {offset: 0, count: this.length};
		this.ranges = [];
		this._length = 0;
		this.eventer.emit('rangeUpdated', resetEvent);
		this.fetch(this.initialFetch.offset, this.initialFetch.count);
	}

	public setFetcher = (fetcher: ResultFetcher, initialFetch?: {offset: number, count: number}) => {
		if (initialFetch) {
			this.initialFetch = initialFetch;
		}
		this.fetcher = fetcher;
		this.reset();
	}

	public cursor = (offset: number, pageSize: number, preloadPages: number) => {
		return new Cursor<Datatype>(this, {offset, pageSize, preloadPages});
	}

	// For passing data back into the list, from actions that update said data
	// ie when rating an item, the server passes back the updated row, which can then be pushed back in here
	public update = (data: ResultRange<Datatype>) => {
		this.addRange(data);
	}

	public onRangeUpdate = (listener: (range: {offset: number, count: number}) => void) => {
		const wrappedListener = (event: CustomEvent) => {
			listener(event.detail);
		}
		this.eventer.on('rangeUpdated', wrappedListener);
		return () => {
			this.eventer.off('rangeUpdated', wrappedListener);
		}
	}

	public onRowCountUpdate = (listener: (data: {totalRows: number}) => void) => {
		const wrappedListener = (event: CustomEvent) => {
			listener(event.detail);
		}
		this.eventer.on('rowCountUpdated', wrappedListener);
		return () => {
			this.eventer.off('rowCountUpdated', wrappedListener);
		}
	}
	private addRange = (range: ResultRange<Datatype>) => {
		const rangeInfo = {
			offset: range.offset,
			count: range.values.length	
		}
		let rangeAdded = false;
		if (!this.ranges.length) {
			this.ranges.push(range);
			rangeAdded = true;
		} else {
			for (let i = 0; i < this.ranges.length; i++) {
				if (this.ranges[i].offset <= range.offset) { // ranges[i] is prior to new range
					if (range.offset + range.values.length <= this.ranges[i].offset + this.ranges[i].values.length) { 
						// New range fits entirely inside existing range
						let startRange : ResultRange<Datatype> = {
							...this.ranges[i],
							offset: this.ranges[i].offset,
							values: this.ranges[i].values.slice(0, range.offset - this.ranges[i].offset),
						}
						let endRange : ResultRange<Datatype> = {
							...this.ranges[i],
							offset: range.offset + range.values.length,
							values: this.ranges[i].values.slice(range.offset + range.values.length)
						}
						this.ranges.splice(i, 1, startRange, range, endRange);
						rangeAdded = true;
						break;
					} else if (i == this.ranges.length - 1) {
						// ranges[i] is the last range in the list
						if (this.ranges[i].offset + this.ranges[i].values.length >= range.offset) {
							this.ranges[i].values.splice(this.ranges[i].offset + this.ranges[i].values.length - range.offset);
						}
						this.ranges.push(range);
						rangeAdded = true;
						break;
					} else {
						// range may overlap ranges[i] and ranges[i+1]
						const nextRange = this.ranges[i+1];
						if (nextRange.offset > range.offset) {
							const currentRangeOverlap = this.ranges[i].offset + this.ranges[i].values.length - range.offset;
							const nextRangeOverlap =  range.offset + range.values.length - nextRange.offset;

							if (currentRangeOverlap > 0) {
								// cut older result down
								if (this.ranges[i].originalSize === undefined) {
									this.ranges[i].originalSize = this.ranges[i].values.length;
								}
								this.ranges[i].values.splice(this.ranges[i].values.length - currentRangeOverlap, currentRangeOverlap);
							}
							if (nextRangeOverlap > 0) {
								// cut older result down (from front)
								if (nextRange.originalSize === undefined) {
									nextRange.originalSize = nextRange.values.length;
								}
								if (nextRange.originalOffset === undefined) {
									nextRange.originalOffset = nextRange.offset;
								}
								nextRange.values.splice(0, nextRangeOverlap);
							}
							this.ranges.splice(i+1, 0, range);
							rangeAdded = true;
							break;
						}
					}
				} else {
					if (this.ranges[i].offset < range.offset+range.values.length) {	
						this.ranges[i].values.splice(0, (range.offset+range.values.length) - this.ranges[i].offset);
					}
					this.ranges.unshift(range);
					
					rangeAdded = true;
					break;
				}
			}
		}
		if (rangeAdded) {
			this.eventer.emit('rangeUpdated', rangeInfo);
		} else {
			console.log(`Couldn't figure out where to put a range; worth investigating I bet`);
		}
	}

	public fetch = (offset: number, count: number) => {
		if (this.fetcher && count > 0) {
			this.fetcher(offset, count).then(({rows, totalRows}) => {
				if (this._length != totalRows) {
					this.eventer.emit('rowCountUpdated', {totalRows});
					this._length = totalRows;
				}
				this.addRange({
					offset: offset,
					fetchDate: new Date(),
					fetchSize: count,
					values: rows
				});
			})
		}
	}

	public getRange = (offset: number, count: number) => {
		
		if (!this.ranges.length) {
			const values = new Array(count).map(() => {
				return new PendingRow();
			});
			return {values: values, missing: [{from: offset, to: offset+count}]};
		}
		let out : Array<any> = [];
		let sourceRangeIndex = 0;
		let sourceRange = this.ranges[sourceRangeIndex];
		let missingRanges : {from: number, to: number}[] = [];
		while (offset > sourceRange.offset + sourceRange.values.length) {
			sourceRangeIndex += 1;
			if (sourceRangeIndex >= this.ranges.length) {
				const values = new Array(count).map(() => {
					return new PendingRow();
				});
				return {values: values, missing: [{from: offset, to: offset+count}]};
			}
			sourceRange = this.ranges[sourceRangeIndex];
		}
		
		while (out.length < count) {
			if (offset + out.length >= sourceRange.offset + sourceRange.values.length) {
				sourceRangeIndex += 1;
				if (sourceRangeIndex >= this.ranges.length) {
					const missingRangeStart = offset + out.length;
					while (out.length < count) {
						out.push(new PendingRow());
					}
					missingRanges.push({
						from: missingRangeStart,
						to: offset + out.length
					});
				}
				
				sourceRange = this.ranges[sourceRangeIndex];
			} else {
				if (offset + out.length < sourceRange.offset) {
					// probably see if a concat/splice is meaningfully more performant here at some point
					const missingRangeStart = offset + out.length;
					while (offset + out.length < sourceRange.offset) {
						out.push(new PendingRow());
					}
					missingRanges.push({
						from: missingRangeStart,
						to: offset + out.length
					});
				}
				
				let sliceStart = 0;
				let sliceEnd = sourceRange.values.length;
				
				if (offset > sourceRange.offset) { 
					sliceStart = offset - sourceRange.offset;
				}
				if (offset + count < sourceRange.offset + sourceRange.values.length) {
					sliceEnd = (offset + count) - sourceRange.offset;
				}
				
				const segment = sourceRange.values.slice(sliceStart, sliceEnd);
				out = out.concat(segment);
			}
		}
		return {values: out, missing: missingRanges};
	}

	get length() {
		return this._length;
	}
}