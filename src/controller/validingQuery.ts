import {Columns, Filter, MComparison, Options, Order, Query, SComparison, Where} from "../interfaces/queryTypes";
import {InsightDataset, InsightError} from "./IInsightFacade";

export default class ValidatingQuery {
	private requireKeysDataset = ["uuid", "id", "title", "instructor","dept", "year", "avg", "pass", "fail", "audit"];
	private stringKeys = ["uuid", "id", "title", "instructor", "dept"];
	private numberKeys = ["year", "avg", "pass", "fail", "audit"];
	private columnsKeyList: string[] = [];
	private dataSetsAccessed: string[] = [];
	private datasets: InsightDataset[] = [];
	public validateQuery(query: Query, cKL: string[], dSA: string[], dataset: InsightDataset[]): boolean{
		if(!query){
			throw new InsightError("Query is null");
		}
		// if(Object.keys(query).length !== 2){
		// 	throw new InsightError("to many keys in the input layer");
		// }
		const allowedKeys = ["WHERE", "OPTIONS"];
		for (let key in query) {
			if (!allowedKeys.includes(key)) {
				throw new InsightError(`Invalid key found: ${key}. Only WHERE and OPTIONS are allowed.`);
			}
		}
		if(!cKL){
			throw new InsightError("columnsKeyList is null");
		} else {
			this.columnsKeyList = cKL;
		}
		if(!dSA){
			throw new InsightError("dataSetsAccessed is null");
		} else {
			this.dataSetsAccessed = dSA;
		}
		if(!dataset){
			throw new InsightError("dataset is null");
		} else {
			this.datasets = dataset;
		}
		if(!query.OPTIONS){
			throw new InsightError("OPTIONS is null");
		} else{
			this.checkOptions(query.OPTIONS);
		}
		if(!query.WHERE){
			throw new InsightError("BODY is null");
		} else {
			this.checkWhere(query.WHERE);
		}
		return true;
	}
	private checkWhere(where: Where): boolean {
		const keys = Object.keys(where);
		if (keys.length > 1) {
			throw new InsightError("A Where condition should have exactly one key");
		}

		const key = keys[0];
		if (!key) {
			return true;
		}

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
		this.checkKey(key, this.numberKeys);
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
		this.checkKey(key, this.stringKeys);
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


	private checkOptions(options: Options): void {
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
			this.checkKey(column, this.requireKeysDataset);
			this.columnsKeyList.push(column);
		});

		return true;
	}
	private checkOrder(order: Order): boolean {
		if (typeof order === "string") {
			this.checkKey(order, this.requireKeysDataset);
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
				this.checkKey(key, this.requireKeysDataset);
				if (!this.columnsKeyList.includes(key)) {
					throw new InsightError(`Order key ${key} not in columns`);
				}
			});
		} else {
			throw new InsightError("Invalid order type");
		}
		return true;
	}
	private checkKey(key: string, keys: string[]): boolean {
		let parts = key.split("_");

		if(parts.length !== 2){
			throw new InsightError("Key does not contain _");
		}

		if(key.includes(" ")){
			throw new InsightError("Key contains space");
		}

		let [datasetName, keyFromDataset] = parts;

		if(!keys.includes(keyFromDataset)){
			throw new InsightError(`Invalid key: ${keyFromDataset}`);
		}

		if(!this.datasetNameExists(datasetName)){
			throw new InsightError(`Dataset ${datasetName} does not exist`);
		}
		return true;
	}
	private datasetNameExists(datasetName: string): boolean {
		if (this.dataSetsAccessed.includes(datasetName)) {
			return true;
		}

		const existsInDatasets = this.datasets.some((dataset) => dataset.id === datasetName);
		if (existsInDatasets) {
			if (this.dataSetsAccessed.length > 0) {
				throw new InsightError("Cannot access more than 1 dataset");
			}

			this.dataSetsAccessed.push(datasetName);
			return true;
		}
		return false;
	}
}
