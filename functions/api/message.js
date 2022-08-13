const FBUtil = require('../output/fbutil')
const _ = require('lodash');
const { sendNotifAsync } = require('../output/notifs');
const { user } = require('firebase-functions/v1/auth');

function findTaggedPeople({members, text}) {
    const tagged = {};
    _.forEach(_.keys(members), m => {
        const member = members[m];
        const name = member.name;
        if (text.indexOf('@' + name) != -1) {
            tagged[m] = name;
        }
    });
    return tagged;
}

async function postMessageAsync({group, rootKey, photoKey, photoData, editKey, text, type, title, replyTo, userId, membersOnly}) {
    const key = editKey || FBUtil.newKey();
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    // var pRootTitle = null;
    // var pRootMembersOnly = null;
    // var pReplyCount = 0;
    // var pMoreCount = 0;
    // var pRootFrom = null;
    var pRoot = {};
    if (rootKey) {
        pRoot = FBUtil.getDataAsync(['group', group, 'post', rootKey, rootKey]);
        // pRootTitle = FBUtil.getDataAsync(['group', group, 'post', rootKey, rootKey, 'title'], null);
        // pRootMembersOnly = FBUtil.getDataAsync(['group', group, 'post', rootKey, rootKey, 'membersOnly'], null);
        // pRootFrom = FBUtil.getDataAsync(['group', group, 'post', rootKey, rootKey, 'from'], null);
    }
    const pMessages = editKey ? FBUtil.getDataAsync(['group', group, 'post', rootKey]) : null;
    const postKey = rootKey || key;
    var pPhotoUpload = null;
    var newPhotoKey = null;
    if (photoData) {
        newPhotoKey = FBUtil.newKey();
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId, key: newPhotoKey});
    }

    const members = await FBUtil.getDataAsync(['group', group, 'member']);
    const groupName = await pGroupName;
    const root = await pRoot;    
    const rootTitle = root.title;
    const rootMembersOnly = root.membersOnly;
    const rootFrom = root.from;

    console.log('postMessage', group, editKey, text);

    var oldMessage = {replyTo: null};
    var replyUpdates = {};
    if (editKey) {
        const messages = await pMessages;

        oldMessage = messages[editKey];
        if (oldMessage.from != userId) {
            return {success: false, errorMessage: 'Access denied'}
        }     
        const replyKeys = _.keys(messages).filter(k => messages[k].replyTo == editKey);
        const replyUpdatePairs = _.map(replyKeys, k => 
            [['group/' + group + '/post/' + postKey + '/' + k + '/obsolete'], true]
        )   
        replyUpdates = _.fromPairs(replyUpdatePairs);
    } 

    const time = Date.now();

    const message = {
        time: Date.now(),
        text, title: title || null, 
        replyTo: replyTo || oldMessage.replyTo || null,
        from: userId,
        photoKey: newPhotoKey || photoKey || null,
        edited: editKey ? true : null,
        type: type || null,
        membersOnly: oldMessage.membersOnly || (membersOnly ? time : null),
        firstTime: oldMessage.firstTime || oldMessage.time || null
    }

    // console.log('message', message);

    const fromName = members[userId].name;

    var viewerKeys = _.keys(members);
    if (oldMessage.membersOnly || membersOnly) {
        viewerKeys = _.filter(viewerKeys, k => members[k].role != 'visitor');
    }
    const memberUpdatePairs = _.map(viewerKeys, m => 
        [['userPrivate' + '/' + m + '/group/' + group + '/lastMessage'], 
        {text, time: Date.now(), fromName}] 
    );
    const memberUpdates = _.fromPairs(memberUpdatePairs);
    // console.log('memberUpdatePairs', memberUpdatePairs);

    var notif = null;

    var updates = {
        ... memberUpdates,        
        ... replyUpdates,
        ['group/' + group + '/message/' + key]: message,
        ['group/' + group + '/post/' + postKey + '/' + key]: message,
        ['group/' + group + '/memberMsg/' + userId + '/' + postKey + (replyTo ? '/reply' : '/post')]: {
            text, title: title || rootTitle || null, photoKey: photoKey || null, 
            membersOnly: membersOnly || rootMembersOnly || null,
            firstTime: message.firstTime, time,
            key: replyTo ? key : null},
        ['group/' + group + '/memberMsg/' + userId + '/' + postKey + '/time']: message.time,
        ['group/' + group + '/member/' + userId + '/time']: Date.now(),
        ['group/' + group + '/member/' + userId + '/lastMessage']: {
            membersOnly: membersOnly || rootMembersOnly || null,
            text, title: title || rootTitle, isReply: replyTo ? true : null
        },
        ['userPrivate/' + userId + '/group/' + group + '/readTime']: Date.now()
    }

    if (rootKey && replyTo && !editKey) {
        const pReplyCount = FBUtil.getDataAsync(['group', group, 'memberMsg', root.from, rootKey, 'replyCount'], 0);
        const pMoreCount = FBUtil.getDataAsync(['group', group, 'memberMsg', userId, rootKey, 'moreCount'], 0);
        updates['group/' + group + '/memberMsg/' + root.from + '/' + rootKey + '/replyCount'] = (await pReplyCount) + 1;
        updates['group/' + group + '/memberMsg/' + userId + '/' + rootKey + '/moreCount'] = (await pMoreCount) + 1;
        if (root.highlight) {
            updates['group/' + group + '/memberMsg/highlight/' + rootKey + '/replyCount'] = (await pReplyCount) + 1;
        }
    }
    // TODO; write message to different location if members only

    var notifs = [];
    var notifiedUsers = [];

    const action = editKey ? ' edited their reply in ' : (type == 'join' ? ' joined ' : ' replied in ');
    const notifBase = {
        title: fromName + action + (title || rootTitle || ''),
        body: message.text, data: {
            type: type || (editKey ? 'edit' : 'reply'),
            from: userId, fromName, group, groupName,
            messageKey: key, rootKey: rootKey || key, text,
            threadTitle: title || rootTitle || null,
            replyTo: message.replyTo, 
            time: Date.now()
        }
    }

    const tagged = findTaggedPeople({members, text});
    _.forEach(_.keys(tagged), m => {
        const action = editKey ? ' edited a post that tags you in ' : ' tagged you in ';
        notif = {...notifBase, toUser: m, 
            title: fromName + action + (title || rootTitle || ''),
            data: {...notifBase.data, type: 'tag'}
        }
        notifs.push(notif);
    });

    if (message.replyTo) {
        const replyToMessage = await FBUtil.getDataAsync(['group', group, 'post', postKey, message.replyTo]);

        notif = {...notifBase, toUser: replyToMessage.from}
        notifs.push(notif);
        notifiedUsers[replyToMessage.from] = true;
    }

    if (type == 'join') {
        const admins = _.filter(_.keys(members), m => members[m].role == 'admin');
        _.forEach(admins, a => {
            const notif = {...notifBase, toUser: a};
            notifs.push(notif);
        })       
    }

    if (editKey) {
        const messages = await pMessages;
        _.forEach(_.keys(messages), k => {
            const otherMessage = messages[k];
            if (otherMessage.replyTo == editKey && !notifiedUsers[otherMessage.from]) {
                notif = {...notifBase, toUser: otherMessage.from}
                notifs.push(notif);
                notifiedUsers[otherMessage.from] = true;                    
            }
        })
    }

    await pPhotoUpload;

    return {success: true, updates, notifs, data: {key}}
}

