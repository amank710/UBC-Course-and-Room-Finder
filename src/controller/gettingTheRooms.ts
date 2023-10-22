import {BuildingInfo, RoomContainer, PartialRoomsContainer, PartialRoom, GeoResponse
} from "../interfaces/datasetRoomsType";
import * as parse5 from "parse5";
import {get} from "http";
export default class GettingTheRooms{
	public async constructRooms(build: BuildingInfo, PRD: PartialRoomsContainer, RC: RoomContainer) {
		if (PRD.partialRooms.length > 0) {
			let lat;
			let lon;
			if (typeof build.address === "string") {
				const geoResponse: GeoResponse = await this.getGeoLocation(131, build.address);
				if (geoResponse.error) {
					console.error(`Failed to fetch geolocation for address
								${build.address}: ${geoResponse.error}`);
				} else {
					lat = geoResponse.lat;
					lon = geoResponse.lon;
				}
			} else {
				console.error(`Unexpected data type for address: ${typeof build.address}`);
			}
			for (const partialRoom of PRD.partialRooms) {
				const room = {
					fullname: build.fullname,
					shortname: build.shortname,
					address: build.address,
					lat: lat,
					lon: lon,
					number: partialRoom.number,
					seats: partialRoom.seats,
					type: partialRoom.type,
					furniture: partialRoom.furniture,
					href: partialRoom.href,
					name: build.shortname + "_" + partialRoom.number,
				};
				RC.rooms.push(room);
			}
		}
	}

	// Got ChatGPT to refactor the next four functions so there is no longer callback hell
	public extractRoomsFromBuilding(content: string): PartialRoomsContainer {
		const document = parse5.parse(content);
		const roomData: PartialRoom[] = [];

		this.traverseNodes(document, this.processNode.bind(this, roomData));

		return {partialRooms: roomData};
	}

	private processNode(roomData: PartialRoom[], node: any): void {
		if (node.tagName === "tr") {
			let room: PartialRoom = {
				number: undefined,
				seats: undefined,
				type: undefined,
				furniture: undefined,
				href: undefined
			};
			node.childNodes.forEach(this.processCell.bind(this, room));
			this.checkValues(room, roomData);
		}
	}

	private processCell(room: PartialRoom, cell: any): void {
		if (cell.tagName !== "td") {
			return;
		}

		const classAttr = this.findAttribute(cell, "class");
		if (!classAttr) {
			return;
		}

		if (classAttr.value.includes("views-field-field-room-number")) {
			this.handleRoomNumber(room, cell);
		} else if (classAttr.value.includes("views-field-field-room-capacity")) {
			this.handleRoomCapacity(room, cell);
		} else if (classAttr.value.includes("views-field-field-room-furniture")) {
			room.furniture = this.getTextContent(cell);
		} else if (classAttr.value.includes("views-field-field-room-type")) {
			room.type = this.getTextContent(cell);
		}
	}

	private handleRoomNumber(room: PartialRoom, cell: any): void {
		const aTag = cell.childNodes[1];
		if (aTag && aTag.tagName === "a") {
			room.number = this.getTextContent(aTag);
			const hrefAttr = this.findAttribute(aTag, "href");
			if (hrefAttr) {
				room.href = hrefAttr.value;
			}
		}
	}

	private handleRoomCapacity(room: PartialRoom, cell: any): void {
		const seatCount = parseInt(this.getTextContent(cell), 10);
		if (!isNaN(seatCount)) {
			room.seats = seatCount;
		} else {
			console.error("Failed to parse seat count:", this.getTextContent(cell));
		}
	}

	private findAttribute(element: any, attributeName: string): any | undefined {
		return element.attrs.find((attr: any) => attr.name === attributeName);
	}

	// Got this code from ChatGPT
	private async getGeoLocation(teamNumber: number, address: string): Promise<GeoResponse> {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${teamNumber}/${encodedAddress}`;

		return new Promise<GeoResponse>((resolve, reject) => {
			try{
				get(url, (response) => {
					let data = "";
					response.on("data", (chunk) => {
						data += chunk;
					});
					response.on("end", () => {
						if (response.statusCode !== 200) {
							reject(new Error(`Failed with status ${response.statusCode}`));
							return;
						}
						try {
							const json: GeoResponse = JSON.parse(data);
							resolve(json);
						} catch (err) {
							reject(err);
						}
					});
				}).on("error", (err) => {
					console.error(err);
					reject(err);
				});
			} catch (err) {
				console.log(err);
				reject(err);
			}
		});
	}

	private checkValues(room: PartialRoom, roomData: PartialRoom[]): void{
		if (
			room.number !== undefined &&
			room.seats !== undefined &&
			room.type !== undefined &&
			room.furniture !== undefined &&
			room.href !== undefined
		) {
			roomData.push(room);
		}
	}

	private getTextContent(node: any): string {
		if (node.nodeName === "#text"){
			return node.value.trim();
		}
		if (node.childNodes && node.childNodes.length) {
			return node.childNodes.map((childNode: any) => this.getTextContent(childNode)).join("").trim();
		}
		return "";
	}

	private traverseNodes(node: any, action: (node: any) => void) {
		action(node);
		if (node.childNodes) {
			node.childNodes.forEach((childNode: any) => this.traverseNodes(childNode, action));
		}
	}
}
