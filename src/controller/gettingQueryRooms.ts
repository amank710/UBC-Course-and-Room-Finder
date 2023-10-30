import {Columns, Filter, MComparison, Order, Query, SComparison, Where} from "../interfaces/queryTypes";
import {InsightResult} from "./IInsightFacade";
import {ExtractedContentRooms, Room, Rooms} from "../interfaces/datasetRoomsType";


export default class GettingQueryRooms {
	private requireKeysDataset = ["fullname", "shortname", "number", "name",
		"address", "type", "furniture", "href", "lat", "lon", "seats"];

	private stringKeys = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private numberKeys = ["lat", "lon", "seats"];
	public applyWhere(query: Query, dataset: ExtractedContentRooms[]): Room[] {
		const whereClause = query.WHERE;

		if (Object.keys(whereClause).length === 0) {
			return this.flattenResults(dataset);
		}

		const flattenedResults = this.flattenResults(dataset);

		let filteredResults: Room[] = [];

		for (const room of flattenedResults) {
			if (this.satisfiesCondition(room, whereClause)) {
				filteredResults.push(room);
			}
		}

		return filteredResults;
	}

	private flattenResults(dataset: ExtractedContentRooms[]): Room[] {
		let allRooms: Room[] = [];
		for (const data of dataset) {
			for (const building in data) {
				if (Object.prototype.hasOwnProperty.call(data, building)) {
					const roomsData: Rooms = data[building];
					if (roomsData.rooms && Array.isArray(roomsData.rooms) && roomsData.rooms.length > 0) {
						allRooms = allRooms.concat(roomsData.rooms);
					}
				}
			}
		}
		return allRooms;
	}

	private satisfiesCondition(record: Room, condition: Where): boolean {
		if(!record){
			console.log("record is null");
			return false;
		}
		if (condition.AND) {
			return condition.AND.every((subCondition) => this.satisfiesCondition(record, subCondition));
		} else if (condition.OR) {
			return condition.OR.some((subCondition) => this.satisfiesCondition(record, subCondition));
		} else if (condition.NOT) {
			return !this.satisfiesCondition(record, condition.NOT);
		} else {
			return this.satisfiesComparison(record, condition);
		}
	}

	private satisfiesComparison(record: Room, comparison: Filter): boolean {
		if ("GT" in comparison && comparison.GT) {
			return this.satisfiesGT(record, comparison.GT);
		}
		if ("LT" in comparison && comparison.LT) {
			return this.satisfiesLT(record, comparison.LT);
		}
		if ("EQ" in comparison && comparison.EQ) {
			return this.satisfiesEQ(record, comparison.EQ);
		}
		if ("IS" in comparison && comparison.IS) {
			return this.satisfiesIS(record, comparison.IS);
		}

		return false;
	}

	private satisfiesGT(item: Room, comparison: MComparison): boolean {
		const [key, value] = Object.entries(comparison)[0];
		const keyPart = key.split("_")[1];
		const mappedKey = this.mapKey(keyPart);
		const itemValue = item[mappedKey as keyof Room];

		if (itemValue === undefined || itemValue === null) {
			throw new Error(`Value for ${mappedKey} is undefined or null`);
		}

		const numValue = Number(itemValue);

		if (isNaN(numValue)) {
			throw new Error(`Value for ${mappedKey} is not a number`);
		}
		return numValue > value;
	}

	private satisfiesLT(item: Room, comparison: MComparison): boolean {
		const [key, value] = Object.entries(comparison)[0];
		const keyPart = key.split("_")[1];
		const mappedKey = this.mapKey(keyPart);
		const itemValue = item[mappedKey as keyof Room];

		if (itemValue === undefined || itemValue === null) {
			throw new Error(`Value for ${mappedKey} is undefined or null`);
		}

		const numValue = Number(itemValue);

		if (isNaN(numValue)) {
			throw new Error(`Value for ${mappedKey} is not a number`);
		}

		const numericComparisonValue = Number(value);
		if (isNaN(numericComparisonValue)) {
			throw new Error(`Comparison value ${value} is not a number`);
		}
		return numValue < numericComparisonValue;
	}


	private satisfiesEQ(item: Room, comparison: MComparison): boolean {
		const [key, value] = Object.entries(comparison)[0];
		const keyPart = key.split("_")[1];
		const mappedKey = this.mapKey(keyPart);
		const itemValue = item[mappedKey as keyof Room];

		if (itemValue === undefined || itemValue === null) {
			throw new Error(`Value for ${mappedKey} is undefined or null`);
		}

		if (typeof itemValue === "number") {
			const numericComparisonValue = Number(value);
			if (isNaN(numericComparisonValue)) {
				throw new Error(`Comparison value ${value} is not a number`);
			}
			return itemValue === numericComparisonValue;
		} else if (typeof itemValue === "string") {
			return itemValue === String(value);
		} else {
			throw new Error(`Unexpected type for ${mappedKey}: ${typeof itemValue}`);
		}
	}

