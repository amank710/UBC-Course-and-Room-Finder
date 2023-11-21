import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {expect} from "chai";
import request, {Response} from "supertest";
import * as fs from "fs-extra";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	const SERVER_URL = "http://localhost:4321";

	before(async function () {
		facade = new InsightFacade();
		server = new Server(4321);
		console.log("Starting server");
		try {
			await server.start();
			console.log(`Server started on ${SERVER_URL}`);
		} catch (error) {
			console.error("Failed to start server", error);
		}
	});

	after(async function () {
		try {
			await server.stop();
			console.log("Server stopped");
		} catch (error) {
			console.error("Failed to stop server", error);
		}
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		const ENDPOINT_URL = "/dataset/sections/sections";
		const ZIP_FILE_DATA = fs.readFileSync("test/resources/archives/" + "pair.zip");
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					console.log(res.status);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	it("POST test for submitting a query", function () {
		const ENDPOINT_URL = "/query";
		const QUERY = {
			WHERE: {
				GT: {
					sections_avg: 97
				}
			},
			OPTIONS: {
				COLUMNS: [
					"sections_dept",
					"sections_avg"
				],
				ORDER: "sections_avg"
			}
		};

		return request(SERVER_URL)
			.post(ENDPOINT_URL)
			.send(QUERY)
			.set("Content-Type", "application/json")
			.then(function (res) {
				console.log(res.status);

				expect(res.status).to.be.equal(200);

				expect(res.body.result).to.be.an("array");


				if (res.body.result.length > 0) {
					expect(res.body.result.length).to.be.equal(49);
				}
			})
			.catch(function (err) {

				expect.fail("POST /query failed with error: " + err.message);
			});
	});
	it("DELETE test for courses dataset", function () {
		return request(SERVER_URL)
			.delete("/dataset/sections")
			.then(function (res) {
				console.log(res.status);
				// Check for the correct use of response codes
				expect(res.body.result).to.be.a("string");
			})
			.catch(function (err) {
				expect.fail("Failed with error: " + err);
			});
	});
	it("GET test for listing datasets", function () {
		const ENDPOINT_URL = "/datasets";
		return request(SERVER_URL)
			.get(ENDPOINT_URL)
			.then(function (res) {
				console.log(res.status);

				expect(res.status).to.be.equal(200);

				expect(res.body.result).to.be.an("array");
			})
			.catch(function (err) {
				expect.fail("GET /datasets failed with error: " + err.message);
			});
	});
});
