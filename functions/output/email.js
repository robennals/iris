const keys = require('./keys');
const postmark = require('postmark');
const _ = require('lodash');
const client = new postmark.Client(keys.postmark);


function postMarkSendEmail(email) {
	console.log('send email ' + email.To + ' - ' + email.Subject);
	const emailRequest = Object.assign({}, email, {TrackOpens: true, TrackLinks: 'None'});

	// console.log('email Request', emailRequest)

	return client.sendEmail(emailRequest).then(response => {
		// console.log('Email sent');
		// console.log(response.To, response.MessageID, response.ErrorCode);
		return true;
	})
}

function postMarkSendBatchEmails({emails}){
	const requests = _.values(emails).map(email => Object.assign({}, email, {TrackOpens: true, TrackLinks: 'None'}));
	console.log('Email Requests', requests.length)
	return client.sendEmailBatch(requests).then(response => {
		// console.log('Emails sent:', response);
		console.log(response.To, response.MessageID, response.ErrorCode);
		return true;
	})
}


exports.sendEmail = postMarkSendEmail;
exports.sendBatchEmails = postMarkSendBatchEmails;