	private satisfiesIS(item: Room, comparison: SComparison): boolean {
		const [key, value] = Object.entries(comparison)[0];
		const keyPart = key.split("_")[1];
		const mappedKey = this.mapKey(keyPart);
		const itemValue = String(item[mappedKey as keyof Room]);
		if (value.startsWith("*") && value.endsWith("*")) {
			const actualString = value.slice(1, -1);
			return itemValue.includes(actualString);
		} else if (value.startsWith("*")) {
			const actualString = value.slice(1);
			return itemValue.endsWith(actualString);
		} else if (value.endsWith("*")) {
			const actualString = value.slice(0, -1);
			return itemValue.startsWith(actualString);
		} else {
			return itemValue === value;
		}
	}


	public applyOptions(query: Query, result: InsightResult[]): InsightResult[] {
		const options = query.OPTIONS;

		const selectedResults: InsightResult[] = (result).map((item: InsightResult) =>
			this.applyColumns(item, options.COLUMNS)
		);

		const augmentedResults = selectedResults.map((el, idx) => ({...el, originalIdx: idx}));

		if (options.ORDER) {
			const orderedResults = this.applyOrder(augmentedResults, options.ORDER);
			return orderedResults.map(({originalIdx, ...rest}) => rest);
		}

		return selectedResults;
	}


	private applyOrder(result: InsightResult[], order: Order | string): InsightResult[] {
		if (typeof order === "string") {
			return result.sort((a, b) => {
				const valA = a[order];
				const valB = b[order];

				if (typeof valA === "number" && typeof valB === "number") {
					if (valA !== valB) {
						return valA - valB;
					}
				} else if (typeof valA === "string" && typeof valB === "string") {
					const comparison = valA.localeCompare(valB);
					if (comparison !== 0) {
						return comparison;
					}
				}

				return (a as any).originalIdx - (b as any).originalIdx;
			});
		} else {
			const {dir, keys} = order;
			const directionMultiplier = dir === "UP" ? 1 : -1;
			return result.sort((a, b) => {
				for (const key of keys) {
					const valA = a[key];
					const valB = b[key];

					if (typeof valA === "number" && typeof valB === "number") {
						if (valA !== valB) {
							return (valA - valB) * directionMultiplier;
						}
					} else if (typeof valA === "string" && typeof valB === "string") {
						const comparison = valA.localeCompare(valB);
						if (comparison !== 0) {
							return comparison * directionMultiplier;
						}
					}
				}
				return (a as any).originalIdx - (b as any).originalIdx;
			});
		}
	}

	private applyColumns(record: InsightResult, columns: string[]): InsightResult {
		const selectedRecord: InsightResult = {};

		for (const column of columns) {
			const {keyPart, mappedKey} = this.extractKeys(column);
			this.applySelectedColumn(record, selectedRecord, column, keyPart, mappedKey);
		}

		return selectedRecord;
	}

	private extractKeys(column: string): {keyPart: string, mappedKey: string | undefined} {
		let keyPart = column.includes("_") ? column.split("_")[1] : column;
		let mappedKey;
		if (column.includes("_")) {
			mappedKey = this.mapKey(keyPart);
		} else {
			mappedKey = keyPart;
		}
		return {keyPart, mappedKey: mappedKey || undefined};

	}

	private applySelectedColumn(
		record: InsightResult,
		selectedRecord: InsightResult,
		column: string,
		keyPart: string,
		mappedKey: string | undefined
	): void {
		if (!mappedKey || !Object.prototype.hasOwnProperty.call(record, column)) {
			console.error(`Invalid column: ${column}`);
			return;
		}

		let value = record[column];
		if (this.stringKeys.includes(mappedKey)) {
			value = this.convertAndValidateType(value, "string");
		} else if (this.numberKeys.includes(mappedKey)) {
			value = this.convertAndValidateType(value, "number");
		}

		if (value !== null) {
			selectedRecord[column] = value;
		}
	}

	private convertAndValidateType(value: any, expectedType: "string" | "number"): any {
		if (typeof value !== expectedType) {
			try {
				value = expectedType === "number" ? Number(value) : String(value);
			} catch (e) {
				console.error(`Failed to convert to ${expectedType}: ${e}`);
				return null;
			}
		}

		if (typeof value !== expectedType) {
			console.error(`TypeErr: Expected:${expectedType}, got:${typeof value}.`);
			return null;
		}

		return value;
	}

	private mapKey(fromKey: string): string | null {
		const index = this.requireKeysDataset.indexOf(fromKey);
		if (index === -1) {
			return null;
		}
		return this.requireKeysDataset[index];
	}

	public groupResults(data: Room[], query: Query): {[key: string]: Room[]} {
		// This assumes the structure of the query object. Modify it according to your actual query structure.
		const groupKeys: string[] = query.TRANSFORMATIONS?.GROUP || [];
		const groupedData: {[key: string]: Room[]} = {};

		for (const room of data) {
			// Construct the group key
			let groupKey = groupKeys.map((key) => {
				return room[key as keyof Room];
			}).join("-");

			// Initialize the group array if not already
			if (!groupedData[groupKey]) {
				groupedData[groupKey] = [];
			}
			// Add the current room to its group
			groupedData[groupKey].push(room);
		}
		return groupedData;
	}
}
