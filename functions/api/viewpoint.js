const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');

async function saveViewpointAsync({community, topic, text, anonymous, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const pFollowMembers = FBUtil.getDataAsync(['commMember', community]);
    const pTopicName = FBUtil.getDataAsync(['topic', community, topic, 'name']);
    const pPublished = FBUtil.getDataAsync(['published', community, topic]);
    const oldViewpoint = await FBUtil.getDataAsync(['viewpoint', community, topic, userId], null);
    const authorName = await pUserName;
    const authorPhoto = await pUserPhoto;
    const topicName = await pTopicName;
    const followMembers = await pFollowMembers;
    const published = await pPublished;
    var key = oldViewpoint?.key || FBUtil.newKey();

    const time = Date.now();
    var updates = {};
    updates['viewpoint/' + community + '/' + topic + '/' + userId] = {
        text, key, time: oldViewpoint?.time ?? time
    }

    const pubMessage = {
        text, time: oldViewpoint?.time ?? time,
        authorName: anonymous ? 'Anonymous' : authorName,
        authorPhoto: anonymous ? null : authorPhoto,
        anonymous,
        vote: oldViewpoint?.vote ? oldViewpoint.vote : null,
        publishTime: oldViewpoint?.time ?? time,
        viewPoint: true 
    }

    updates['published/' + community + '/' + topic + '/' + key] = pubMessage;

    if (!oldViewpoint) {
        updates['topic/' + community + '/' + topic + '/lastMessage'] = pubMessage; 
    }

    const oldPublishCount = _.keys(published).length;
    const newPublishCount = oldViewpoint ? oldPublishCount : oldPublishCount + 1;

    updates['topic/' + community + '/' + topic + '/publishCount'] = newPublishCount;
 
    const lastMessage = {
        text: 'New Viewpoint in ' + topicName,
        time: Date.now()
    }

    _.forEach(_.keys(followMembers || {}), m => {
        if (followMembers[m]?.topic?.[topic] == 'yes' && m != userId) {
            // console.log('follower', m, community, topicName);
            updates['userPrivate/' + m + '/comm/' + community + '/lastMessage'] = lastMessage;
        }
    })
    updates['community/' + community + '/lastMessage'] = lastMessage;


    return {success: true, updates};
}

exports.saveViewpointAsync = saveViewpointAsync;

