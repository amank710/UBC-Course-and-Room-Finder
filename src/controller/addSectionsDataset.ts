import {ExtractedContent} from "../interfaces/datasetSectionsType";
import JSZip from "jszip";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs-extra";
export default class AddingTheSectionsDataset {
	private requiredSectionKeys = ["id","Course","Title","Professor","Subject","Year", "Avg", "Pass", "Fail", "Audit"];
	public async addSectionsDataset(id: string, content: string, kind: InsightDatasetKind, datasets: InsightDataset[]){
		let extractedContent;
		try {
			extractedContent = await this.extractFromZipSections(content);

			if (!this.checkTheExtractedSections(extractedContent)) {
				return Promise.reject(new InsightError("The dataset is not valid zip file"));
			}
		} catch (error) {
			return Promise.reject(new InsightError("Failed to extract content from ZIP"));
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
		try{
			const dirPath = "./data";
			if (!fs.existsSync(dirPath)) {
				await fs.mkdir(dirPath);
			}
			datasets.push(newDataset);
			const filePath = `${dirPath}/${id}.json`;
			await fs.writeJson(filePath, extractedContent);
		} catch (err) {
			return Promise.reject(new InsightError("Failed to write dataset to disk"));
		}
		return Promise.resolve();
	}

	private async extractFromZipSections(content: string): Promise<ExtractedContent> {
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

	private checkTheExtractedSections(extractedContent: ExtractedContent): boolean {
		let hasValidSection = false;
		for (const coursePath in extractedContent) {
			if (Object.prototype.hasOwnProperty.call(extractedContent, coursePath)) {
				const courseData = extractedContent[coursePath];
				for (const section of courseData.result) {
					if (section.Section && section.Section === "overall") {
						section.Year = "1900"; // Modify the Year directly in extractedContent
					}
					if (this.requiredSectionKeys.every((key) => Object.prototype.hasOwnProperty.call(section, key))) {
						hasValidSection = true;
					}
				}
			}
		}
		return hasValidSection;
	}
}
