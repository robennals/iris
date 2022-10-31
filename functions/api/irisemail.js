const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');
const Iris = require('./iris');

const AndFormat = new Intl.ListFormat('en', {style: 'long', type: 'conjunction'});

const testCommunity = '-NAAotjBwgkzv0pQtxd3';
const demoSociety = '-NALM8Vqo4Tie4rHugnY';

async function autoCloseAsync() {
    const forward = '-NAihY80TpH1i4wGTEA7';
    const autobots = '-NAeYUhZwzFXOB6YqaX3';
    const irisUsers = '-NCS3mSw7G2gm5Koihuc';

    // const result = autoCloseCommunityGroupsAsync({community: irisUsers}); 
    const result = autoCloseGroupsAsync();
    // return result;
    return {success: true}
}
exports.autoCloseAsync = autoCloseAsync;

async function autoCloseGroupsAsync() {
    const communities = await FBUtil.getDataAsync(['community']);
    const communityKeys = _.keys(communities);
    const filteredCommunityKeys = _.filter(communityKeys, c => c != testCommunity && c != demoSociety);
    const autoCloseResults = await Promise.all(filteredCommunityKeys.map(
        community => autoCloseCommunityGroupsAsync({community, name: communities[community].name}))
    );
    var updates = {};
    _.forEach(autoCloseResults, r => {
        updates = {...updates, ...r.updates};
    })
    console.log('updates', updates);
    return {success: true}
}
exports.autoCloseGroupsAsync = autoCloseGroupsAsync;

async function autoCloseCommunityGroupsAsync({community, name=''}) {
    const adminGroups = await FBUtil.getDataAsync(['adminCommunity', community, 'group']);
 
    var updates = {};
    var maybeWakeupGroup = [];
    const oldTime = Date.now() - (4 * Basics.dayMillis);
    _.forEach(_.keys(adminGroups), g => {
        const group = adminGroups[g];
        if (group?.lastMessage?.time < oldTime && group.topic) {
            console.log('old group', name, g, group.name)
            maybeWakeupGroup.push(g);
        }
    })
    const groupWakeup = await FBUtil.getMultiDataAsync(maybeWakeupGroup, g => ['group', g, 'wakeUp'], null);
    const groupArchived = await FBUtil.getMultiDataAsync(maybeWakeupGroup, g => ['group', g, 'archived'], null);

    // console.log('wakeup', groupWakeup);
    var wakeupGroup = [];
    _.forEach(maybeWakeupGroup, g => {
        if (groupWakeup[g] && !groupArchived[g]) {
            console.log('old, woken, not archived', g, adminGroups[g].name);
            wakeupGroup.push(g);
        }
    })
    const archiveResults = await Promise.all(wakeupGroup.map(group => Iris.adminArchiveGroupAsync({group, userId: robUserId})));
    // console.log('archiveResults', archiveResults);
    _.forEach(archiveResults, r => {
        updates = {...updates, ...r.updates};
    })

    console.log('updates', name, updates);
    // return {success: true}
    return {success: true, updates}
}



async function wakeupGroupsAsync() {
    const communities = await FBUtil.getDataAsync(['community']);
    const communityKeys = _.keys(communities);
    const filteredCommunityKeys = _.filter(communityKeys, c => c != testCommunity && c != demoSociety);
    const wakeupResults = await Promise.all(filteredCommunityKeys.map(
        community => wakeupCommunityAsync({community, name: communities[community].name}))
    );
    var updates = {};
    var notifs = [];
    _.forEach(wakeupResults, r => {
        updates = {...updates, ...r.updates};
        notifs = [...notifs, ...r.notifs]
    })
    // console.log('updates', updates);
    // console.log('notifs', notifs);
    // return {success: true, updates};
    return {success: true, updates, notifs}
}
exports.wakeupGroupsAsync = wakeupGroupsAsync;



async function wakeupCommunityAsync({community, name = '', count = 30}) {
    const autobots = '-NAeYUhZwzFXOB6YqaX3';
    const forward = '-NAihY80TpH1i4wGTEA7';
    const fyke = 'tKj77s5p2hTmzn17FpZsRZPTCNT2';
    const groupsToWakeUp = await findGroupsNeedingWakeup({community, name, count})

    console.log('groups to wake up', name, groupsToWakeUp);

    var updates = {};
    var notifs = [];

    const time = Date.now();

    const text = "It's time to wrap up this conversation. " +
    "Each person can write a public highlight to share the insights they think are most important about this topic." +
    // "\n\nYour summary will be published if at least one other person endorses it." +
    "\n\nThis conversation will close after 48 hours of inactivity.";

    const pSendResults = _.map(groupsToWakeUp, group => Iris.sendMessageAsync({group, text, userId: 'zzz_irisbot'}));
    const sendResults = await Promise.all(pSendResults);
    _.forEach(sendResults, sendResult => {
        updates = {...updates, ...sendResult.updates};
        notifs = [...notifs, ...sendResult.notifs]
    })

    _.forEach(groupsToWakeUp, g => {
        updates['group/' + g + '/wakeUp'] = time;
    })

    return {success: true, updates, notifs}
}
// exports.wakeupMessageAsync = wakeupMessageAsync;



// TODO: This will need to be more efficient
async function findGroupsNeedingWakeup({community, name='', count, user=null}) {
    console.log('findGroups', community, name);
    const fourDaysAgo = Date.now() - (Basics.dayMillis * 4);
    const groups = await FBUtil.getDataAsync(['adminCommunity', community, 'group']);
    const groupKeys = _.keys(groups || {});
    const pGroupArchived = FBUtil.getMultiDataAsync(groupKeys, g => ['group', g, 'archived'], null);
    const pGroupWakeup = FBUtil.getMultiDataAsync(groupKeys, g => ['group', g, 'wakeUp'], null);
    // const memberSummaries = await FBUtil.getMultiDataAsync(groupKeys, g => ['group', g, 'memberSummary'], null);
    const groupArchived = await pGroupArchived;
    const groupWakeup = await pGroupWakeup;    
    const groupsToWakeUp = _.filter(groupKeys, g => {
        const group = groups[g];
        const lastTime = group?.lastMessage?.time;
        const stale = lastTime < fourDaysAgo;
        // const hasSummaries = memberSummaries[g];
        const hasWakeUp = groupWakeup[g];
        const archived = groupArchived[g];
        const hasUser = !user || group.member[user];
        console.log('group', group.name, g, stale, lastTime, hasWakeUp, archived);
        return stale && !hasWakeUp && !archived && hasUser && group.topic;   
    });

    const sortedGroups = _.sortBy(groupsToWakeUp, g => groups[g]?.lastMessage?.time);
    const firstSortedGroups = _.slice(sortedGroups, 0, count);

    _.forEach(firstSortedGroups, g => {
        console.log('wake up', name, groups[g].name, g);
    })
    return firstSortedGroups;
}


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
        return null; // no new messages since they last used the app or we last sent an email
    }
    if (lastActionTime > Date.now() - (48 * Basics.hourMillis)) {
        // console.log('Active recently', user);
        return null; // used the app within the last 48 hours.
    }
    if ((lastNotifEmailTime > lastActionTime) && lastNotifEmailTime > (Date.now() - (7 * Basics.dayMillis))) {
        // console.log('Recent notif email', user);
        return null; // sent a missed messages email in the last 7 days, and they haven't logged in since then
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

const robUserId = 'N8D5FfWwTxaJK65p8wkq9rJbPCB3';

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

