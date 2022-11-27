import express from 'express';

const app = express();
app.use('/', express.static('./usage'));
app.use('/dist', express.static('./dist'));

app.listen(5050, () => {
	console.log('Listening at http://localhost:5050');
});
