<template>
	<div>
		<h1>Course Average Grades</h1>
		<form @submit.prevent="searchGrades">
			<input type="text" v-model="departmentCode" placeholder="Enter Department Code">
			<input type="text" v-model="courseCode" placeholder="Enter Course Code">
			<button type="submit">Search</button>
		</form>

		<div v-if="error" class="error-message">{{ error }}</div>
		<div class="chart-container" >
			<h2 v-if="displayNames">{{ displayNames }} Average Grades</h2>
			<canvas v-if="gradesData && Array.isArray(gradesData.result) && gradesData.result.length" ref="chartCanvas"></canvas>
		</div>
	</div>
</template>

<script>
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
export default {
	name: 'CourseGrades',
	data() {
		return {
			departmentCode: '',
			courseCode: '',
			displayNames: null,
			gradesData: null,
			error: null,
			chart: null
		};
	},
	methods: {
		searchGrades() {
			let query = {
				"WHERE": {
					"AND": [
						{
							"IS": {
								"sections_dept": this.departmentCode
							}
						},
						{
							"IS": {
								"sections_id": this.courseCode
							}
						},
						{
							"NOT": {
								"EQ": {
									"sections_year": 1900
								}
							}
						}
					]
				},
				"OPTIONS": {
					"COLUMNS": [
						"sections_dept",
						"sections_id",
						"averageGrade",
						"sections_year"
					],
					"ORDER": {
						"dir": "UP",
						"keys": [
							"sections_year",
							"averageGrade"
						]
					}
				},
				"TRANSFORMATIONS": {
					"GROUP": [
						"sections_dept",
						"sections_id",
						"sections_year"
					],
					"APPLY": [
						{
							"averageGrade": {
								"AVG": "sections_avg"
							}
						}
					]
				}
			};
			fetch(`http://localhost:4321/query`, {
				method: 'POST',
				body: JSON.stringify(query),
				headers: {
					'Content-Type': 'application/json'
				}
			})
				.then(response => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.json();
				})
				.then(data => {
					this.gradesData = data;
					if (!data.result || data.result.length === 0) {
						this.error = 'No data found for the given department and course code. Please try again.';
					} else {
						this.error = null;
					}
					if (data.result && data.result.length > 0){
						this.renderChart();
						this.displayNames = this.departmentCode.toUpperCase() + ' ' + this.courseCode;
					}
					else{
						this.displayNames = null;
					}
					this.departmentCode = '';
					this.courseCode = '';
				})
				.catch(error => {
					this.error = error.message;
				});
		},
		renderChart() {
			this.$nextTick(() => {
				if (!this.$refs.chartCanvas) {
					console.error('Canvas element is not available.');
					return;
				}
				const context = this.$refs.chartCanvas.getContext('2d');
				const data = {
					labels: this.gradesData.result.map(item => item.sections_year),
					datasets: [{
						label: 'Average Grade',
						data: this.gradesData.result.map(item => item.averageGrade),
						fill: false,
						borderColor: 'rgb(75, 192, 192)',
						tension: 0.1
					}]
				};
				// Got the code to generate the graph from ChatGPT
				const config = {
					type: 'line',
					data,
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: false,
								ticks: {
									padding: 10
								},
								title: {
									display: true,
									text: 'Average Grade', // Y-axis label
									color: '#666'
								}
							},
							x: {
								title: {
									display: true,
									text: 'Year', // X-axis label
									color: '#666'
								}
							}
						}
					}
				};

				if (this.chart instanceof Chart) {
					this.chart.destroy();
				}
				this.chart = new Chart(context, config);
			});
		}
	},
}
</script>

<style scoped>
/* Add your styles here */
.error-message {
	color: red;
	text-align: center;
}

table {
	width: 60%;
	margin-left: auto;
	margin-right: auto;
	border-collapse: collapse;
	text-align: center;
}

th, td {
	padding: 8px;
	border: 1px solid #ddd;
}

th {
	background-color: #f2f2f2;
	color: black;
}

tr:nth-child(even) {
	background-color: #f9f9f9;
}

tr:hover {
	background-color: #e8e8e8;
}
.chart-container {
	position: relative;
	height: 400px;
	width: 100%;
}

canvas {
	max-height: 100% !important;
}
</style>

