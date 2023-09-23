export interface Query {
	WHERE: Where;
	OPTIONS: Options;
}

export interface Where {
	AND?: Filter[];
	OR?: Filter[];
	NOT?: Filter;
	GT?: MComparison;
	LT?: MComparison;
	EQ?: MComparison;
	IS?: SComparison;
}

export type Filter = Where;

export interface MComparison {
	[mkey: string]: number;
}

export interface SComparison {
	[skey: string]: string;
}

export interface Options {
	COLUMNS: Columns;
	ORDER?: Order;
}

export type Order = string | ComplexOrder;
export type Columns = string[];

export interface ComplexOrder {
	dir: "UP" | "DOWN";
	keys: string[];
}

