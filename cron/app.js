const express = require('express');
const fetch = require('node-fetch');
const { appDomain, appName } = require('../client/data/config');

const app = express()


async function doPingFetch() {
	const url = appDomain + '/api/v1/ping?secret=8275283672950274';
	await fetch(url);
	console.log('Did ping to '+appName+' server');
}

app.get('/pings/hour', async (req, res) => {
	const hour = (new Date()).getUTCHours();
	console.log('ping hour:', hour);
	await doPingFetch();
	res.status(200).send('DONE').end();
})

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
	console.log('App listening on part ' + PORT);
})


