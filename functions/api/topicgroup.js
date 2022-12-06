const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const IrisEmail = require('./irisemail');

async function saveTopicGroupAsync({community, topic, text, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const oldTopicGroup = await FBUtil.getDataAsync(['topicGroup', community, topic, userId], null);
    const userName = await pUserName;
    const userPhoto = await pUserPhoto;

    const group = oldTopicGroup?.group ?? FBUtil.newKey();

    const newTopicGroup = {
        text,
        fromName: userName,
        fromPhoto: userPhoto,
        text,
        group
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