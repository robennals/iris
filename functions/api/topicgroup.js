const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const IrisEmail = require('./irisemail');
const { join } = require('path');
const { name_label } = require('./basics');

async function acceptJoinRequestAsync({community, post, user, userId}) {
    const host = userId;
    const pCommMember = FBUtil.getDataAsync(['commMember', community, user]);
    const pPostInfo = FBUtil.getDataAsync(['post', community, post]);
    const group = post;
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const members = await pMembers;
    const postInfo = await pPostInfo;
    const commMember = await pCommMember;
    const userName = commMember.answer[name_label];
    const userPhoto = commMember.photoKey;
    const postName = postInfo.title;
    
    const member = {name: userName, photo: userPhoto || null, time: Date.now()};
    var updates = {};
    const time = Date.now();
    const lastMessage = {text: userName + ' joined', time}
    updates['/group/' + group + '/member/' + user] = member;
    updates['/group/' + group + '/member/zzz_irisbot'] = {name: 'Irisbot'};
    updates['/adminCommunity/' + community + '/group/' + group + '/member/' + user] = member;
    updates['/post/' + community + '/' + post + '/member/' + user] = member;
    updates['/post/' + community + '/' + post + '/lastJoinTime'] = Date.now();
    updates['/userPrivate/' + user + '/group/' + group] = {
        name: postName, community, host, lastMessage
    }
    const messageKey = FBUtil.newKey();
    updates['/group/' + group + '/message/' + messageKey] = {time, text: userName + ' joined', from: 'zzz_irisbot'};
    updates['/userPrivate/' + host + '/askToJoinGroup/' + group + '/' + user + '/state'] = 'joined';
    _.map(_.keys(members), m => {
        updates['/userPrivate/' + m + '/group/' + group + '/lastMessage'] = lastMessage;
    })

    const hostName = members[host].name;

    const notif = {
        title: hostName + ' added you to ' + postInfo.title,
        toUser: user,
        body: 'Welcome to ' + postInfo.title + '. Hosted by ' + hostName,
        data: {community, group, host, type: 'addToGroup'}
    }

    const emails = await IrisEmail.createMailForGroupAcceptAsync({community, group, groupName: postName, hostName, user});

    console.log('updates', updates);
    console.log('notifs', notif);
    console.log('emails', emails);
    return {success: true, updates, notifs: [notif], emails};
}

exports.acceptJoinRequestAsync = acceptJoinRequestAsync;

async function saveTopicGroupAsync({community, topic, text, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const oldTopicGroup = await FBUtil.getDataAsync(['topicGroup', community, topic, userId], null);
    const userName = await pUserName;
    const userPhoto = await pUserPhoto || null;

    const group = oldTopicGroup?.group ?? FBUtil.newKey();

    const time = Date.now();

    const newTopicGroup = {
        text,
        fromName: userName,
        fromPhoto: userPhoto || null,
        text,
        group,
        createTime: time
    }

    const newTopicInfo = {
        fromName: userName, fromPhoto: userPhoto || null
    }

    var updates = {};
    updates['/topicGroup/' + community + '/' + topic + '/' + userId] = newTopicGroup;
    updates['/topic/' + community + '/' + topic + '/group/' + userId] = newTopicInfo;
    
    return {success: true, updates}
}

exports.saveTopicGroupAsync = saveTopicGroupAsync;

async function askToJoinGroupAsync({community, post, text, userId}) {
    const pCommMember = FBUtil.getDataAsync(['commMember', community, userId]);
    const pPostInfo = FBUtil.getDataAsync(['post', community, post]);

    const commMember = await pCommMember;
    const postInfo = await pPostInfo;
    const userName = commMember.answer[name_label];
    const userPhoto = commMember.photoKey;

    const group = post;
    const host = postInfo.from;

    var updates = {};
    const time = Date.now();
    const lastMessage = {
        text: userName + ' asked to join', time
    }

    updates['userPrivate/' + host + '/askToJoinGroup/' + group + '/' + userId] = {name: userName, photo: userPhoto || null, text, time};
    if (!postInfo.member) {
        console.log('creating new group', postInfo, community, host);
        const hostMember = await FBUtil.getDataAsync(['commMember', community, host]);
        const hostName = hostMember.answer[name_label]
        const hostPhoto = hostMember.photoKey || null;
        const member = {
            [host]: {name: hostName, photo: hostPhoto || null, time: postInfo.createTime},
        }

        const message = await writeIntroMessagesAsync({postInfo, host});

        const groupInfo = {
            name: postInfo.title, member, host, message,
            community, privateName: hostName,
        }
        updates['group/' + group] = groupInfo;
        updates['adminCommunity/' + community + '/group/' + group] = groupInfo;
        updates['userPrivate/' + host + '/group/' + group] = {
            name: postInfo.title, community, lastMessage, host
        }
        updates['post/' + community + '/' + post + '/member'] = member; 

    } else {
        updates['userPrivate/' + host + '/group/' + group + '/lastMessage'] = lastMessage;
    }
    updates['userPrivate/' + userId + '/youAskedPost/' + community + '/' + post + '/' + host] = {text, time};

    const notif = {
        title: userName + ' asked to join ' + postInfo.title,
        toUser: host,
        body: text,
        data: {community, group, host, type: 'askToJoinGroup'}
    }

    const emails = await IrisEmail.createMailForAskToJoinGroupAsync({community, group, userName, groupName: postInfo.title, requestText: text, host});

    console.log('updates', updates);
    console.log('notifs', notif);
    console.log('emails', emails);
    return {success: true, updates, notifs: [notif], emails};
    // return {success: true}
}
exports.askToJoinGroupAsync = askToJoinGroupAsync;


async function writeIntroMessagesAsync({postInfo, host}) {
    const time = Date.now();

    var messages = {};

    hostMessage({text: postInfo.text, time, messages, host});

    if (postInfo.questions) {
        const parsedQuestions = _.filter(_.map((postInfo.questions || '').split('\n'), q => q.trim()), s => s);

        var timeIncrement = 0;
        parsedQuestions.forEach(question => {
            timeIncrement++;
            // questions.push(question);
            hostMessage({text: question, time: time+timeIncrement, messages, host});
        })
    }

    return messages;
}

function hostMessage({text, time, messages, host}) {
    const key = FBUtil.newKey();
    messages[key] = {
        text, time, from: host
    }
}

