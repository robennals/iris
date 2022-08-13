const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');

const maxSnippetLength = 120;

function trimText(text, length = maxSnippetLength) {
    if (text.length < maxSnippetLength) {
        return text;
    } else {
        const snipped = text.slice(0,length);
        const lastWord = _.lastIndexOf(text, ' ');
        return snipped.slice(0,lastWord) + '...';
    }
}

function groupHasUpdated({groupSet, groupKey, lastDigest}) {
    const lastMessageTime = _.get(groupSet, [groupKey, 'lastMessage', 'time'], 0);
    const lastReadTime = _.get(groupSet, [groupKey, 'readTime'], 0)
    return (lastMessageTime > lastDigest) && (lastMessageTime > lastReadTime);
}

function getRootForMessage({messages, messageKey}) {
    const message = messages[messageKey] || {};
    // console.log('getRootForMessage', messageKey, message);
    if (message.replyTo) {
        return getRootForMessage({messages, messageKey: message.replyTo});
    } else {
        return messageKey;
    }
} 

function getMessagesByAuthor(messages) {
    var byAuthor = {};
    Object.keys(messages).forEach(m => {
        const message = messages[m];
        if (!byAuthor[message.from]) {
            byAuthor[message.from] = [];
        }
        byAuthor[message.from].push(m);
    })
    return byAuthor;
}

function isMessageUnread({messages, message, readTime, threadReadTime}) {
    const time = messages[message].time;
    const rootKey = getRootForMessage({messages, messageKey: message});
    const rootReadTime = _.get(threadReadTime,rootKey,0)
    // console.log('isMessageUnread', message, time, rootReadTime, readTime, time > readTime, time > rootReadTime, rootKey);
    return (time > readTime && time > rootReadTime)
}


function getDigestForMember({user, members, member, messages, memberMessageKeys, readTime, threadReadTime}) {
    // console.log('readTime', readTime);
    // console.log('threadReadTime', threadReadTime);
    // console.log('memberMessages', memberMessageKeys )
    const userIsMember = members[user].role != 'visitor';
    var visibleMessages = memberMessageKeys;
    if (userIsMember) {
        visibleMessages = memberMessageKeys;
    } else {
        visibleMessages = _.filter(memberMessageKeys, k => !messages[k].membersOnly);
    }
    const unreadMessageKeys = _.filter(visibleMessages, message => isMessageUnread({messages, message, readTime, threadReadTime}));
    // console.log('unreadMessageKeys', unreadMessageKeys);
    const sortedMyMessageKeys = _.sortBy(unreadMessageKeys, m => messages[m].time).reverse();
    // console.log('sortedMyMessageKeys', sortedMyMessageKeys);
    var newMessages = [];
    var seenRoots = {};
    // console.log('messages', messages);
    // console.log('sortedMyMessageKeys', sortedMyMessageKeys);
    _.forEach(sortedMyMessageKeys.slice(0,4), messageKey => {
        const message = _.get(messages, messageKey, {});
        // console.log('message', messageKey, message);

        const rootKey = getRootForMessage({messages, messageKey});
        if (!seenRoots[rootKey]) {
            const title = _.get(messages, [rootKey, 'title'], 'No Subect');
            seenRoots[rootKey] = true;
            newMessages.push({
                title,
                text: trimText(message.text, maxSnippetLength - title.length),
                isReply: message.replyTo,
            })
        }
    })
    // const lastMessageKey = sortedMyMessageKeys[0];
    // const lastMessage = _.get(messages, lastMessageKey, {});
    // const rootKey = getRootForMessage({messages, messageKey: lastMessageKey});
    // const root = messages[rootKey];
    // const title = _.get(messages, [rootKey, 'title'], 'No Subject');
    // // console.log('memberMessage', lastMessageKey, lastMessage);
    // console.log('root', rootKey, root);

    const moreCount = unreadMessageKeys.length - 4;
    const hasMoreCount = moreCount > 4;
    return {
        memberName: _.get(members, [member, 'name']),
        messages: newMessages,
        moreCount, hasMoreCount
    }
}

async function getDigestDataForGroupAsync({user, group, readTime, threadReadTime, lastDigest}) {
    const groupData = await FBUtil.getDataAsync(['group', group]);
    const people = _.get(groupData, 'member', {});
    const messages = _.get(groupData, 'message', {});
    if (groupData.noDigest) {
        return null;
    }
    const memberKeys = _.filter(_.keys(people), p => people[p].role == 'member' || people[p].role == 'admin');
    const unreadMemberKeys = _.filter(memberKeys, p => p != user && people[p].time > _.max([_.get(readTime, p, 0), lastDigest]));
    const messagesByAuthor = getMessagesByAuthor(messages);
    const pMemberDigests = _.map(unreadMemberKeys, member => 
        getDigestForMember({user, members: people, member, messages, 
            readTime: _.get(readTime, member, 0), threadReadTime,
            memberMessageKeys: _.get(messagesByAuthor, member, [])}));
    const memberDigests = await Promise.all(pMemberDigests);
    if (memberDigests.length == 0) {
        return null;
    }
    return {
        groupName: _.get(groupData, 'name'),
        groupUrl: 'https://talkwell.net/group/' + group,
        leaveGroupUrl: 'https://talkwell.net/leaveGroup/' + group,
        memberDigests
    }
}


