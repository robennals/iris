const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');

async function saveViewpointAsync({community, topic, text, anonymous, userId}) {
    const pUserName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pUserPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const oldViewpoint = await FBUtil.getDataAsync(['viewpoint', community, topic, userId], null);
    const authorName = await pUserName;
    const authorPhoto = await pUserPhoto;
    var key = oldViewpoint?.key || FBUtil.newKey();

    const time = Date.now();
    var updates = {};
    updates['viewpoint/' + community + '/' + topic + '/' + userId] = {
        text, key, time: oldViewpoint?.time ?? time
    }
    updates['published/' + community + '/' + topic + '/' + key] = {
        text, time: oldViewpoint?.time ?? time,
        authorName: anonymous ? null : authorName,
        authorPhoto: anonymous ? null : authorPhoto,
        anonymous,
        publishTime: oldViewpoint?.time ?? time,
        viewPoint: true 
    }
}

exports.saveViewpointAsync = saveViewpointAsync;

