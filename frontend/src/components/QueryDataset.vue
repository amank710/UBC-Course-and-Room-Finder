<template>
	<div>
		<h1>Query Dataset</h1>
		<router-link to="/course-grades">
			<button>Search Course Average Grades</button>
		</router-link>

		<router-link to="/professor-courses">
			<button>Search Professor's Courses</button>
		</router-link>
	</div>
</template>

<script>
export default {
	name: 'QueryDataset'
}
</script>

<style scoped>
button {
	margin: 10px;
	padding: 10px 20px;
	font-size: 16px;
	cursor: pointer;
}
</style>
