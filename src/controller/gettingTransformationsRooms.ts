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
		const APPLY = query.TRANSFORMATIONS!.APPLY;
		const results: InsightResult[] = [];
		const extractKey = (key: string) => key.split("_")[1];

		for (const applyRule of APPLY) {
			// Enforce that apply rule should only have 1 key
			if (Object.keys(applyRule).length !== 1) {
				throw new Error("Each apply rule should only have one key.");
			}

			for (const applyKey in applyRule) {
				const token: ApplyTokenWithKey = applyRule[applyKey];
				this.handleToken(token, groupedData, results, extractKey, applyKey, columnsKeyList);
			}
		}

		return results;
	}

	private handleToken(
		token: ApplyTokenWithKey,
		groupedData: {[key: string]: Room[]},
		results: InsightResult[],
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
				this.handleCommonAggregations(token, groupedData,
					results, extractKeyFn, applyKey, groupKey, columnsKeyList, aggregator);
			} else {
				throw new InsightError("Invalid apply token");
			}
		}
	}

	private handleCommonAggregations(
		token: ApplyTokenWithKey,
		groupedData: {[key: string]: Room[]},
		results: InsightResult[],
		extractKeyFn: (key: string) => string,
		applyKey: string,
		groupKey: string,
		columnsKeyList: string[],
		aggregator: (values: number[]) => number | string
	): void {
		if (token) {
			const actualKey = extractKeyFn(Object.values(token)[0]);
			const result: InsightResult = {};

			// Calculate aggregated value
			result[applyKey] = aggregator(
				groupedData[groupKey].map((room) => room[actualKey as keyof Room] as unknown as number)
			);

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

			// Push the result object to results array
			results.push(result);
		}
	}

}
