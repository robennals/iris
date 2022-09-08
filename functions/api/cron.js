
const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const { sendPendingNotifsAsync } = require('../output/notifs');
const { maybeSendWeeklyDigest } = require('./digest');
const Iris = require('./iris');
const Notifs = require('../output/notifs');

function flattenObjectList(objectList) {
    var out = {};
    _.forEach(objectList, obj => {
        out = {...out, ...obj};
    })
    return out;
}

async function maybeProdGroupsWithNextQuestionAsync() {
    const irisBotGroups = await FBUtil.getDataAsync(['special', 'irisBotGroup']);
    console.log('maybeProdGroups', irisBotGroups);
    const groups = _.keys(irisBotGroups);
    const pProds = groups.map(group => Iris.maybeSendNextQuestionAsync({group, irisBotGroup: irisBotGroups[group]}));
    const prods = await Promise.all(pProds);
    const updates = flattenObjectList(prods.map(p => p?.updates || {}));
    const notifs = _.flatten(prods.map(p => p?.notifs)).filter(x => x);

    // console.log('updates', updates);
    // console.log('notifs', notifs);
    // return {success: false, message: 'in progress'};
    return {success: true, updates, notifs}
}

async function pingAsync({secret}){
    console.log('Ping received', secret);
    return await maybeProdGroupsWithNextQuestionAsync();

    // const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    // const users = _.keys(userEmails);

    // const pNotifEmails = _.map(users, userId => sendPendingNotifsAsync({userId}));

    // const digestResult = await maybeSendWeeklyDigest();

    // // console.log('digestResult', digestResult);
    
    // // console.log('updates', digestResult.updates);

    // if (digestResult.emails) {
    //     // console.log('emails[0]', digestResult.emails[0]);
    //     // emails = digestResult
    // }

    // await Promise.all(pNotifEmails);

    
    // return {success: true, emails: digestResult.emails, updates: digestResult.updates}
    return {success: true}
}

exports.pingAsync = pingAsync;
