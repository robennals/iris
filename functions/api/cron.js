
const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const { sendPendingNotifsAsync } = require('../output/notifs');
const { maybeSendWeeklyDigest } = require('./digest');

async function pingAsync({secret}){
    console.log('Ping received', secret);

    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const users = _.keys(userEmails);

    const pNotifEmails = _.map(users, userId => sendPendingNotifsAsync({userId}));

    const digestResult = await maybeSendWeeklyDigest();

    // console.log('digestResult', digestResult);
    
    // console.log('updates', digestResult.updates);

    if (digestResult.emails) {
        // console.log('emails[0]', digestResult.emails[0]);
        // emails = digestResult
    }

    await Promise.all(pNotifEmails);

    
    return {success: true, emails: digestResult.emails, updates: digestResult.updates}
    // return {success: true}
}

exports.pingAsync = pingAsync;
