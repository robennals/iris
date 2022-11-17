const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const { sendMessageAsync } = require('./iris');

async function saveViewpointAsync({community, topic, text, anonymous, ip, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const pFollowMembers = FBUtil.getDataAsync(['commMember', community]);
    const pTopicName = FBUtil.getDataAsync(['topic', community, topic, 'name']);
    const pPublished = FBUtil.getDataAsync(['published', community, topic]);
    const pGroups = FBUtil.getDataAsync(['userPrivate', userId, 'group']);
    const oldViewpoint = await FBUtil.getDataAsync(['viewpoint', community, topic, userId], null);
    const authorName = await pUserName;
    const authorPhoto = await pUserPhoto;
    const topicName = await pTopicName;
    const followMembers = await pFollowMembers;
    const published = await pPublished;
    const groups = await pGroups;
    var key = oldViewpoint?.key || FBUtil.newKey();

    const time = Date.now();
    var updates = {};

    const pubMessage = {
        text, time: oldViewpoint?.time ?? time,
        authorName: anonymous ? 'Anonymous' : authorName,
        authorPhoto: anonymous ? null : authorPhoto,
        from: anonymous ? null : userId,
        anonymous,
        vote: oldViewpoint?.vote ? oldViewpoint.vote : null,
        publishTime: oldViewpoint?.time ?? time,
        viewPoint: true,
        key
    }

    updates['viewpoint/' + community + '/' + topic + '/' + userId] = pubMessage;


    updates['memberViewpoint/' + community + '/' + userId + '/' + topic] = pubMessage;
    updates['published/' + community + '/' + topic + '/' + key] = pubMessage;

    const lastMessage = {
        text: 'New Viewpoint in ' + topicName,
        time: Date.now()
    }

    if (!oldViewpoint) {
        updates['topic/' + community + '/' + topic + '/lastMessage'] = pubMessage; 
        updates['community/' + community + '/lastMessage'] = lastMessage;
    }

    const oldPublishCount = _.keys(published).length;
    const newPublishCount = oldViewpoint ? oldPublishCount : oldPublishCount + 1;

    updates['topic/' + community + '/' + topic + '/publishCount'] = newPublishCount;
 

    _.forEach(_.keys(followMembers || {}), m => {
        if (followMembers[m]?.topic?.[topic] == 'yes' && m != userId) {
            // console.log('follower', m, community, topicName);
            updates['userPrivate/' + m + '/comm/' + community + '/lastMessage'] = lastMessage;
        }
    })

    const groupsOnTopic = _.filter(_.keys(groups), g => groups[g].community == community && groups[g].name == topicName);
    console.log('groupsOnTopic', groupsOnTopic);
    const pSendGroupMessages = Promise.all(_.map(groupsOnTopic, g => 
        sendViewpointMessageForGroupAsync({community, firstViewpoint: oldViewpoint ? null : true, topic, text, key, userId, groupKey:g, ip})));

    const groupSendResults = await pSendGroupMessages;
    console.log('groupSendResults', groupSendResults);
    _.forEach(groupSendResults, result => {
        updates = {...updates, ...result.updates}
    })

    return {success: true, updates: updates};
}

exports.saveViewpointAsync = saveViewpointAsync;


async function sendViewpointMessageForGroupAsync({key, firstViewpoint, text, groupKey, userId, ip}) {
    console.log('sendViewpoint', groupKey, key);
    return await sendMessageAsync({viewpoint: key, firstViewpoint, silent: true, group:groupKey, 
        text, userId, ip})   
}

