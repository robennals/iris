const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const IrisEmail = require('./irisemail');
const { join } = require('path');
const { name_label } = require('./basics');
const { isMasterUser, accessDeniedResult } = require('./iris');

async function editPostAsync({community, post, title, text, questions, userId}) {
    const pMembers = FBUtil.getDataAsync(['commMember', community]);
    const pOldPost = post && FBUtil.getDataAsync(['post', community, post], null);

    const members = await pMembers;
    const commMember = members[userId];
    const oldPost = await pOldPost;
    const fromName = commMember.answer[name_label];
    const fromPhoto = commMember.photoKey;

    if (!isMasterUser(userId) && post && oldPost && oldPost.from != userId) {
        return accessDeniedResult;
    }

    const postKey = post ?? FBUtil.newKey();
    const time = Date.now();

    const postData = {        
        text, title, questions,
        from: oldPost?.from || userId,
        fromName: oldPost?.fromName || fromName, 
        fromPhoto: oldPost?.fromPhoto || fromPhoto, 
        members: oldPost?.members || null,
        createTime: oldPost?.createTime || time,
        editTime: oldPost ? Date.now() : null,
    }

    var updates = {};
    updates['post/' + community + '/' + postKey] = postData;

    const lastMessage = {text: fromName + ': ' + title, time};

    if (!oldPost) {
        updates['community/' + community + '/lastMessage'] = lastMessage
        _.forEach(_.keys(members), member => {
            updates['userPrivate/' + member + '/comm/' + community + '/lastMessage/'] = lastMessage;
        })
    }

    return {success: true, updates};
}

exports.editPostAsync = editPostAsync;


async function editUpdateAsync({community, post, update, text, userId}) {
    if (post) {
        const postInfo = await FBUtil.getDataAsync(['post', community, post]);
        if (postInfo.from != userId) {
            console.log('postInfo', postInfo);
            console.log('userId', userId);
            return accessDeniedResult;
        }
    }

    const updateKey = update || FBUtil.newKey();
    var updates = {};
    const time = Date.now();
    const postUpdate = {text, time};
    if (!update) {        
        updates['post/' + community + '/' + post + '/lastUpdate'] = postUpdate;
        updates['group/' + post + '/message/' + updateKey] = {...postUpdate, isUpdate: true, from: userId};
    } else {
        updates['group/' + post + '/message/' + updateKey + '/text'] = text;
        updates['group/' + post + '/message/' + updateKey + '/editTime'] = time;    
    }
    updates['update/' + community + '/' + post + '/' + updateKey] = postUpdate;

    return {success: true, updates}
}

exports.editUpdateAsync = editUpdateAsync;

