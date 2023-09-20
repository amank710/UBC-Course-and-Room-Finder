export interface CourseSection {
	id: unknown;
	Course: unknown;
	Title: unknown;
	Professor: unknown;
	Subject: unknown;
	Year: unknown;
	Avg: unknown;
	Pass: unknown;
	Fail: unknown;
	Audit: unknown;
	[key: string]: unknown;
}
export interface CourseData {
	result: CourseSection[];
	[key: string]: unknown;
}
export interface ExtractedContent {
	[coursePath: string]: CourseData;
}
