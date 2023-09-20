export interface Query {
    BODY: Body;
    OPTIONS: Options;
}

export interface Body {
    WHERE: Filter;
}

export type Filter = LogicComparison | MComparison | SComparison | Negation;

export interface LogicComparison {
    [LOGIC: string]: Filter[];
}

export interface MComparison {
    [MCOMPARATOR: string]: {
        [mkey: string]: number;
    }
}

export interface SComparison {
    IS: {
        [skey: string]: string;
    }
}

export interface Negation {
    NOT: Filter;
}

export interface Options {
    COLUMNS: Columns;
    ORDER?: string;
}

export type Columns = string[];
