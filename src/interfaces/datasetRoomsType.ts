export interface Room {
	fullname: unknown;
	shortname: unknown;
	number: unknown;
	name: unknown;
	address: unknown;
	lat: unknown;
	lon: unknown;
	seats: unknown;
	type: unknown;
	furniture: unknown;
	href: unknown;
	[roomKey: string]: unknown;
}

export interface PartialRoom {
	number: unknown;
	seats: unknown;
	type: unknown;
	furniture: unknown;
	href: unknown;
}
export interface Rooms {
	rooms: Room[];
}

export interface PartialRoomsContainer {
	partialRooms: PartialRoom[];
}
export interface BuildingInfo{
	fullname: unknown;
	shortname: string;
	address: unknown;
	roomsAddress: unknown;
}
export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}
export interface ExtractedContentRooms {
	[buildings: string]: Rooms;
}
