import { Eventer } from './Eventer.js';
import { PendingRow } from './index.js';
import { VirtualResultList } from './VirtualResultList.js';

export interface CursorView<Datatype>{
	offset: number,
	page: number,
	pageSize: number,
	preloadPages: number,
	totalRows: number,
	rows: Array<Datatype | PendingRow>
}

export class Cursor<Datatype> {
	private eventer : Eventer = new Eventer();
	private _destroyed : boolean = false;
	private _view : Partial<CursorView<Datatype>>;
	private cleanup : (() => void)[] = [];
	constructor(private resultSet: VirtualResultList<Datatype>, private settings = { offset: 0, pageSize: 36, preloadPages: 2 }) {
		this._view = {
			rows: this.getRows(),
			totalRows: this.resultSet.length
		};

		this.cleanup.push(resultSet.onRangeUpdate((range) => {
			const eventRangeStart = range.offset;
			const eventRangeEnd = range.offset + range.count;
			const viewRangeStart = this.settings.offset;
			const viewRangeEnd = this.settings.offset + this.settings.pageSize;
			if ( (eventRangeStart >= viewRangeStart && eventRangeStart <= viewRangeEnd) 
				|| 	(eventRangeEnd >= viewRangeStart && eventRangeEnd <= viewRangeEnd)
				|| (eventRangeStart <= viewRangeStart && eventRangeEnd >= viewRangeEnd)
				|| (viewRangeStart <= eventRangeStart && viewRangeEnd >= eventRangeEnd)) {
					this._view.rows = this.getRows();
					this.eventer.emit('update');
			}
		}));

		this.cleanup.push(resultSet.onRowCountUpdate(({totalRows}) => {
			this._view.totalRows = totalRows;
			this.eventer.emit('update');
		}));

		setTimeout(() => {
			this._view = {
				rows: this.getRows(),
				totalRows: this.resultSet.length
			};
			this.eventer.emit('update');
		});
	}

	get destroyed() {
		return this._destroyed;
	}

	get view() {
		return {
			offset: this.settings.offset,
			page: Math.floor(this.settings.offset / this.settings.pageSize)+1,
			pageSize: this.settings.pageSize,
			preloadPages: this.settings.preloadPages,
			totalRows: this._view.totalRows,
			rows: this._view.rows
		}
	}
	
	public destroy() {
		this.cleanup.forEach((task) => {task()});
		this._destroyed = true;
	}
	
	public pageSize(size?: number) {
		if (size !== undefined) {
			this.settings.pageSize = size;
			this._view.rows = this.getRows();
			this.preload();
			this.eventer.emit('update');
		}
		return this.settings.pageSize;
	}

	public getRows() {
		return this.resultSet.getRange(this.settings.offset, this.settings.pageSize).values;
	}

	public onUpdate = (listener: (data: CursorView<Datatype>) => void) => {
		const wrappedListener = (event: CustomEvent) => {
			listener(event.detail);
		}
		this.eventer.on('update', wrappedListener);
		return () => {
			this.eventer.off('update', wrappedListener);
		}
	}

	private preload() {
		
		const pageOffset = this.settings.offset;
		let rangeStart = pageOffset - (this.settings.pageSize * this.settings.preloadPages);
		if (rangeStart < 0) {
			rangeStart = 0;
		}
		let rangeEnd = pageOffset + (this.settings.pageSize * (this.settings.preloadPages + 1));
		if (rangeEnd > this.resultSet.length) {
			rangeEnd = this.resultSet.length;
		}
		
		const {missing} = this.resultSet.getRange(rangeStart, rangeEnd - rangeStart);

		if (missing.length) {
			missing.forEach((missingRange) => {
				this.resultSet.fetch(missingRange.from, missingRange.to - missingRange.from);
			})
		}
	}

	public jumpToOffset(offset: number) {
		if (offset > this.resultSet.length - this.settings.pageSize) {
			offset = this.resultSet.length - this.settings.pageSize;
		} else if (offset < 0) {
			offset = 0;
		}
		this.settings.offset = offset;
		this._view.rows = this.getRows();
		this.preload();
		this.eventer.emit('update');
	}

	public jumpToPage = (page: number) => {
		// Pages start at 1, for the humans
		if (page < 1) {
			page = 1;
		}
		this.jumpToOffset((page-1) * this.settings.pageSize);
	}

	public next() {
		this.jumpToOffset(this.settings.offset + this.settings.pageSize);
	}

	public previous() {
		this.jumpToOffset(this.settings.offset - this.settings.pageSize);
	}

	public prev = this.previous;

	public first() {
		this.jumpToOffset(0);
	}

	public last() {
		this.jumpToOffset(this.resultSet.length - this.settings.pageSize);
	}
}
