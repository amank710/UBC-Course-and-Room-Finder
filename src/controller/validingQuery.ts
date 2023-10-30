import {Query} from "../interfaces/queryTypes";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import ValidatingWhere from "./validatingWhere";
import ValidatingOptions from "./validatingOptions";
import ValidatingTransformations from "./validatingTransformations";

export default class ValidatingQuery {
	private columnsKeyList: string[] = [];
	private dataSetsAccessed: string[] = [];
	private datasets: InsightDataset[] = [];
	private appliedKeys: Set<string> | undefined;
	public validateQuery(query: Query, cKL: string[], dSA: string[], dataset: InsightDataset[]): boolean{
		if(!query){
			throw new InsightError("Query is null");
		}
		const allowedKeys = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
		for (let key in query) {
			if (!allowedKeys.includes(key)) {
				throw new InsightError(`Invalid key found: ${key}. Only WHERE, OPTIONS and
				TRANSFORMATIONS are allowed.`);
			}
		}
		if(!cKL){
			throw new InsightError("columnsKeyList is null");
		} else {
			this.columnsKeyList = cKL;
		}
		if(!dSA){
			throw new InsightError("dataSetsAccessed is null");
		} else {
			this.dataSetsAccessed = dSA;
		}
		if(!dataset){
			throw new InsightError("dataset is null");
		} else {
			this.datasets = dataset;
		}
		if(query.TRANSFORMATIONS){
			let validatingTransformations = new ValidatingTransformations(this.datasets,
				this.columnsKeyList, this.dataSetsAccessed);
			this.appliedKeys = validatingTransformations.checkTransformations(query.TRANSFORMATIONS);
		}
		if(!query.OPTIONS){
			throw new InsightError("OPTIONS is null");
		} else{
			let validatingOptions = new ValidatingOptions(this.datasets,
				this.dataSetsAccessed, this.columnsKeyList, this.appliedKeys);
			validatingOptions.checkOptions(query.OPTIONS);
		}
		if(!query.WHERE){
			throw new InsightError("BODY is null");
		} else {
			let validatingWhere = new ValidatingWhere(this.datasets, this.dataSetsAccessed);
			validatingWhere.checkWhere(query.WHERE);
		}
		return true;
	}
}
