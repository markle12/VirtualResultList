import { Cursor } from './Cursor.js';
import { PendingRow } from "./index.js";
import { Eventer } from './Eventer.js';
export class VirtualResultList {
    constructor(fetcher, initialFetch) {
        this.fetcher = fetcher;
        this.initialFetch = initialFetch;
        this.ranges = [];
        this._length = 0;
        this.eventer = new Eventer();
        this.reset = () => {
            const resetEvent = { offset: 0, count: this.length };
            this.ranges = [];
            this._length = 0;
            this.eventer.emit('rangeUpdated', resetEvent);
            this.fetch(this.initialFetch.offset, this.initialFetch.count);
        };
        this.setFetcher = (fetcher, initialFetch) => {
            if (initialFetch) {
                this.initialFetch = initialFetch;
            }
            this.fetcher = fetcher;
            this.reset();
        };
        this.cursor = (offset, pageSize, preloadPages) => {
            return new Cursor(this, { offset, pageSize, preloadPages });
        };
        this.onRangeUpdate = (listener) => {
            const wrappedListener = (event) => {
                listener(event.detail);
            };
            this.eventer.on('rangeUpdated', wrappedListener);
            return () => {
                this.eventer.off('rangeUpdated', wrappedListener);
            };
        };
        this.onRowCountUpdate = (listener) => {
            const wrappedListener = (event) => {
                listener(event.detail);
            };
            this.eventer.on('rowCountUpdated', wrappedListener);
            return () => {
                this.eventer.off('rowCountUpdated', wrappedListener);
            };
        };
        this.addRange = (range) => {
            const rangeInfo = {
                offset: range.offset,
                count: range.values.length
            };
            let rangeAdded = false;
            if (!this.ranges.length) {
                this.ranges.push(range);
                rangeAdded = true;
            }
            else {
                for (let i = 0; i < this.ranges.length; i++) {
                    if (this.ranges[i].offset <= range.offset) {
                        if (i == this.ranges.length - 1) {
                            this.ranges.push(range);
                            rangeAdded = true;
                            break;
                        }
                        else {
                            const nextRange = this.ranges[i + 1];
                            if (nextRange.offset > range.offset) {
                                const currentRangeOverlap = this.ranges[i].offset + this.ranges[i].values.length - range.offset;
                                const nextRangeOverlap = range.offset + range.values.length - nextRange.offset;
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
                                this.ranges.splice(i + 1, 0, range);
                                rangeAdded = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (rangeAdded) {
                this.eventer.emit('rangeUpdated', rangeInfo);
            }
        };
        this.fetch = (offset, count) => {
            if (this.fetcher && count > 0) {
                this.fetcher(offset, count).then(({ rows, totalRows }) => {
                    if (this._length != totalRows) {
                        this.eventer.emit('rowCountUpdated', { totalRows });
                        this._length = totalRows;
                    }
                    this.addRange({
                        offset: offset,
                        fetchDate: new Date(),
                        fetchSize: count,
                        values: rows
                    });
                });
            }
        };
        this.getRange = (offset, count) => {
            if (!this.ranges.length) {
                const values = new Array(count).map(() => {
                    return new PendingRow();
                });
                return { values: values, missing: [{ from: offset, to: offset + count }] };
            }
            let out = [];
            let sourceRangeIndex = 0;
            let sourceRange = this.ranges[sourceRangeIndex];
            let missingRanges = [];
            while (offset > sourceRange.offset + sourceRange.values.length) {
                sourceRangeIndex += 1;
                if (sourceRangeIndex >= this.ranges.length) {
                    const values = new Array(count).map(() => {
                        return new PendingRow();
                    });
                    return { values: values, missing: [{ from: offset, to: offset + count }] };
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
                }
                else {
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
            return { values: out, missing: missingRanges };
        };
        if (fetcher) {
            this.reset();
        }
    }
    get length() {
        return this._length;
    }
}