exports.postMessageAsync = postMessageAsync;


async function validateReplyAsync({group, rootKey, messageKey, userId}) {
    const message = await FBUtil.getDataAsync(['group', group, 'post', rootKey, messageKey]);
    const parent = await FBUtil.getDataAsync(['group', group, 'post', rootKey, message.replyTo]); 
    if (parent.from != userId) {
        return {success: false, errorMessage: 'access denied'};
    }
    const updates = {
        ['group/' + group + '/post/' + rootKey + '/' + messageKey + '/obsolete']: false
    }

    return {success: true, updates};
}

exports.validateReplyAsync = validateReplyAsync;


async function highlightToParentGroupAsync({message, messageKey, group, subgroup, highlight}) {
    var updates = {};
    const pGroupMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const pSubgroupMembers = FBUtil.getDataAsync(['group', subgroup, 'member']);
    const pSubgroupName = FBUtil.getDataAsync(['group', subgroup, 'name']);
    const groupMembers = await pGroupMembers;
    const subgroupMembers = await pSubgroupMembers;
    const subgroupName = await pSubgroupName;
    
    updates['group/' + group + '/submsg/' + subgroup + '/' + messageKey] = highlight ? message : null;           
    if (highlight) { 
        updates['group/' + group + '/subgroup/' + subgroup + '/time'] = Date.now();
        updates['group/' + group + '/subgroup/' + subgroup + '/lastMessage'] = {text: message.text, title: message.title};
    } else {
        updates['group/' + group + '/subgroup/' + subgroup + '/lastMessage'] = {text: '', title: 'Highlight removed'}
    }

    const membersNotInSubgroup = _.filter(_.keys(groupMembers), k => !subgroupMembers[k]);
    _.forEach(membersNotInSubgroup, m => {
        updates['userPrivate/' + m + '/group/' + group + '/lastMessage'] = {text: message.text, time: Date.now(), fromName: subgroupName};
    })

    return updates;
}


