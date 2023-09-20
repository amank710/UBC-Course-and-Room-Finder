import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {folderTest} from "@ubccpsc310/folder-test";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sectionsTwo: string;
	let sectionsThree: string;
	let sectionsFour: string;
	let sectionsFive: string;
	let sectionsSix: string;
	let sectionsEight: string;
	let sectionsNine: string;
	let sectionsTen: string;
	let sectionsEleven: string;
	let sectionsTwelve: string;
	let sectionsThirteen: string;
	let sectionsFourteen: string;
	let SectionsEmpty: string;
	let sectionsFifteen: string;
	let sectionsSixteen: string;
	let sectionsSeventeen: string;
	let sectionsEightTeen: string;
	let sectionsJustFile: string;

	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");
		sectionsTwo = getContentFromArchives("pair1.zip");
		sectionsThree = getContentFromArchives("noCourses.zip");
		sectionsFour = getContentFromArchives("noSections.zip");
		sectionsFive = getContentFromArchives("noCoursesFolder.zip");
		sectionsSix = getContentFromArchives("invalidJSONFormatSection.zip");
		sectionsEight = getContentFromArchives("onlySectionDoesNotContainEveryKey.zip");
		sectionsNine = getContentFromArchives("roomsFolderContainingRoom.zip");
		sectionsTen = getContentFromArchives("inValidDataset.txt");
		sectionsEleven = getContentFromArchives("roomInCourses.zip");
		sectionsTwelve = getContentFromArchives("fieldIsEmptyString.zip");
		sectionsThirteen = getContentFromArchives("containsBothInvalidAndValidSections.zip");
		sectionsFourteen = getContentFromArchives("containsTXTFilesInCoursesFolder.zip");
		sectionsFifteen = getContentFromArchives("noResultsSectionInZip.zip");
		sectionsSixteen = getContentFromArchives("noRankSectionInZip.zip");
		sectionsSeventeen = getContentFromArchives("EmptyResultField.zip");
		sectionsEightTeen = getContentFromArchives("fieldIsEmptyString2.zip");
		sectionsJustFile = getContentFromArchives("AANB500");

		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});
		it("should reject adding a dataset that is just a file", function () {
			const result = facade.addDataset("ubc", sectionsJustFile, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should accept a dataset that has fields all contain empty strings", function () {
			const result = facade.addDataset("ubc", sectionsEightTeen, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("should reject a dataset that has results empty field", function () {
			const result = facade.addDataset("ubc", sectionsSeventeen, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should accept a dataset that has no rank section in the json", function () {
			const result = facade.addDataset("ubc", sectionsSixteen, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("should reject a dataset that has no results in the json", function () {
			const result = facade.addDataset("ubc", sectionsFifteen, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should accept a idString that is only one character", function () {
			const result = facade.addDataset("j", sections, InsightDatasetKind.Sections);

			return expect(result).to.eventually.have.members(["j"]);
		});
		it("should reject because the sections variable did not fetch anything and is empty", function () {
			const result = facade.addDataset("ubc", SectionsEmpty, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because there is txt files in the courses folder", function () {
			const result = facade.addDataset("ubc", sectionsFourteen, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should be successful even though there are invalid sections without all the necessary keys", function () {
			const result = facade.addDataset("ubc", sectionsThirteen, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("this should be rejected because we have the incorrect InsightDatasetKind", function () {
			const result = facade.addDataset("ubc", sectionsTwo, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should add this dataSet, even with field that can be used by a query contains empty string", function () {
			const result = facade.addDataset("ubc", sectionsTwelve, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("should reject because there is a room and not a course in the courses folder", function () {
			const result = facade.addDataset("ubc", sectionsEleven, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because the dataset is not a valid zip file and is a txt file instead", function () {
			const result = facade.addDataset("ubc", sectionsTen, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because the dataset contains a folder called rooms instead", function () {
			const result = facade.addDataset("ubc", sectionsNine, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because the only section in the course does not contain every key required", function () {
			const result = facade.addDataset("ubc", sectionsEight, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because the only course has one section which is invalid json file", function () {
			const result = facade.addDataset("ubc", sectionsSix, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because the zip file is empty", function () {
			const result = facade.addDataset("ubc", sectionsFive, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because Dataset has no courses in the courses folder", function () {
			const result = facade.addDataset("ubc", sectionsThree, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject because Dataset has a courses folder but there are no sections in this folder", function () {
			const result = facade.addDataset("ubc", sectionsFour, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject with an empty dataset id", function () {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject a dataset that only contains whitespace", function () {
			const result = facade.addDataset("     ", sectionsTwo, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should reject adding a dataset with _ in the idString", function () {
			const result = facade.addDataset("ubc_here", sectionsTwo, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
		it("should successfully add a dataset (first)", function () {
			const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("should successfully add a dataset (second)", function () {
			const result = facade.addDataset("ubc", sectionsTwo, InsightDatasetKind.Sections);
			return expect(result).to.eventually.have.members(["ubc"]);
		});
		it("should successfully add multiple datasets", async function () {
			await facade.addDataset("ubc1", sections, InsightDatasetKind.Sections);
			const result = await facade.addDataset("ubc2", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc1", "ubc2"]);
		});
		it("should reject adding dataset with an existing ID", function () {
			return facade.addDataset("ubc", sections, InsightDatasetKind.Sections).then(() => {
				const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
				return expect(result).to.eventually.be.rejectedWith(InsightError);
			});
		});
		it("should reject with notFoundError because the dataset has not been added", async function () {
			try {
				await facade.removeDataset("ubc");
				expect.fail("The promise should be reject because the dataset has not been added yet");
			} catch (error) {
				expect(error).to.be.instanceof(NotFoundError);
			}
		});
		it("should successfully add a dataset and then remove it", async function () {
			const addResult = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(addResult).to.have.members(["ubc"]);

			const removeResult = await facade.removeDataset("ubc");
			expect(removeResult).to.equal("ubc");
		});
		it("should successfully add two datasets and then remove both of them", async function () {
			await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);

			const addResult2 = await facade.addDataset("ubc1", sections, InsightDatasetKind.Sections);
			expect(addResult2).to.have.members(["ubc", "ubc1"]);

			const removeResult = await facade.removeDataset("ubc");
			expect(removeResult).to.equal("ubc");

			const removeResult2 = await facade.removeDataset("ubc1");
			expect(removeResult2).to.equal("ubc1");

			// const datasets = await facade.listDatasets();
			// expect(datasets).to.be.an("array").that.is.empty;
		});

		it("should reject trying to remove a dataset with an ID that contains an underscore", async function () {
			try {
				await facade.removeDataset("ubc_123");
				expect.fail("The promise should be rejected because the idstring contains an underscore");
			} catch (error) {
				expect(error).to.be.instanceof(InsightError);
			}
		});

		it("should reject trying to remove a dataset with an ID that is only whitespace", async function () {
			try {
				await facade.removeDataset("    ");
				expect.fail("The promise should be rejected the ID string contains only whitespace");
			} catch (error) {
				expect(error).to.be.instanceof(InsightError);
			}
		});
		it("should reject trying to remove a dataset that that contains an empty ID string", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("The promise should be rejected the ID string is empty");
			} catch (error) {
				expect(error).to.be.instanceof(InsightError);
			}
		});
		it("should successfully list zero added datasets", async function () {
			const result = await facade.listDatasets();
			expect(result).to.be.an("array");
			expect(result.length).to.equal(0);
		});

		// it ("should successfully list one added dataset", function() {
		//     const result = facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
		//     expect(result).to.eventually.have.members(["ubc"]);
		//     const result2 = facade.listDatasets();
		//     return expect(result2).to.eventually.have.deep.members([{
		//         id: "ubc",
		//         kind: InsightDatasetKind.Sections,
		//         numRows: 64612
		//     }]);
		// });

		it("should successfully list one added dataset using async/await and deep", async function () {
			const result = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);
			const result2 = await facade.listDatasets();
			expect(result2).to.have.deep.members([{
				id: "ubc",
				kind: InsightDatasetKind.Sections,
				numRows: 64612
			}]);
		});

		it("should successfully list one added dataset using async/await", async function () {
			const resultAdd = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(resultAdd).to.have.members(["ubc"]);

			const result = await facade.listDatasets();
			expect(result).to.be.an("array");
			expect(result.length).to.equal(1);
			expect(result[0]).to.deep.equal({
				id: "ubc",
				kind: InsightDatasetKind.Sections,
				numRows: 64612
			});
		});

		it("should successfully list two added dataset using async/await", async function () {
			const resultAdd = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(resultAdd).to.have.members(["ubc"]);

			const resultAdd2 = await facade.addDataset("ubc2", sectionsTwo, InsightDatasetKind.Sections);
			expect(resultAdd2).to.have.members(["ubc", "ubc2"]);

			const result = await facade.listDatasets();
			expect(result).to.be.an("array");
			expect(result.length).to.equal(2);
			expect(result).to.deep.include.members([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				},
				{
					id: "ubc2",
					kind: InsightDatasetKind.Sections,
					numRows: 36
				}
			]);
		});

		it("should add two datasets remove one and list one", async function () {
			const resultAdd = await facade.addDataset("ubc", sections, InsightDatasetKind.Sections);
			expect(resultAdd).to.have.members(["ubc"]);

			const resultAdd2 = await facade.addDataset("ubc2", sectionsTwo, InsightDatasetKind.Sections);
			expect(resultAdd2).to.have.members(["ubc", "ubc2"]);

			const result = await facade.listDatasets();
			expect(result).to.be.an("array");
			expect(result.length).to.equal(2);
			expect(result).to.deep.include.members([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 64612
				},
				{
					id: "ubc2",
					kind: InsightDatasetKind.Sections,
					numRows: 36
				}
			]);

			const resultRemove = await facade.removeDataset("ubc2");
			expect(resultRemove).to.equal("ubc2");

			const result2 = await facade.listDatasets();
			expect(result2).to.be.an("array");
			expect(result2.length).to.equal(1);
			expect(result2[0]).to.deep.equal({
				id: "ubc",
				kind: InsightDatasetKind.Sections,
				numRows: 64612
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			facade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [facade.addDataset("sections", sections, InsightDatasetKind.Sections)];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: (actual, expected) => {
					// TODO add an assertion!
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: (actual, expected) => {
					// TODO add an assertion!
				},
			}
		);
	});
});
