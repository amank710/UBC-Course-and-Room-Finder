<template>
	<div class="home">
		<h1>{{ welcomeMessage }}</h1>
		<nav>
			<router-link to="/list-datasets" class="nav-button">List Datasets</router-link>
			<router-link to="/add-dataset" class="nav-button">Add Dataset</router-link>
			<router-link to="/remove-dataset" class="nav-button">Remove Dataset</router-link>
			<router-link to="/query-dataset" class="nav-button">Query Dataset</router-link>
		</nav>
	</div>
</template>

<script>
export default {
	name: 'LandingPage',
	data() {
		return {
			welcomeMessage: 'Welcome to the Home Screen'
		};
	}
}
</script>

<style scoped>
.home {
	text-align: center;
}

.nav-button {
	display: inline-block;
	margin: 10px;
	padding: 10px 20px;
	color: #fff;
	background-color: #42b983;
	text-decoration: none;
	border-radius: 4px;
	transition: background-color 0.3s ease;
}

.nav-button:hover {
	background-color: #338466;
}
</style>

