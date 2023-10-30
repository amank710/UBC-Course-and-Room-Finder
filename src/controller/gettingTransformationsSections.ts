import {ApplyTokenWithKey, Query} from "../interfaces/queryTypes";
import {InsightError, InsightResult} from "./IInsightFacade";
import {Sections} from "../interfaces/datasetSectionsType";
import Decimal from "decimal.js";

export default class GettingTransformationsSections {
	private requireKeysDataset = ["uuid", "id", "title", "instructor","dept", "year", "avg", "pass", "fail", "audit"];
	private requiredKeysFile = ["id","Course","Title","Professor","Subject","Year", "Avg", "Pass", "Fail", "Audit"];
	public groupResults(data: Sections[], query: Query): {[key: string]: Sections[]} {
		const groupKeys = query.TRANSFORMATIONS?.GROUP || [];

		const groupedData: {[key: string]: Sections[]} = {};
		for (const section of data) {
			const groupKeyComponents = groupKeys.map((key) => {
				return section[key as keyof Sections];
			});
			const groupKey = groupKeys.map((key) => {
				const actualKey = key.split("_")[1];
				const mappedKey = this.mapKey(actualKey);
				return section[mappedKey as keyof Sections];
			}).join("-");
			if (!groupedData[groupKey]) {
				groupedData[groupKey] = [];
			}
			groupedData[groupKey].push(section);
		}
		return groupedData;
	}

	// Most of the code for apply functions if from ChatGPT
	public ApplyTransformations(
		query: Query,
		groupedData: {[p: string]: Sections[]},
		columnsKeyList: string[]
	): InsightResult[] {
		let APPLY;
		if (query.TRANSFORMATIONS) {
			APPLY = query.TRANSFORMATIONS.APPLY;
		}
		const results: InsightResult[] = [];
		const extractKey = (key: string) => key.split("_")[1];
		if(APPLY){
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
		}
		return results;
	}

	private handleToken(
		token: ApplyTokenWithKey,
		groupedData: {[key: string]: Sections[]},
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
		groupedData: {[key: string]: Sections[]},
		results: InsightResult[],
		extractKeyFn: (key: string) => string,
		applyKey: string,
		groupKey: string,
		columnsKeyList: string[],
		aggregator: (values: number[]) => number | string
	): void {
		if (token) {
			const actualKey = extractKeyFn(Object.values(token)[0]);
			const mappedKey1 = this.mapKey(actualKey);
			const result: InsightResult = {};

			// Calculate aggregated value
			result[applyKey] = aggregator(
				groupedData[groupKey].map((section) =>
					section[mappedKey1 as keyof Sections] as unknown as number)
			);

			// Include additional data fields from the first object in each groupedData[groupKey]
			const firstObject = groupedData[groupKey][0];
			for (const columnKey of columnsKeyList) {
				if (!columnKey.includes("_")) {
					continue;  // Skip to the next iteration if underscore is not present
				}

				const keyToUse = columnKey.split("_")[1];
				const mappedKey = this.mapKey(keyToUse);
				const value = firstObject[mappedKey as keyof Sections];
				if (typeof value === "string" || typeof value === "number") {
					result[columnKey] = value;
				} else {
					// Handle the case where value is not string or number
					throw new InsightError(`Unexpected type for ${mappedKey}`);
				}
			}

			// Push the result object to results array
			results.push(result);
		}
	}

	private mapKey(fromKey: string): string | null {
		const index = this.requireKeysDataset.indexOf(fromKey);
		if (index === -1) {
			return null;
		}
		return this.requiredKeysFile[index];
	}

}
