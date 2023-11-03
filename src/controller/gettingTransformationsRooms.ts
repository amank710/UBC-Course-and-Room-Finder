import {ApplyTokenWithKey, Query} from "../interfaces/queryTypes";
import {InsightError, InsightResult} from "./IInsightFacade";
import {Room} from "../interfaces/datasetRoomsType";
import Decimal from "decimal.js";


export default class GettingTransformationsRooms {
	private requireKeysDataset = ["fullname", "shortname", "number", "name",
		"address", "type", "furniture", "href", "lat", "lon", "seats"];

	private stringKeys = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private numberKeys = ["lat", "lon", "seats"];
	public groupResults(data: Room[], query: Query): {[key: string]: Room[]} {
		const groupKeys = query.TRANSFORMATIONS?.GROUP || [];

		const groupedData: {[key: string]: Room[]} = {};
		for (const room of data) {
			const groupKeyComponents = groupKeys.map((key) => {
				return room[key as keyof Room];
			});
			const groupKey = groupKeys.map((key) => {
				const actualKey = key.split("_")[1];
				return room[actualKey as keyof Room];
			}).join("-");
			if (!groupedData[groupKey]) {
				groupedData[groupKey] = [];
			}
			groupedData[groupKey].push(room);
		}
		return groupedData;
	}

	// Most of the code for apply functions if from ChatGPT
	public ApplyTransformations(
		query: Query,
		groupedData: {[p: string]: Room[]},
		columnsKeyList: string[]
	): InsightResult[] {
		const results: InsightResult[] = [];
		const tempResults: {[key: string]: InsightResult} = {};
		const extractKey = (key: string) => key.split("_")[1];
		let APPLY = query.TRANSFORMATIONS?.APPLY;

		if (!APPLY || APPLY.length === 0) {
			// Handle the case when APPLY is not defined or empty
			// Format the results without any transformations
			this.formatResultsWithoutApply(groupedData, results, columnsKeyList);
		} else {
			// Handle APPLY transformations
			for (const applyRule of APPLY) {
				for (const applyKey in applyRule) {
					const token: ApplyTokenWithKey = applyRule[applyKey];
					this.handleToken(token, groupedData, tempResults, extractKey, applyKey, columnsKeyList);
				}
			}

			// Move all temp results to the results array
			for (const key in tempResults) {
				results.push(tempResults[key]);
			}
		}

		return results;
	}

	private handleToken(
		token: ApplyTokenWithKey,
		groupedData: {[key: string]: Room[]},
		tempResults: {[key: string]: InsightResult} = {},
		extractKeyFn: (key: string) => string,
		applyKey: string,
		columnsKeyList: string[]
	): void {
		const aggregatorMap: {[key: string]: (values: number[]) => number | string} = {
			MAX: (values) => Math.max(...values),
			MIN: (values) => Math.min(...values),
			AVG: (values) => {
				const decimals = values.map((num) => new Decimal(num));
				const total = decimals.reduce((acc, val) => acc.add(val), new Decimal(0));
				let avg = total.toNumber() / values.length;
				return Number(avg.toFixed(2));
			},
			SUM: (values) => parseFloat(values.reduce((acc, val) => acc + val, 0).toFixed(2)),
			COUNT: (values) => new Set(values).size,
		};

		for (const groupKey in groupedData) {
			const aggregator = aggregatorMap[Object.keys(token)[0]];
			if (aggregator) {
				this.handleCommonAggregations(token, groupedData, tempResults,
					extractKeyFn, applyKey, groupKey, columnsKeyList, aggregator);
			} else {
				throw new InsightError("Invalid apply token");
			}
		}
	}

	private handleCommonAggregations(
		token: ApplyTokenWithKey,
		groupedData: {[key: string]: Room[]},
		tempResults: {[key: string]: InsightResult},
		extractKeyFn: (key: string) => string,
		applyKey: string,
		groupKey: string,
		columnsKeyList: string[],
		aggregator: (values: number[]) => number | string
	): void {
		if (token) {
			const actualKey = extractKeyFn(Object.values(token)[0]);

			const aggregatedValue = aggregator(
				groupedData[groupKey].map((room) => room[actualKey as keyof Room] as unknown as number)
			);

			// Check if an existing result for the same groupKey exists
			let result = tempResults[groupKey];
			if (!result) {
				result = {};
				tempResults[groupKey] = result;
			}

			// Calculate aggregated value
			result[applyKey] = aggregatedValue;

			// Include additional data fields from the first object in each groupedData[groupKey]
			const firstObject = groupedData[groupKey][0];
			for (const columnKey of columnsKeyList) {
				if (!columnKey.includes("_")) {
					continue;  // Skip to the next iteration if underscore is not present
				}

				const keyToUse = columnKey.split("_")[1];
				const value = firstObject[keyToUse as keyof Room];
				if (typeof value === "string" || typeof value === "number") {
					result[columnKey] = value;
				} else {
					// Handle the case where value is not string or number
					throw new InsightError(`Unexpected type for ${keyToUse}`);
				}
			}
		}
	}

	private formatResultsWithoutApply(
		groupedData: {[key: string]: Room[]},
		results: InsightResult[],
		columnsKeyList: string[]
	): void {
		for (const groupKey in groupedData) {
			const result: InsightResult = {};
			const firstObject = groupedData[groupKey][0];
			for (const columnKey of columnsKeyList) {
				const keyToUse = columnKey.includes("_") ? columnKey.split("_")[1] : columnKey;
				const value = firstObject[keyToUse as keyof Room];
				if (typeof value === "string" || typeof value === "number") {
					result[columnKey] = value;
				} else {
					throw new InsightError(`Unexpected type for ${keyToUse}`);
				}
			}
			results.push(result);
		}
	}

}
