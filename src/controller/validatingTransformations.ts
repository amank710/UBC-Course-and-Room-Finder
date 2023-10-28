import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {ApplyRule, Transformations} from "../interfaces/queryTypes";

export default class ValidatingTransformations {
	private datasets: InsightDataset[];
	private dataSetsAccessed: string[];
	private appliedKeys: Set<string>;  // A set to keep track of keys used in APPLY
	private datasetKind: InsightDatasetKind | null = null;

	constructor(datasets: InsightDataset[] = [], dataSetsAccessed: string[] = []) {
		this.datasets = datasets;
		this.dataSetsAccessed = dataSetsAccessed;
		this.appliedKeys = new Set<string>();
	}

	private stringKeysSections = ["uuid", "id", "title", "instructor", "dept"];
	private numberKeysSections = ["year", "avg", "pass", "fail", "audit"];
	private stringKeysRooms = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
	private numberKeysRooms = ["lat", "lon", "seats"];

	private applyTokens = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

	public checkTransformations(transformations: Transformations): Set<string> {
		if (!transformations) {
			throw new InsightError("TRANSFORMATIONS is missing");
		}

		const {GROUP, APPLY} = transformations;

		if (!GROUP || !Array.isArray(GROUP) || GROUP.length === 0) {
			throw new InsightError("Invalid GROUP in TRANSFORMATIONS");
		}

		GROUP.forEach((key: string) => this.checkKey(key));

		if (!APPLY || !Array.isArray(APPLY)) {
			throw new InsightError("Invalid APPLY in TRANSFORMATIONS");
		}

		APPLY.forEach((applyRule: ApplyRule) => this.checkApplyRule(applyRule));

		return this.appliedKeys;
	}

	private checkKey(key: string): boolean {
		const parts = key.split("_");

		if (parts.length !== 2) {
			throw new InsightError("Invalid KEY format");
		}

		const [datasetName, field] = parts;

		if (!this.datasetNameExists(datasetName)) {
			throw new InsightError(`Dataset ${datasetName} does not exist`);
		}
		if(this.datasetKind !== null && this.datasetKind === InsightDatasetKind.Sections){
			if (!this.stringKeysSections.includes(field) && !this.numberKeysSections.includes(field)) {
				throw new InsightError(`Invalid field: ${field}`);
			}
		} else if(this.datasetKind !== null && this.datasetKind === InsightDatasetKind.Rooms){
			if (!this.stringKeysRooms.includes(field) && !this.numberKeysRooms.includes(field)) {
				throw new InsightError(`Invalid field: ${field}`);
			}
		} else {
			throw new InsightError("Invalid dataset kind");
		}
		return true;
	}

	private checkApplyRule(applyRule: ApplyRule): boolean {
		if (Object.keys(applyRule).length !== 1) {
			throw new InsightError("Invalid APPLYRULE format");
		}

		const applyKey = Object.keys(applyRule)[0];
		if (this.appliedKeys.has(applyKey)) {
			throw new InsightError(`Duplicate APPLY key: ${applyKey}`);
		}
		this.appliedKeys.add(applyKey);

		const applyTokenObj = applyRule[applyKey] as {[token: string]: string};
		const applyToken = Object.keys(applyTokenObj)[0];
		const key = applyTokenObj[applyToken];

		if (!applyKey || !applyToken || !key) {
			throw new InsightError("Invalid APPLYRULE");
		}

		if (!this.applyTokens.includes(applyToken)) {
			throw new InsightError(`Invalid APPLYTOKEN: ${applyToken}`);
		}

		this.checkKey(key);

		return true;
	}

	private datasetNameExists(datasetName: string): boolean {
		if (this.dataSetsAccessed.includes(datasetName)) {
			for (const dataset of this.datasets) {
				if (dataset.id === datasetName) {
					this.datasetKind = dataset.kind;
					return true;
				}
			}
		}

		const existsInDatasets = this.datasets.some((dataset) => dataset.id === datasetName);
		if (existsInDatasets) {
			if (this.dataSetsAccessed.length > 0) {
				throw new InsightError("Cannot access more than 1 dataset");
			}

			this.dataSetsAccessed.push(datasetName);
			for (const dataset of this.datasets) {
				if (dataset.id === datasetName) {
					this.datasetKind = dataset.kind;
					return true;
				}
			}
		}
		return false;
	}
}

