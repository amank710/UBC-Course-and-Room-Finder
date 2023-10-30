import {Filter, MComparison, SComparison, Where} from "../interfaces/queryTypes";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";

export default class ValidatingWhere {
	private datasets: InsightDataset[];
	private dataSetsAccessed: string[];
	private datasetKind: InsightDatasetKind | null = null;
	constructor(datasets: InsightDataset[] = [], dataSetsAccessed: string[] = []) {
		this.datasets = datasets;
		this.dataSetsAccessed = dataSetsAccessed;
	}

	private stringKeysSections = ["uuid", "id", "title", "instructor", "dept"];
	private numberKeysSections = ["year", "avg", "pass", "fail", "audit"];
	private stringKeysRooms = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private numberKeysRooms = ["lat", "lon", "seats"];
	private count = 0;
	public checkWhere(where: Where): boolean {
		const keys = Object.keys(where);
		if (keys.length > 1) {
			throw new InsightError("A Where condition should have exactly one key");
		}
		const key = keys[0];
		if (!key) {
			if(this.count === 0) {
				return true;
			} else {
				throw new InsightError("Invalid WHERE condition");
			}
		}
		this.count++;
		if (key === "AND" || key === "OR") {
			const condition = where[key];
			if (condition === undefined) {
				throw new InsightError(`${key} condition is missing`);
			}
			this.checkLogicComparison(condition, key);
		} else if (key === "NOT") {
			if (where.NOT === undefined) {
				throw new InsightError("NOT condition is missing");
			}
			const notKeys = Object.keys(where.NOT);
			if (notKeys.length !== 1) {
				throw new InsightError("NOT should only have 1 key");
			}
			const condition = where[key];
			if (condition === undefined) {
				throw new InsightError(`${key} condition is missing`);
			}
			this.checkWhere(condition);
		} else if (key === "GT" || key === "LT" || key === "EQ") {
			const condition = where[key];
			if (condition === undefined) {
				throw new InsightError(`${key} condition is missing`);
			}
			this.checkComparisonOperatorNumber(condition);
		} else if (key === "IS") {
			const condition = where[key];
			if (condition === undefined) {
				throw new InsightError(`${key} condition is missing`);
			}
			this.checkComparisonOperatorString(condition);
		} else {
			throw new InsightError("Invalid WHERE condition");
		}
		return true;
	}

	private checkLogicComparison(filters: Filter[], key: string): boolean {
		if (!Array.isArray(filters) || filters.length === 0) {
			throw new InsightError("Invalid Logical Comparison");
		}

		filters.forEach((filter) => {
			const filterKeys = Object.keys(filter);
			if (filterKeys.length !== 1) {
				throw new InsightError(`${key} condition should only have 1 key`);
			}
			this.checkWhere(filter);
		});

		return true;
	}

	private checkComparisonOperatorNumber(comparison: MComparison): boolean {
		const keys = Object.keys(comparison);
		if (keys.length !== 1) {
			throw new InsightError("Invalid Comparison Operator");
		}
		const key = keys[0];
		this.checkKey(key, "number");
		if (typeof comparison[key] !== "number") {
			throw new InsightError("Invalid Comparison Operator");
		}
		return true;
	}

	private checkComparisonOperatorString(comparison: SComparison): boolean {
		const keys = Object.keys(comparison);
		if (keys.length !== 1) {
			throw new InsightError("Invalid Comparison Operator");
		}
		const key = keys[0];
		this.checkKey(key, "string");
		const value: string = comparison[key];

		if (typeof value !== "string") {
			throw new InsightError("Invalid Comparison Operator: Value is not a string");
		}

		if (value === "*") {
			return true;
		}
		if (value === "**") {
			return false;
		}

		const startsWithWildcard = value.startsWith("*");
		const endsWithWildcard = value.endsWith("*");
		let actualString = value;

		if (startsWithWildcard) {
			actualString = actualString.substring(1);
		}
		if (endsWithWildcard) {
			actualString = actualString.substring(0, actualString.length - 1);
		}
		if (actualString.length === 0 || actualString.includes("*")) {
			throw new InsightError("Invalid Comparison Operator: Invalid wildcard placement in string");
		}

		return true;
	}

	private checkKey(key: string, keyType: string): boolean {
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
			if(keyType === "number"){
				if (!this.numberKeysSections.includes(keyFromDataset)) {
					throw new InsightError(`Invalid field: ${keyFromDataset}`);
				}
			} else if(keyType === "string"){
				if (!this.stringKeysSections.includes(keyFromDataset)) {
					throw new InsightError(`Invalid field: ${keyFromDataset}`);
				}
			} else {
				throw new InsightError("Invalid key type");
			}
		} else if(this.datasetKind !== null && this.datasetKind === InsightDatasetKind.Rooms){
			if(keyType === "number"){
				if (!this.numberKeysRooms.includes(keyFromDataset)) {
					throw new InsightError(`Invalid field: ${keyFromDataset}`);
				}
			} else if(keyType === "string"){
				if (!this.stringKeysRooms.includes(keyFromDataset)) {
					throw new InsightError(`Invalid field: ${keyFromDataset}`);
				}
			} else {
				throw new InsightError("Invalid key type");
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
