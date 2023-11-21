import { createRouter, createWebHistory } from 'vue-router';
import ListDatasets from '../components/ListDatasets.vue';
import AddDataset from '../components/AddDataset.vue';
import RemoveDataset from '../components/RemoveDataset.vue';
import QueryDataset from '../components/QueryDataset.vue';
import LandingPage from "../components/LandingPage.vue";
import CourseGrades from "../components/CourseGrades.vue";
import ProfessorsCourses from "../components/ProfessorsCourses.vue"

// Use createRouter and createWebHistory for Vue 3
const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'Home',
			component: LandingPage
		},
		{
			path: '/list-datasets',
			name: 'ListDatasets',
			component: ListDatasets
		},
		{
			path: '/add-dataset',
			name: 'AddDataset',
			component: AddDataset
		},
		{
			path: '/remove-dataset',
			name: 'RemoveDataset',
			component: RemoveDataset
		},
		{
			path: '/query-dataset',
			name: 'QueryDataset',
			component: QueryDataset
		},
		{
			path: '/course-grades',
			name: 'GetCourseGrade',
			component: CourseGrades
		},
		{
			path: '/professor-courses',
			name: 'GetProfessorsCourses',
			component: ProfessorsCourses
		}
	]
});

export default router;


