import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";
// import {Query} from "../interfaces/queryTypes";
import {ExtractedContent} from "../interfaces/datasetType";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}
	private datasets: InsightDataset[] = [];
	// private datasets: Map<string, unknown> = new Map();
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.isValidId(id)) {
			return Promise.reject(new InsightError("Invalid id"));
		}

		if (this.datasets.find((dataset) => dataset.id === id)) {
			return Promise.reject(new InsightError("Dataset ID already exists"));
		}


		let extractedContent;
		try {
			extractedContent = await this.extractFromZip(content);

			if (!this.checkTheExtracted(extractedContent)) {
				return Promise.reject(new InsightError("The dataset is not valid zip file"));
			}
		} catch (error) {
			return Promise.reject(new InsightError("Failed to extract content from ZIP"));
		}

		if (kind !== InsightDatasetKind.Sections) {
			return Promise.reject(new InsightError("Is not of kind Sections"));
		}
		let numRows = 0;

		for (let coursePath in extractedContent) {
			numRows += extractedContent[coursePath].result.length;
		}
		const newDataset: InsightDataset = {
			id: id,
			kind: kind,
			numRows: numRows,
		};
		this.datasets.push(newDataset);

		return Promise.resolve(this.datasets.map((dataset) => dataset.id));
	}

	private async extractFromZip(content: string): Promise<ExtractedContent> {
		const zip = new JSZip();
		const structuredContent: ExtractedContent = {};

		try {
			await zip.loadAsync(content, {base64: true});
		} catch (e) {
			return Promise.reject(new InsightError("Failed to load ZIP"));
		}
		if (!Object.keys(zip.files).length) {
			return Promise.reject(new InsightError("The zip file is empty"));
		}
		let foundCourses = false;
		const files = zip.files;
		const loadingPromises = [];

		for (const fileName in files) {
			const file = files[fileName];

			if (!fileName.includes("/") && fileName !== "courses") {
				return Promise.reject(new InsightError(`Unexpected file/folder at the root of the ZIP: ${fileName}`));
			}

			if (fileName.startsWith("courses")) {
				foundCourses = true;
				if (!file.dir) {
					const promise = file.async("text").then((section) => {
						try {
							const parsedContent = JSON.parse(section);
							if (parsedContent.result) {
								structuredContent[fileName] = parsedContent;
							}
						} catch (e) {
							throw new InsightError(`Failed to parse content for file: ${fileName}`);
						}
					});

					loadingPromises.push(promise);
				}
			}
		}

		await Promise.all(loadingPromises);

		if (!foundCourses) {
			return Promise.reject(new InsightError("The ZIP does not contain a 'courses' file or folder at its root."));
		}

		return structuredContent;
	}
	private checkTheExtracted(extractedContent: ExtractedContent): boolean {
		const requiredKeys = ["id", "Course", "Title", "Professor", "Subject", "Year", "Avg", "Pass", "Fail", "Audit"];

		let hasValidSection = false;
		for (const coursePath in extractedContent) {
			const courseData = extractedContent[coursePath];
			for (const section of courseData.result) {
				if (requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(section, key))) {
					hasValidSection = true;
					break;
				}
			}
			if (hasValidSection) {
				break;
			}
		}

		return hasValidSection;
	}

	public removeDataset(id: string): Promise<string> {
		if (!this.isValidId(id)) {
			return Promise.reject(new InsightError("Invalid id"));
		}
		const datasetIndex = this.datasets.findIndex((dataset) => dataset.id === id);

		if (datasetIndex === -1) {
			return Promise.reject(new NotFoundError("Dataset ID has not been added"));
		} else {
			this.datasets.splice(datasetIndex, 1);
			return Promise.resolve(id);
		}
	}

	public isValidId(id: string): boolean {
		return !(!id || /^\s*$/.test(id) || id.includes("_"));
	}
	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}
}
