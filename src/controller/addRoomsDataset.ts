import {BuildingInfo, RoomContainer} from "../interfaces/datasetRoomsType";
import * as parse5 from "parse5";
import JSZip from "jszip";
import * as fs from "fs-extra";
import GettingTheRooms from "./gettingTheRooms";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
export default class AddingTheRoomsDataset {

	public async addRoomsDataset(id: string, content: string, kind: InsightDatasetKind, datasets: InsightDataset[]){
		let extractedContent;
		try {
			extractedContent = await this.extractFromZipRooms(content);
		} catch (error) {
			return Promise.reject(new InsightError("Failed to extract content from ZIP"));
		}
		let numRows = extractedContent.rooms.length;
		if(numRows === 0){
			return Promise.reject(new InsightError("The dataset is not valid zip file"));
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

	private async extractFromZipRooms(content: string): Promise<RoomContainer> {
		const zip = new JSZip();
		try {
			await zip.loadAsync(content, {base64: true});
		} catch (e) {
			return Promise.reject(new InsightError("Failed to load ZIP"));
		}

		const indexFile = zip.file("index.htm");
		if (!indexFile) {
			return Promise.reject(new InsightError("The zip file does not contain index.htm"));
		}

		const indexContent = await indexFile.async("text");
		const buildingInfoList = this.extractBuildingInfoFromIndex(indexContent);
		if (buildingInfoList.length === 0) {
			return Promise.reject(new InsightError("No valid building links found in index.htm"));
		}
		const roomContainer: RoomContainer = {
			rooms: []
		};
		const loadingPromises = buildingInfoList.map(async (building: BuildingInfo) => {
			if(typeof building.roomsAddress === "string"){
				const buildingFile = zip.file(building.roomsAddress.slice(2));
				if (buildingFile) {
					const buildingContent = await buildingFile.async("text");
					const gettingRooms = new GettingTheRooms();
					const partialRoomsData = gettingRooms.extractRoomsFromBuilding(buildingContent);
					await gettingRooms.constructRooms(building, partialRoomsData, roomContainer);
				}
			}
		});

		await Promise.all(loadingPromises);
		return roomContainer;
	}

	// The traversal code is based on code from ChatGPT
	// Also had ChatGPT refactor this code to get rid of callback hell
	private extractBuildingInfoFromIndex(content: string): BuildingInfo[] {
		const document = parse5.parse(content);
		const buildingInfoList: BuildingInfo[] = [];

		this.traverseNodes(document, this.processNodeForBuildingInfo.bind(this, buildingInfoList));

		return buildingInfoList;
	}

	private processNodeForBuildingInfo(buildingInfoList: BuildingInfo[], node: any): void {
		if (node.tagName !== "tr") {
			return;
		}

		const buildingInfo: BuildingInfo = {
			fullname: undefined,
			shortname: undefined,
			address: undefined,
			roomsAddress: undefined
		};

		node.childNodes.forEach(this.processTdNode.bind(this, buildingInfo));

		if (buildingInfo.fullname && buildingInfo.shortname && buildingInfo.address && buildingInfo.roomsAddress) {
			buildingInfoList.push(buildingInfo);
		}
	}

	private processTdNode(buildingInfo: BuildingInfo, tdNode: any): void {
		if (tdNode.tagName !== "td") {
			return;
		}

		const isTitleCell = this.hasAttribute(tdNode, "class", "views-field-title");
		const isAddressCell = this.hasAttribute(tdNode, "class", "views-field-field-building-address");

		if (isTitleCell) {
			tdNode.childNodes.forEach((childNode: any) => {
				if (childNode.tagName === "a") {
					this.getFullRoomsShortName(childNode, buildingInfo);
				}
			});
		} else if (isAddressCell) {
			buildingInfo.address = tdNode.childNodes[0].value.trim();
		}
	}

	private hasAttribute(element: any, attributeName: string, value: string): boolean {
		return element.attrs.some((attr: any) => attr.name === attributeName && attr.value.includes(value));
	}

	private getFullRoomsShortName(childNode: any, buildingInfo: BuildingInfo): void{
		let fullname: string | undefined;
		let roomsAddress: string | undefined;
		let shortname: string | undefined;
		if (childNode.childNodes.length === 1) {
			fullname = childNode.childNodes[0].value.trim();
			roomsAddress = childNode.attrs.find((attr: any) => attr.name === "href")?.value;
			if (roomsAddress) {
				const splitAddress = roomsAddress.split("/");
				const lastSegment = splitAddress.pop();
				if (lastSegment) {
					shortname = lastSegment.split(".")[0];
				}
			}
		}
		if(fullname) {
			buildingInfo.fullname = fullname;
		}
		if(roomsAddress) {
			buildingInfo.roomsAddress = roomsAddress;
		}
		if(shortname) {
			buildingInfo.shortname = shortname;
		}
	}

	// This Traversal code is based on code from ChatGPT

	private traverseNodes(node: any, action: (node: any) => void) {
		action(node);
		if (node.childNodes) {
			node.childNodes.forEach((childNode: any) => this.traverseNodes(childNode, action));
		}
	}
}