async function getDigestDataForUserAsync(user) {
    const pLastDigest = FBUtil.getDataAsync(['userPrivate', user, 'lastDigest'],0);
    const pReadTime = FBUtil.getDataAsync(['userPrivate', user, 'readTime']);
    const pThreadReadTime = FBUtil.getDataAsync(['userPrivate', user, 'threadReadTime']);
    const groupSet = await FBUtil.getDataAsync(['userPrivate', user, 'group']);
    const lastDigest = await pLastDigest;
    const readTime = await pReadTime; const threadReadTime = await pThreadReadTime;

    const updatedGroupKeys = _.filter(_.keys(groupSet), groupKey => 
        groupHasUpdated({groupSet, groupKey, lastDigest}));
    // console.log('updatedGroupKeys', updatedGroupKeys, _.keys(groupSet));

    const sortedGroupKeys = _.sortBy(updatedGroupKeys, g => groupSet.readTime);

    const pGroupData = _.map(sortedGroupKeys, group => 
        getDigestDataForGroupAsync({user, group, readTime: readTime[group], threadReadTime: threadReadTime[group], lastDigest}));
    const groupData = await Promise.all(pGroupData);
    const nonEmptyGroupData = _.filter(groupData);

    const groupNames = _.map(nonEmptyGroupData, group => group.groupName);
    const subject = 'Updates from ' + _.join(groupNames, ', ');

    if (nonEmptyGroupData.length == 0) {
        return null;
    }

    return {groupData: nonEmptyGroupData, subject};
}

const secondMillis = 1000;
const minuteMillis = 60*secondMillis;
const hourMillis = 60*minuteMillis;
const dayMillis = 24*hourMillis;
const weekMillis = 7*dayMillis;
const monthMillis = 30*dayMillis;

function freqToMillis(freq) {
    switch(freq) {
        case 'daily': return dayMillis;
        case 'weekly': return weekMillis
        case 'monthly': return monthMillis;
        case 'never': return 0;
    }
}

const emptyDigest = {success: 'true', empty: true, html: 'No Digest'};

async function getMyDigestAsync(params) {
    const user = params.user;
    // console.log('myDigest', user);
    const pUserFreq = FBUtil.getDataAsync(['userPrivate', user, 'digestFreq'], 'daily');
    const pLastAction = FBUtil.getDataAsync(['userPrivate', user, 'lastAction'], 0);
    const pUserEmail = FBUtil.getDataAsync(['special','userEmail', user]);
    const userFreq = await pUserFreq; const lastAction = await pLastAction;
 
    if (userFreq == 'never') return emptyDigest;
    if (lastAction + freqToMillis(userFreq) > Date.now()) {
        // console.log('last digest to recent', lastAction, freqToMillis(userFreq), Date.now());
        return emptyDigest;
    }

    const digestData = await getDigestDataForUserAsync(user);
    if (!digestData) {
        // console.log('digest would be empty');
        return emptyDigest;
    }

    const userEmail = await pUserEmail;
    const template = FS.readFileSync('template/digest.html').toString();
    const html = Mustache.render(template, {...digestData, userFreq});
    const updates = {
        ['userPrivate/' + user + '/lastDigest']: Date.now(),
        ['userPrivate/' + user + '/lastAction']: Date.now()
    }
    // console.log('updates', updates);
    // console.log('subject', digestData.subject);
    // console.log('email', user, userEmail);
    const email = {
        To: userEmail,
        From: 'TalkWell Digest <digest@talkwell.net>',
        Subject: digestData.subject,
        HtmlBody: html
    }
    return {success: true, html, updates: params.update ? updates : {}, emails: params.email ? [email] : null};
}

exports.getMyDigestAsync = getMyDigestAsync;



async function getAllDigestsAsync(params) {
    // console.log('getAllDigests');
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const users = _.keys(userEmails);
    // console.log('users', users);
    const pDigests = _.map(users, user => getMyDigestAsync({user, email: true, update: true}));
    const digests = _.filter(await Promise.all(pDigests), d => !d.empty);

    const allTemplate = FS.readFileSync('template/alldigest.html').toString();
    const allHtml = Mustache.render(allTemplate, {digests}); 

    const allEmails = _.map(digests, d => d.emails[0]);

    console.log('digest[0]', digests[3].emails);
    console.log('updates[0]', digests[3].updates);
    // console.log('allEmails[0]', allEmails[0]);
    // console.log('allEmails', allEmails);

    return {success: true, html: allHtml};
}

exports.getAllDigestsAsync = getAllDigestsAsync;

function mergeMapList(mapList) {
    return _.reduce(mapList, (a,b) => ({...a, ...b}))
}

function mergeListList(listList) {
    return _.reduce(listList, (a,b) => ([...a, ...b]))
}


async function sendAllDigestsAsync(params) {
    // console.log('sendAllDigests');
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const users = _.keys(userEmails);
    // console.log('users', users);
    const pDigests = _.map(users, user => getMyDigestAsync({user, email: true, update: true}));
    const digests = _.filter(await Promise.all(pDigests), d => !d.empty);

    const allEmails = mergeListList(_.map(digests, d => d.emails));
    const allUpdates = mergeMapList(_.map(digests, d => d.updates));

    return {success: true, emails: allEmails, updates: allUpdates};    
}





async function maybeSendWeeklyDigest() {
    const lastScheduledDigest = await FBUtil.getDataAsync(['special', 'lastScheduledDigest'], 0);
    const nextScheduledDigest = lastScheduledDigest + dayMillis;
    var updates = {};
    if (Date.now() > nextScheduledDigest) {
        console.log('new digest due');
        console.log('schedule', lastScheduledDigest, nextScheduledDigest, Date.now());

        updates['special/lastScheduledDigest'] = Date.now();
        const digests = await sendAllDigestsAsync();
        return {success: true, emails: digests.emails, updates: {...updates, ...digests.updates}};
    } else {
        return {success: true}
    }

}
exports.maybeSendWeeklyDigest = maybeSendWeeklyDigest;

