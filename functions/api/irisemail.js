const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');

const AndFormat = new Intl.ListFormat('en', {style: 'long', type: 'conjunction'});


async function irisDigestAsync() {
    const result = await sendMissedMessageEmailForAllUsers();
    // console.log('result', result);
    const randIndex = Math.floor(Math.random() * result.emails.length);
    // console.log('updates', result.updates);
    // console.log('emails', result.emails);
    console.log('randIndex', randIndex);
    console.log('email count', result.emails.length);
    return {success: true, html: result.emails[randIndex].HtmlBody};
    // return {success: true, updates: result.updates, emails: result.emails}
}


exports.irisDigestAsync = irisDigestAsync;


const noEmailsResult = {succuss: true, emails: []};


async function sendMissedMessageEmailForAllUsers() {
    const userEmails = await FBUtil.getDataAsync(['special', 'userEmail']);
    const users = _.keys(userEmails);
    var updates = {};
    var emails = [];
    var index = 0;
    const allMissedResults = await Promise.all(_.map(users, u => getMissedMessagesForUser(u)));
    _.forEach(allMissedResults, result => {
        if (result) {
            updates = {...updates, ...result.updates};
            emails = [...emails, ...result.emails];
            // console.log('needsAppPromo', result.templateData.needsAppPromo, index);
            index++;
        }
    })
    // console.log('emails', emails);
    // console.log('updates', updates);

    return {success: true, emails, updates};
}
exports.sendMissedMessageEmailForAllUsers = sendMissedMessageEmailForAllUsers;

async function getMissedMessagesForUser(user) {
    const pLastmessageTime = FBUtil.getDataAsync(['userPrivate', user, 'lastMessageTime'], 0);
    const pLastNotifEmailTime = FBUtil.getDataAsync(['userPrivate', user, 'lastNotifEmailTime'], 0);
    const lastActionTime = await FBUtil.getDataAsync(['userPrivate', user, 'lastAction'], 0);
    const lastMessageTime = await pLastmessageTime;
    const lastNotifEmailTime = await pLastNotifEmailTime;
    if (lastMessageTime == 0) {
        // console.log('Never received a message', user);
        return null;
    }
    if (Math.max(lastActionTime || 0, lastNotifEmailTime || 0) > lastMessageTime) {
        // console.log('No missed messages', user);
        return null; // no new messages since they last used the app
    }
    if (lastActionTime > Date.now() - (24 * Basics.hourMillis)) {
        // console.log('Active recently', user);
        return null; // used the app within the last 24 hours.
    }
    if ((lastNotifEmailTime > lastActionTime) && lastNotifEmailTime > (Date.now() - (4 * Basics.dayMillis))) {
        // console.log('Recent notif email', user);
        return null; // sent a missed messages email in the last 48 hours, and they haven't logged in since then
    } 
    console.log('** Needs email', user, Basics.formatTime(lastNotifEmailTime), Basics.formatTime(lastActionTime));

    const pNotifToken = await FBUtil.getDataAsync(['userPrivate', user, 'notifToken'], false);
    const pName = FBUtil.getDataAsync(['userPrivate', user, 'name']);
    const pEmail = FBUtil.getDataAsync(['special', 'userEmail', user]);
    const groups = await FBUtil.getDataAsync(['userPrivate', user, 'group']);
    const notifToken = await pNotifToken;

    // console.log('notifToken', notifToken);

    const missedGroupKeys = _.filter(_.keys(groups), g => 
        groups[g]?.lastMessage?.time > Math.max(lastActionTime, groups[g]?.readTime || 0));
    const pGroupMembers = await FBUtil.getMultiDataAsync(missedGroupKeys, g => ['group', g, 'member']);
    const groupMessages = await FBUtil.getMultiDataAsync(missedGroupKeys, g => ['group', g, 'message']);
    const groupMembers = await pGroupMembers;

    var messageCount = 0;
    var missedGroups = [];
    _.forEach(missedGroupKeys, g => {
        const group = groups[g];
        const messages = groupMessages[g];
        const members = groupMembers[g];
        const newMessageKeys = _.filter(_.keys(messages), m => 
            messages[m].time > Math.max(lastActionTime, group.readTime || 0));
        const groupMessageCount = newMessageKeys.length;
        messageCount += groupMessageCount;

        const newMessageSenders = _.uniq(_.map(newMessageKeys, m => messages[m].from));
        const newMessageSenderNames = _.map(newMessageSenders, s => members[s]?.name || 'Missing Member');

        if (groupMessageCount > 0) {
            missedGroups.push({
                groupMessageCount, groupName: group.name, groupKey: g,
                messageWord: groupMessageCount == 1 ? 'message' : 'messages',
                senderNames: AndFormat.format(newMessageSenderNames)
            })
        } else {
            console.error('Unread group should not have zero unread messages', user, g, groups[g]?.readTime, lastActionTime);
        }
    })

    if (missedGroups.length == 0) {
        console.error('User with recent lastMessage should not have zero unread groups', 
            user, lastMessageTime, lastActionTime);
        return null;
    }

    const name = await pName;
    const email = await pEmail;

    const templateData = {
        name: Basics.firstName(name),
        needsAppPromo: notifToken ? false : true,
        messageCount,
        group: missedGroups
    }

    const htmlTemplate = FS.readFileSync('template/missedmessages.html').toString();
    const textTemplate = FS.readFileSync('template/missedmessages.text').toString();
    const HtmlBody = Mustache.render(htmlTemplate, templateData);
    const TextBody = Mustache.render(textTemplate, templateData);

    var updates = {
        ['/userPrivate/' + user + '/lastNotifEmailTime']: Date.now()
    }

    const groupNames = AndFormat.format(_.map(missedGroups, g => g.groupName));

    return {
        updates, 
        templateData,
        emails: [
            {
                To: name + ' <' + email + '>',
                From: 'Iris Missed Messages <missed@iris-talk.com>',
                Subject: messageCount == 0 ? 'Missed Message' : (messageCount + " Missed Messages"),
                HtmlBody, TextBody
            } 
        ]
    }
}

