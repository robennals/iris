const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const IrisEmail = require('./irisemail');
const { join } = require('path');
const { name_label } = require('./basics');

async function acceptJoinRequestAsync({community, topic, user, userId}) {
    const host = userId;
    const pCommMember = FBUtil.getDataAsync(['commMember', community, user]);
    const pTopicGroup = FBUtil.getDataAsync(['topicGroup', community, topic, host]);
    const pTopicInfo = FBUtil.getDataAsync(['topic', community, topic]);
    const commMember = await pCommMember;
    const topicGroup = await pTopicGroup;
    const topicInfo = await pTopicInfo;
    const userName = commMember.answer[name_label];
    const userPhoto = commMember.photoKey;
    const group = topicGroup.group;
    const topicName = topicInfo.name;
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const members = await pMembers;
    
    const member = {name: userName, photo: userPhoto};
    var updates = {};
    const time = Date.now();
    const lastMessage = {text: userName + ' joined', time}
    updates['/group/' + group + '/member/' + user] = member;
    updates['/group/' + group + '/member/zzz_irisbot'] = {name: 'Irisbot'};
    updates['/adminCommunity/' + community + '/group/' + group + '/member/' + user] = member;
    updates['/topicGroup/' + community + '/' + topic + '/' + host + '/member/' + user] = member;
    updates['/userPrivate/' + user + '/group/' + group] = {
        name: topicName, community, host, lastMessage
    }
    const messageKey = FBUtil.newKey();
    updates['/group/' + group + '/message/' + messageKey] = {time, text: userName + ' joined', from: 'zzz_irisbot'};
    updates['/userPrivate/' + host + '/askToJoin/' + topic + '/' + user + '/state'] = 'joined';
    _.map(_.keys(members), m => {
        updates['/userPrivate/' + m + '/group/' + group + '/lastMessage'] = lastMessage;
    })

    const hostName = members[host].name;

    const notif = {
        title: hostName + ' added you to ' + topicInfo.name,
        toUser: user,
        body: 'Welcome to the ' + topicInfo + '. Hosted by ' + hostName,
        data: {community, topic, group, host, type: 'addToGroup'}
    }

    console.log('updates', updates);
    console.log('notifs', notif);
    // return {success: true}
    return {success: true, updates, notifs: [notif]};
}

exports.acceptJoinRequestAsync = acceptJoinRequestAsync;

async function saveTopicGroupAsync({community, topic, text, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const oldTopicGroup = await FBUtil.getDataAsync(['topicGroup', community, topic, userId], null);
    const userName = await pUserName;
    const userPhoto = await pUserPhoto;

    const group = oldTopicGroup?.group ?? FBUtil.newKey();

    const time = Date.now();

    const newTopicGroup = {
        text,
        fromName: userName,
        fromPhoto: userPhoto,
        text,
        group,
        createTime: time
    }

    const newTopicInfo = {
        fromName: userName, fromPhoto: userPhoto
    }

    var updates = {};
    updates['/topicGroup/' + community + '/' + topic + '/' + userId] = newTopicGroup;
    updates['/topic/' + community + '/' + topic + '/group/' + userId] = newTopicInfo;
    
    return {success: true, updates}
}

exports.saveTopicGroupAsync = saveTopicGroupAsync;

async function askToJoinGroupAsync({community, topic, host, text, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const pTopicInfo = FBUtil.getDataAsync(['topic', community, topic]);
    const topicGroupInfo = await FBUtil.getDataAsync(['topicGroup', community, topic, host], null);
    const userName = await pUserName;
    const userPhoto = await pUserPhoto;
    const topicInfo = await pTopicInfo;    

    const group = topicGroupInfo.group;

    var updates = {};
    const time = Date.now();
    const lastMessage = {
        text: userName + ' asked to join', time
    }

    updates['userPrivate/' + host + '/askToJoin/' + topic + '/' + userId] = {name: userName, photo: userPhoto, text, time};
    if (!topicGroupInfo.member) {
        console.log('creating new group', topicGroupInfo, community, host);
        const hostMember = await FBUtil.getDataAsync(['commMember', community, host]);
        const hostName = hostMember.answer[name_label]
        const hostPhoto = hostMember.photoKey;
        const member = {
            [host]: {name: hostName, photo: hostPhoto}
        }
        const groupInfo = {
            name: topicInfo.name, member, host,
            community, topic, privateName: hostName,
        }
        updates['group/' + group] = groupInfo;
        updates['adminCommunity/' + community + '/group/' + group] = groupInfo;
        updates['userPrivate/' + host + '/group/' + group] = {
            name: topicInfo.name, community, lastMessage, host
        }
        updates['topicGroup/' + community + '/' + topic + '/' + host + '/member'] = member; 
    } else {
        updates['userPrivate/' + host + '/group/' + topicGroupInfo.group + '/lastMessage'] = lastMessage;
    }
    updates['userPrivate/' + userId + '/youAsked/' + community + '/' + topic + '/' + host] = {text, time};

    const notif = {
        title: userName + ' asked to join ' + topicInfo.name,
        toUser: host,
        body: text,
        data: {community, topic, group, host, type: 'askToJoinGroup'}
    }

    console.log('updates', updates);
    console.log('notifs', notif);
    return {success: true, updates, notifs: [notif]};

}
exports.askToJoinGroupAsync = askToJoinGroupAsync;