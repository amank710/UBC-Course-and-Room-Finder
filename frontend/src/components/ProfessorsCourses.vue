<template>
	<div>
		<h1>Professor's Courses</h1>
		<form @submit.prevent="searchProfessor">
			<input type="text" v-model="localProfessorName" placeholder="Enter Professor's Name">
			<button type="submit">Search</button>
		</form>

		<div>
			<div v-if="error" class="error-message">{{ error }}</div>
			<div v-else>
				<h2 v-if="displayName">{{ formattedProfessorName }}'s Courses</h2>
				<table v-if="coursesData && Array.isArray(coursesData.result) && coursesData.result.length">
					<tr>
						<th>Year</th>
						<th>Department</th>
						<th>Course ID</th>
						<th>Average Grade</th>
					</tr>
					<tr v-for="(course, index) in coursesData.result" :key="index">
						<td>{{ course.sections_year}}</td>
						<td>{{ course.sections_dept }}</td>
						<td>{{ course.sections_id }}</td>
						<td>{{ course.sections_avg }}</td>
					</tr>
				</table>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'ProfessorsCourses',
	data() {
		return {
			localProfessorName: this.professorName,
			coursesData: null,
			displayName: null,
			error: null,
		};
	},
	props: {
		professorName: String
	},
	computed: {
		formattedProfessorName() {
			return this.displayName
				.split(/\s+/)
				.map(name => name.replace(',', ''))
				.map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
				.reverse()
				.join(' ');
		}
	},
	methods: {
		searchProfessor() {
			let query = {
				"WHERE": {
					"IS": {
						"sections_instructor": this.localProfessorName
					}
				},
				"OPTIONS": {
					"COLUMNS": [
						"sections_dept",
						"sections_id",
						"sections_avg",
						"sections_year"
					],
					"ORDER": "sections_year"
				}
			}
			// Got this code from ChatGPT
			fetch(`http://localhost:4321/query`, {
				method: 'POST',
				body: JSON.stringify(query),
				headers: {
					'Content-Type': 'application/json'
				}
			})
				.then(response => {
					if (!response.ok) {
						throw new Error('Fields cannot be blank. Please try again');
					}
					return response.json();
				})
				.then(data => {
					if (!data.result || data.result.length === 0) {
						this.error = 'No data found for the given professor. Please try again';
					} else {
						this.error = null;
					}
					this.coursesData = data;
					this.displayName = this.localProfessorName;
					this.localProfessorName = '';
				})
				.catch(error => {
					this.error = error.message;
				});
		}

	}
}
</script>

<style scoped>
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
</style>

