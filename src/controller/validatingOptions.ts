import {Columns, Options, Order} from "../interfaces/queryTypes";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class ValidatingOptions {

	private datasets: InsightDataset[];
	private dataSetsAccessed: string[];
	private columnsKeyList: string[];
	private appliedKeys: Set<string> | undefined;
	private datasetKind: InsightDatasetKind | null = null;

	constructor(datasets: InsightDataset[], dataSetsAccessed: string[], columnsKeyList: string[],
		appliedKeys: Set<string> | undefined) {
		this.datasets = datasets;
		this.dataSetsAccessed = dataSetsAccessed;
		this.columnsKeyList = columnsKeyList;
		this.appliedKeys = appliedKeys;
	}

	private requireKeysDatasetSections = ["uuid", "id", "title", "instructor",
		"dept", "year", "avg", "pass", "fail", "audit"];

	private requireKeysDatasetRooms = ["fullname", "shortname", "number",
		"name", "address", "type", "furniture", "href", "lat", "lon", "seats"];

	public checkOptions(options: Options): void {
		const allowedKeys = ["COLUMNS", "ORDER"];
		for (let key in options) {
			if (!allowedKeys.includes(key)) {
				throw new InsightError(`Invalid key found: ${key}. Only COLUMNS and ORDER are allowed.`);
			}
		}

		if (!options.COLUMNS) {
			throw new InsightError("COLUMNS is null");
		} else {
			this.checkColumns(options.COLUMNS);
		}

		if (options.ORDER) {
			this.checkOrder(options.ORDER);
		}
	}

	private checkColumns(columns: Columns): boolean {
		if (!columns || columns.length === 0) {
			throw new Error("Columns parameter is empty!");
		}

		columns.forEach((column) => {
			if (this.appliedKeys && this.appliedKeys.has(column)) {
				this.columnsKeyList.push(column);
			} else{
				this.checkKey(column);
				this.columnsKeyList.push(column);
			}
		});

		return true;
	}

	private checkOrder(order: Order): boolean {
		if (typeof order === "string") {
			this.checkKey(order);
			if (!this.columnsKeyList.includes(order)) {
				throw new InsightError("Order key not in columns");
			}
		} else if (typeof order === "object") {
			const {dir, keys} = order;
			if (!dir || !["UP", "DOWN"].includes(dir)) {
				throw new InsightError("Invalid direction in order");
			}
			if (!keys || !Array.isArray(keys) || keys.length === 0) {
				throw new InsightError("Invalid keys in order");
			}
			keys.forEach((key) => {
				this.checkKey(key);
				if (!this.columnsKeyList.includes(key)) {
					throw new InsightError(`Order key ${key} not in columns`);
				}
			});
		} else {
			throw new InsightError("Invalid order type");
		}
		return true;
	}

	private checkKey(key: string): boolean {
		let parts = key.split("_");

		if(parts.length !== 2){
			throw new InsightError("Key does not contain _");
		}

		if(key.includes(" ")){
			throw new InsightError("Key contains space");
		}

		let [datasetName, keyFromDataset] = parts;

		if(!this.datasetNameExists(datasetName)){
			throw new InsightError(`Dataset ${datasetName} does not exist`);
		}

		if(this.datasetKind !== null && this.datasetKind === InsightDatasetKind.Sections){
			if (!this.requireKeysDatasetSections.includes(keyFromDataset)) {
				throw new InsightError(`Invalid field: ${keyFromDataset}`);
			}
		} else if(this.datasetKind !== null && this.datasetKind === InsightDatasetKind.Rooms){
			if (!this.requireKeysDatasetRooms.includes(keyFromDataset)) {
				throw new InsightError(`Invalid field: ${keyFromDataset}`);
			}
		} else {
			throw new InsightError("Invalid dataset kind");
		}
		return true;
	}

	private datasetNameExists(datasetName: string): boolean {
		if (this.dataSetsAccessed.includes(datasetName)) {
			for (const dataset of this.datasets) {
				if (dataset.id === datasetName) {
					this.datasetKind = dataset.kind;
					return true;
				}
			}
		}

		const existsInDatasets = this.datasets.some((dataset) => dataset.id === datasetName);
		if (existsInDatasets) {
			if (this.dataSetsAccessed.length > 0) {
				throw new InsightError("Cannot access more than 1 dataset");
			}

			this.dataSetsAccessed.push(datasetName);
			for (const dataset of this.datasets) {
				if (dataset.id === datasetName) {
					this.datasetKind = dataset.kind;
					return true;
				}
			}
		}
		return false;
	}
}
