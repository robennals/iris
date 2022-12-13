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

async function editPostAsync({community, post, title, text, userId}) {
    const pCommMember = FBUtil.getDataAsync(['commMember', community, userId]);
    const pOldPost = post && FBUtil.getDataAsync(['post', community, post], null);

    const commMember = await pCommMember;
    const oldPost = await pOldPost;
    const fromName = commMember.answer[name_label];
    const fromPhoto = commMember.photoKey;

    if (!isMasterUser(userId) && post && oldPost && oldPost.from != userId) {
        return accessDeniedResult;
    }

    const group = oldPost?.group ?? FBUtil.newKey();
    const postKey = post ?? FBUtil.newKey();

    const postData = {        
        text, title, group,
        from: oldPost?.from || userId,
        fromName: oldPost?.fromName || fromName, 
        fromPhoto: oldPost?.fromPhoto || fromPhoto, 
        members: oldPost?.members || null,
        createTime: oldPost?.createTime || Date.now(),
        editTime: oldPost ? Date.now() : null,
    }

    var updates = {};
    updates['post/' + community + '/' + postKey] = postData;

    return {success: true, updates};
}

exports.editPostAsync = editPostAsync;