async function OLD_irisDigestAsync() {
    const members = [
        {name: 'Rob Ennals', user: 'N8D5FfWwTxaJK65p8wkq9rJbPCB3'},
        {name: 'Donald Duck', user: 'hdZ4GQ6KduOvFBkdjuGW5HKJqvu2'},
        {name: 'Albert Einstein', user: 'ubBCBxJzEMZretnB9uHOTkaX1Xs1'},
        {name: 'Elvis Presley', user: 'qmEIIC0LPwUzPscXOeebjIEJsoq2'}
    ]
    const emails = await createMailsForNewGroupAsync({groupName: 'Silly Cats', members, groupKey: '-N9UcS3J-XXp1Yg3tbS3'});
    console.log(emails);
    return {success: true, html: emails[1].HtmlBody, emails:[emails[1]]}
}

async function createMailsForNewGroupAsync({groupName, members, groupKey}) {
    const htmlTemplate = FS.readFileSync('template/newgroup.html').toString();
    const textTemplate = FS.readFileSync('template/newgroup.text').toString();
    const pEmails = FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['special', 'userEmail', k], null);
    const pActiveTimes = FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['userPrivate', k, 'lastAction'], 0);
    const tokens = await FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['userPrivate', k, 'notifToken'], null);
    const emailAddresses = await pEmails;
    const activeTimes = await pActiveTimes;

    var emails = [];

    const timeNow = Date.now();
    const dayAgo = timeNow - Basics.dayMillis;

    console.log('tokens', tokens);

    _.forEach(members, member => {
        const notThem = _.filter(members, m => m.name != member.name);
        const groupMemberNames = AndFormat.format(notThem.map(m => m.name));
        const needsAppPromo = tokens[member.user] == null;
        const templateData = {name: Basics.firstName(member.name), groupName, groupMemberNames, needsAppPromo, groupKey};
        if (activeTimes[member.user] > dayAgo && tokens[member.user]) {
            console.log('no email needed for ' + member.name + ' since they have notifs and are active');
        } else {
            const HtmlBody = Mustache.render(htmlTemplate, templateData);
            const TextBody = Mustache.render(textTemplate, templateData);

            const emailToSend = {
                To: member.name + ' <' + emailAddresses[member.user] + '>',
                From: 'Iris Matching <matching@iris-talk.com>',
                Subject: "We've added you to a new chat - " + groupName,
                HtmlBody, TextBody
            }
            emails.push(emailToSend);
        }
    })
    return emails;
}

exports.createMailsForNewGroupAsync = createMailsForNewGroupAsync;

