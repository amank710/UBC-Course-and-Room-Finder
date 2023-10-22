import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError,
} from "./IInsightFacade";
import JSZip from "jszip";
import * as fs from "fs-extra";
// import {Query} from "../interfaces/queryTypes";
import {ExtractedContent} from "../interfaces/datasetSectionsType";
import {Query} from "../interfaces/queryTypes";
import ValidatingQuery from "./validingQuery";
import GettingQuery from "./gettingQuery";
import AddingTheDataset from "./addingTheDataset";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
		const dirPath = "./data";
		if (fs.existsSync(dirPath)) {
			fs.readdirSync(dirPath).forEach((file) => {
				if (file.endsWith(".json")) {
					try {
						const datasetId = file.replace(".json", "");
						const filePath = `${dirPath}/${file}`;
						const data = fs.readJsonSync(filePath);
						const numRows = Object.values(data)
							.map((content: any) => content.result.length)
							.reduce((a, b) => a + b, 0);
						const dataset: InsightDataset = {
							id: datasetId,
							kind: InsightDatasetKind.Sections,
							numRows: numRows,
						};
						this.datasets.push(dataset);
					} catch (err) {
						console.error(`Failed to load dataset from ${file}`, err);
					}
				}
			});
		}
	}

	private datasets: InsightDataset[] = [];
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

		const dirPath = "./data";
		const filePath = `${dirPath}/${id}.json`;

		try {
			if (await fs.pathExists(filePath)) {
				await fs.unlink(filePath);
			} else {
				console.warn(`File ${filePath} does not exist on the disk, but the dataset is in the datasets array.`);
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
		let getting = new GettingQuery();
		this.columnsKeyList = [];
		this.dataSetsAccessed = [];

		try {
			validating.validateQuery(query, this.columnsKeyList, this.dataSetsAccessed, this.datasets);

			const filteredDatasets = this.datasets.filter((dataset) => this.dataSetsAccessed.includes(dataset.id));

			const readPromises = this.dataSetsAccessed.map(async (datasetId) => {
				const filePath = `./data/${datasetId}.json`;
				const data: ExtractedContent = await fs.readJson(filePath);
				return data;
			});
			const datasetsContents: ExtractedContent[] = await Promise.all(readPromises);

			let result = getting.applyWhere(query, datasetsContents);
			if(result && result.length > 5000){
				return Promise.reject(new ResultTooLargeError("Result too large"));
			}
			return getting.applyOptions(query, result);

		} catch (error) {
			return Promise.reject(new InsightError("Error occurred"));
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}
}
