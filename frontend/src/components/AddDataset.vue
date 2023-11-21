<template>
	<div>
		<h1>Add Dataset</h1>
		<div v-if="!fileUploaded" @dragover.prevent="onDragOver" @drop.prevent="onFileDrop" class="drop-area">
			Drop a .zip file here
		</div>
		<div v-if="fileUploaded" class="upload-success">
			File uploaded successfully!
		</div>

		<input type="text" v-model="datasetName" placeholder="Enter dataset name" />

		<div>
			<input type="radio" id="rooms" value="rooms" v-model="datasetKind">
			<label for="rooms">Rooms</label>
			<input type="radio" id="sections" value="sections" v-model="datasetKind">
			<label for="sections">Sections</label>
		</div>

		<button @click="submitDataset">Submit</button>
	</div>
</template>

<script>
export default {
	name: 'AddDataset',
	data() {
		return {
			file: null,
			datasetName: '',
			datasetKind: null,
			fileUploaded: false
		};
	},
	methods: {
		onDragOver(event) {
			console.log(event)
		},
		onFileDrop(event) {
			this.file = event.dataTransfer.files[0];
			if (this.file && this.file.name.endsWith('.zip')) {
				this.fileUploaded = true;
			} else {
				alert('Please drop a .zip file.');
			}
		},
		submitDataset() {
			if (!this.file || !this.datasetName || !this.datasetKind) {
				alert('Please provide a file, name, and select a kind for the dataset.');
				return;
			}

			const reader = new FileReader();
			reader.onload = (event) => {
				fetch(`http://localhost:4321/dataset/${this.datasetName}/${this.datasetKind}`, {
					method: 'PUT',
					body: event.target.result,
					headers: {
						'Content-Type': 'application/x-zip-compressed'
					}
				})
					.then(response => {
						if (!response.ok) {
							throw new Error('Network response was not ok');
						}
						return response.json();
					})
					.then(data => {
						alert('Dataset uploaded successfully!');
						console.log(data);
						this.resetValues();
					})
					.catch(error => {
						console.error('Error:', error);
					});
			};
			reader.readAsArrayBuffer(this.file);
		},
		resetValues() {
			this.fileUploaded = false;
			this.file = null;
			this.datasetName = '';
			this.datasetKind = null;
			this.$refs.fileInput.value = '';
		}

	}
}
</script>

<style scoped>
.drop-area {
	border: 2px dashed #42b983;
	padding: 20px;
	text-align: center;
	cursor: pointer;
	margin: 10px 0;
}
</style>

