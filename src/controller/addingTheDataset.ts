import {InsightDataset, InsightDatasetKind, InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import AddingTheSectionsDataset from "./addSectionsDataset";
import AddingTheRoomsDataset from "./addRoomsDataset";
export default class AddingTheDataset {
	private isValidId(id: string): boolean {
		return !(!id || /^\s*$/.test(id) || id.includes("_"));
	}

	public async add(id: string, content: string, kind: InsightDatasetKind, datasets: InsightDataset[]){
		if (!this.isValidId(id)) {
			return Promise.reject(new InsightError("Invalid id"));
		}
		if (datasets.find((dataset) => dataset.id === id)) {
			return Promise.reject(new InsightError("Dataset ID already exists"));
		}
		if(kind === InsightDatasetKind.Sections) {
			let AddingSections = new AddingTheSectionsDataset();
			await AddingSections.addSectionsDataset(id, content, kind, datasets);
			return Promise.resolve();
		} else if(kind === InsightDatasetKind.Rooms){
			let AddingRooms = new AddingTheRoomsDataset();
			await AddingRooms.addRoomsDataset(id, content, kind, datasets);
			return Promise.resolve();
		}else {
			return Promise.reject(new InsightError("Invalid kind"));
		}
	}
}