async function highlightMessageAsync({group, messageKey, highlight}) {
    const pGroupParents = FBUtil.getDataAsync(['group', group, 'parent']);
    const pMessage = FBUtil.getDataAsync(['group', group, 'post', messageKey, messageKey]);
    const groupParents = await pGroupParents;
    const message = await pMessage;

    const pReplyCount = FBUtil.getDataAsync(['group', group, 'memberMsg', message.from, messageKey, 'replyCount'], 0);

    var updates = {
        ['group/' + group + '/post/' + messageKey + '/' + messageKey + '/highlight']: highlight
    }

    if (groupParents && !message.membersOnly) {
        const pSubs = _.map(_.keys(groupParents), p => highlightToParentGroupAsync({message, messageKey, group: p, subgroup: group, highlight}));
        const subUpdates = await Promise.all(pSubs);
        subUpdates.forEach(subUp => {
            updates = {...updates, ...subUp};
        })
    }
    if (highlight) {
        updates['group/' + group + '/member/highlight/lastMessage'] = message
        updates['group/' + group + '/member/highlight/time'] = Date.now()
        updates['group/' + group + '/memberMsg/highlight/' + messageKey + '/post'] = message
        updates['group/' + group + '/memberMsg/highlight/' + messageKey + '/time'] = Date.now()
        updates['group/' + group + '/memberMsg/highlight/' + messageKey + '/replyCount'] = await pReplyCount
    } else {
        updates['group/' + group + '/memberMsg/highlight/' + messageKey] = null
        updates['group/' + group + '/member/highlight/lastMessage'] = {text: '', title: 'Highlight removed'}
    }
    // if (groupParents) {
    //     _.forEach(_.keys(groupParents), g => {
    //         updates['group/' + g + '/submsg/' + group + '/' + messageKey] = highlight ? message : null;           
    //         if (highlight) { 
    //             updates['group/' + g + '/subgroup/' + group + '/time'] = Date.now();
    //             updates['group/' + g + '/subgroup/' + group + '/lastMessage'] = {text: message.text, title: message.title};
    //         } else {
    //             updates['group/' + g + '/subgroup/' + group + '/lastMessage'] = {text: '', title: 'Highlight removed'}
    //         }
    //     })
    // }

    return {success: true, updates};
}
exports.highlightMessageAsync = highlightMessageAsync;


async function likeMessageAsync({group, rootKey, title, messageKey, like, userId}) {
    const pMessage = FBUtil.getDataAsync(['group', group, 'post', rootKey, messageKey]);
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const fromName = await FBUtil.getDataAsync(['group', group, 'member', userId, 'name']);
    const message = await pMessage; const groupName = await pGroupName;
    const updates = {
        ['group/' + group + '/post/' + rootKey + '/' + messageKey + '/like/' + userId]: like ? Date.now() : null
    }

    const notif = {
        toUser: message.from,
        title: fromName + ' liked your message',
        body: message.text,
        data: {
            type: 'like', 
            noEmail: true,
            from: userId, fromName, group, groupName, 
            messageKey, rootKey, text: message.text,
            threadTitle: title, time: Date.now()
        }
    }    

    // console.log('likeMessage', updates);

    return {success: true, notifs: like ? [notif] : [], updates};
}
exports.likeMessageAsync = likeMessageAsync;


