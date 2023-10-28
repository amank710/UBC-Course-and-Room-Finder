import {Columns, Filter, MComparison, Options, Order, Query, SComparison, Where} from "../interfaces/queryTypes";
import {InsightDataset, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import {ExtractedContentRooms, Rooms, Room} from "../interfaces/datasetRoomsType";


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


	public applyOptions(query: Query, result: Room[]): InsightResult[] {
		const options = query.OPTIONS;

		const selectedResults: InsightResult[] = result.map((room) =>
			this.applyColumns(room, options.COLUMNS)
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

	private applyColumns(record: Room, columns: Columns): InsightResult {
		const selectedRecord: InsightResult = {};
		for (const column of columns) {
			const keyPart = column.split("_")[1];
			const mappedKey = this.mapKey(keyPart);

			if (mappedKey && mappedKey in record) {
				let value = record[mappedKey];

				if (this.stringKeys.includes(mappedKey)) {
					if (typeof value !== "string") {
						try {
							value = String(value);
						} catch (e) {
							console.error(`Failed to convert ${mappedKey} to string: ${e}`);
						}
					}

					if (typeof value === "string") {
						selectedRecord[column] = value;
					} else {
						console.error(`TypeErr: ${mappedKey}. Exp:str, got:${typeof value}.`);
					}
				} else if (this.numberKeys.includes(mappedKey)) {
					if (typeof value !== "number") {
						try {
							value = Number(value);
						} catch (e) {
							console.error(`Failed to convert ${mappedKey} to number: ${e}`);
						}
					}

					if (typeof value === "number") {
						selectedRecord[column] = value;
					} else {
						console.error(`TypeErr: ${mappedKey}. Exp:num, got:${typeof value}.`);
					}
				}
			} else {
				console.error(`Invalid column: ${column}`);
			}
		}
		return selectedRecord;
	}

	private mapKey(fromKey: string): string | null {
		const index = this.requireKeysDataset.indexOf(fromKey);
		if (index === -1) {
			return null;
		}
		return this.requireKeysDataset[index];
	}
}
