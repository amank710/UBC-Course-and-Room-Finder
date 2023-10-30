import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import * as fs from "fs-extra";
// import {Query} from "../interfaces/queryTypes";
import {
	CourseData,
	CourseSection,
	ExtractedContent,
	Sections,
	SectionsContainer
} from "../interfaces/datasetSectionsType";
import {Query} from "../interfaces/queryTypes";
import ValidatingQuery from "./validingQuery";
import GettingQuerySections from "./gettingQuerySections";
import AddingTheDataset from "./addingTheDataset";
import {ExtractedContentRooms, Rooms} from "../interfaces/datasetRoomsType";
import GettingQueryRooms from "./gettingQueryRooms";
import GettingTransformationsRooms from "./gettingTransformationsRooms";
import GettingTransformationsSections from "./gettingTransformationsSections";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: InsightDataset[] = [];
	constructor() {
		console.log("InsightFacadeImpl::init()");
		const baseDirPath = "./data";
		const sectionDir = `${baseDirPath}/Sections`;
		const roomDir = `${baseDirPath}/Rooms`;

		const readAndProcessFiles = (dirPath: string, datasetKind: InsightDatasetKind) => {
			if (fs.existsSync(dirPath)) {
				fs.readdirSync(dirPath).forEach((file) => {
					if (file.endsWith(".json")) {
						try {
							const datasetId = file.replace(".json", "");
							const filePath = `${dirPath}/${file}`;
							const data = fs.readJsonSync(filePath);

							let numRows = 0; // Initialize numRows as 0 (or as a number type)

							// Calculate numRows based on the dataset kind
							if (datasetKind === InsightDatasetKind.Sections) {
								numRows = Object.values(data)
									.map((content: any) => content.result.length)
									.reduce((a, b) => a + b, 0);
							} else if (datasetKind === InsightDatasetKind.Rooms) {
								numRows = Object.values(data).reduce((acc: number, building: any) => {
									if ((building as Rooms).rooms !== undefined) {
										return acc + (building as Rooms).rooms.length;
									}
									return acc;
								}, 0);
							}

							const dataset: InsightDataset = {
								id: datasetId,
								kind: datasetKind,
								numRows: numRows // This should now satisfy the expected type
							};

							this.datasets.push(dataset);
						} catch (err) {
							console.error(`Failed to load dataset from ${file}`, err);
						}
					}
				});
			}
		};

		readAndProcessFiles(sectionDir, InsightDatasetKind.Sections);
		readAndProcessFiles(roomDir, InsightDatasetKind.Rooms);
	}

	private requireKeysDataset = ["uuid", "id", "title", "instructor","dept", "year", "avg", "pass", "fail", "audit"];
	private requiredKeysFile = ["id","Course","Title","Professor","Subject","Year", "Avg", "Pass", "Fail", "Audit"];
	private columnsKeyList: string[] = [];
	private dataSetsAccessed: string[] = [];
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		let addingDataset = new AddingTheDataset();
		await addingDataset.add(id, content, kind, this.datasets);
		return Promise.resolve(this.datasets.map((dataset) => dataset.id));
	}

	public async removeDataset(id: string): Promise<string> {
		if (!this.isValidId(id)) {
			return Promise.reject(new InsightError("Invalid id"));
		}

		const datasetIndex = this.datasets.findIndex((dataset) => dataset.id === id);

		if (datasetIndex === -1) {
			return Promise.reject(new NotFoundError("Dataset ID has not been added"));
		}

		const baseDirPath = "./data";
		const sectionFilePath = `${baseDirPath}/Sections/${id}.json`;
		const roomFilePath = `${baseDirPath}/Rooms/${id}.json`;

		try {
			let fileRemoved = false;

			if (await fs.pathExists(sectionFilePath)) {
				await fs.unlink(sectionFilePath);
				fileRemoved = true;
			}

			if (await fs.pathExists(roomFilePath)) {
				await fs.unlink(roomFilePath);
				fileRemoved = true;
			}

			if (!fileRemoved) {
				console.warn(`File for ${id} does not exist on the disk, but the dataset is in the datasets array.`);
			}

			this.datasets.splice(datasetIndex, 1);
			return Promise.resolve(id);

		} catch (err) {
			return Promise.reject(new InsightError("Failed to remove dataset from disk. Error"));
		}
	}

	public isValidId(id: string): boolean {
		return !(!id || /^\s*$/.test(id) || id.includes("_"));
	}

	public async performQuery(query: Query): Promise<InsightResult[]> {
		let validating = new ValidatingQuery();
		this.columnsKeyList = [];
		this.dataSetsAccessed = [];
		let datasetKind: InsightDatasetKind | null = null;

		try {
			validating.validateQuery(query, this.columnsKeyList, this.dataSetsAccessed, this.datasets);

			const filteredDatasets = this.datasets.filter((dataset) => this.dataSetsAccessed.includes(dataset.id));
			if(filteredDatasets.length !== 1) {
				return Promise.reject(new InsightError("No dataset added or more than one dataset added"));
			}
			for (const dataset of this.datasets) {
				if (dataset.id === this.dataSetsAccessed[0]) {
					datasetKind = dataset.kind;
				}
			}
			if(datasetKind === null){
				return Promise.reject(new InsightError("Dataset kind is null"));
			}
			if(datasetKind === InsightDatasetKind.Sections){
				let result = await this.handleSectionsQuery(query);
				if(result && result.length > 5000){
					return Promise.reject(new ResultTooLargeError("Result too large"));
				} else {
					let gettingSections = new GettingQuerySections();
					return gettingSections.applyOptions(query, result);
				}
			} else if(datasetKind === InsightDatasetKind.Rooms){
				let result = await this.handleRoomsQuery(query);
				if(result && result.length > 5000){
					return Promise.reject(new ResultTooLargeError("Result too large"));
				} else {
					let gettingRooms = new GettingQueryRooms();
					return gettingRooms.applyOptions(query, result);
				}
			} else{
				return Promise.reject(new InsightError("Invalid dataset kind"));
			}
		} catch (error) {
			return Promise.reject(new InsightError("Error occurred"));
		}
	}

	public async handleSectionsQuery(query: Query) {
		const readPromises = this.dataSetsAccessed.map(async (datasetId) => {
			const filePath = `./data/Sections/${datasetId}.json`;
			const data: ExtractedContent = await fs.readJson(filePath);
			return data;
		});
		const datasetsContents: ExtractedContent[] = await Promise.all(readPromises);
		let gettingSections = new GettingQuerySections();
		let filteredData =  gettingSections.applyWhere(query, datasetsContents);
		let newFilteredData = this.convertingData(filteredData);
		if(query.TRANSFORMATIONS === undefined){
			return this.transformToInsightResultSections(newFilteredData);
		}
		let transformingSections = new GettingTransformationsSections();
		let groupedData = transformingSections.groupResults(newFilteredData, query);
		return transformingSections.ApplyTransformations(query, groupedData, this.columnsKeyList);
	}

	public async handleRoomsQuery(query: Query) {
		const readPromises = this.dataSetsAccessed.map(async (datasetId) => {
			const filePath = `./data/Rooms/${datasetId}.json`;
			const data: ExtractedContentRooms = await fs.readJson(filePath);
			return data;
		});
		const datasetsContents: ExtractedContentRooms[] = await Promise.all(readPromises);
		let gettingRooms = new GettingQueryRooms();
		let filteredData = gettingRooms.applyWhere(query, datasetsContents);
		if(query.TRANSFORMATIONS === undefined){
			return this.transformToInsightResultRooms(filteredData);
		}
		let transformingRooms = new GettingTransformationsRooms();
		let groupedData = transformingRooms.groupResults(filteredData, query);
		return transformingRooms.ApplyTransformations(query, groupedData, this.columnsKeyList); // or further processing if needed
	}

	private transformToInsightResultSections(filteredData: any[]): InsightResult[] {
		let insightResults: InsightResult[] = [];
		for (const data of filteredData) {
			let insightResult: InsightResult = {};
			for (const key of this.columnsKeyList) {
				const newKey = this.mapToNewKey(key.split("_")[1]);
				if (newKey !== null) {
					insightResult[key] = data[newKey];
				}
			}
			insightResults.push(insightResult);
		}
		return insightResults;
	}

	private transformToInsightResultRooms(filteredData: any[]): InsightResult[] {
		let insightResults: InsightResult[] = [];
		for (const data of filteredData) {
			let insightResult: InsightResult = {};
			for (const key of this.columnsKeyList) {
				insightResult[key] = data[key.split("_")[1]];
			}
			insightResults.push(insightResult);
		}
		return insightResults;
	}

	private convertingData(filteredData: SectionsContainer[]): Sections[] {
		const sectionsResults: any[] = [];

		for (const data of filteredData) {
			if (data.section) {
				sectionsResults.push(data.section);
			}
		}

		return sectionsResults as Sections[];
	}

	private mapToNewKey(fromKey: string): string|null {
		const index = this.requireKeysDataset.indexOf(fromKey);
		if (index === -1) {
			return null;
		}
		return this.requiredKeysFile[index];
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}
}
