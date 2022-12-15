const keys = require('./keys');
const postmark = require('postmark');
const _ = require('lodash');
const client = new postmark.Client(keys.postmark);
const Mustache = require('mustache');
const FS = require('fs');


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
		console.log('Emails sent:', response);
		console.log(response.To, response.MessageID, response.ErrorCode);
		return true;
	})
}

function renderEmail(template, templateData) {
	const htmlTemplate = FS.readFileSync('template/' + template + '.html').toString();
	const textTemplate = FS.readFileSync('template/' + template + '.text').toString();
	const HtmlBody = Mustache.render(htmlTemplate, templateData);
	const TextBody = Mustache.render(textTemplate, templateData);
	return {HtmlBody, TextBody}
}
exports.renderEmail = renderEmail;



exports.sendEmail = postMarkSendEmail;
exports.sendBatchEmails = postMarkSendBatchEmails;