const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');
const Iris = require('./iris');

async function sendFeedbackAsync({text, userId}) {
    const userEmail = await FBUtil.getDataAsync(['special', 'userEmail', userId]);
    const userName = await FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const email = {
        To: 'Rob Ennals <rob.ennals@gmail.com>',
        From: 'Iris Feedback <feedback@iris-talk.com>',
        Subject: 'Feedback from ' + userName,
        Cc: userName + '<' + userEmail + '>',
        ReplyTo: userName + '<' + userEmail + '>',
        TextBody: text
    }
    console.log('feedback email', email);
    return {success: true, emails: [email]}
}

exports.sendFeedbackAsync = sendFeedbackAsync;