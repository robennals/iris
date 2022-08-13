const express = require('express');
const fetch = require('node-fetch');

const app = express()


async function doPingFetch() {
	const url = 'https://talkwell.net/api/v1/ping?secret=8275283672950274';
	await fetch(url);
	console.log('Did ping to TalkWell server');
	// const url2 = 'https://newsnode.org/api/v1/hourPing?secret=782643622';
	// await fetch(url2);
	console.log('Did ping to Hubcard server');
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


