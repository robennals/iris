const FBUtil = require('../output/fbutil');
const _ = require('lodash');


async function createMemberAsync(person, userEmails) {
    const {name, email, bio} = person;
    var uid = _.findKey(userEmails, userEmail => userEmail == email)

    if (uid) {
        console.log('found existing user ' + uid + ' for ' + email);
        return {uid, name, bio}
    } else {
        uid = await FBUtil.createUser(email);
        console.log('created new user ' + uid + ' - ' + email);
        return {uid, name, bio};        
    }
}

async function adminCreateGroupAsync({name, questions, people, userId}) {
    console.log('adminCreateGroupAsync', name, questions, people);
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const group = FBUtil.newKey();
    
    const pMembers = _.map(people, person => createMemberAsync(person, userEmails));
    const members = await Promise.all(pMembers);
    var updates = {};
    updates['group/' + group + '/name'] = name;
    updates['group/' + group + '/questions'] = questions;

    const memberUids = _.map(members, member => member.uid);

    const photos = await FBUtil.getMultiDataAsync(memberUids, m => ['userPrivate', m, 'photo'], null)
        
    members.forEach(member => {
        const {uid, bio} = member;
        updates['group/' + group + '/member/' + uid + '/name'] = member.name;
        updates['group/' + group + '/member/' + uid + '/bio'] = bio;        
        updates['group/' + group + '/member/' + uid + '/photo'] = photos[uid];
        updates['userPrivate/' + uid + '/name'] = member.name;
        updates['userPrivate/' + uid + '/group/' + group] = {name}
    })

    // console.log('updates', updates);

    return {success: true, updates, data: {group}}
}

exports.adminCreateGroupAsync = adminCreateGroupAsync;

// TODO: Send notification to other group members on mobile
async function sendMessageAsync({group, text, replyTo, userId}) {
    console.log('sendMessageAsync', group, text, userId);
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const members = await pMembers; const groupName = await pGroupName;
    console.log('members', members);
    if (!members[userId]) {
        return {success: false, message: 'access denied'};
    }
    var updates = {};
    const key = FBUtil.newKey();
    const time = Date.now();
    const fromName = members[userId].name;
    updates['group/' + group + '/message/' + key] = {
        time,
        replyTo: replyTo || null,
        text: text || null,
        from: userId
    }   

    var notifs = [];
    const notifBase = {
        title: fromName + ' in ' + groupName,
        body: text,
        data: {
            from: userId, fromName, group, groupName, time, type: 'message'
        }
    }

    // update local state for all members
    Object.keys(members).forEach(member => {
        updates['userPrivate/' + member + '/group/' + group + '/lastMessage'] = {
            text: text || null, time, from: userId, fromName
        };
        if (member != userId) {
            updates['userPrivate/' + member + '/lastMessageTime'] = time;
            const notif = {...notifBase, toUser: member}
            notifs.push(notif);
        }
    })
    return {success: true, updates, notifs}
}

exports.sendMessageAsync = sendMessageAsync;

function markChatReadAsync({group, userId}) {
    var updates = {};
    updates['userPrivate/' + userId + '/group/' + group + '/readTime'] = Date.now();
    return {success: true, updates};
}
exports.markChatReadAsync = markChatReadAsync;

async function setProfilePhotoAsync({photoData, thumbData, userId}) {
    console.log('setProfilePhotoAsync', userId);

    const photoKey = FBUtil.newKey();
    const pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId, key: photoKey});
    const pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId, key: photoKey});
    const pGroups = FBUtil.getDataAsync(['userPrivate', userId, 'group']);

    console.log('requested upload', photoKey);

    const groups = await pGroups;

    var updates = {};
    updates['userPrivate/' + userId + '/photo'] = photoKey;

    const groupKeys = Object.keys(groups);

    const groupMemberEntry = await FBUtil.getMultiDataAsync(
        groupKeys, 
        g => ['group', g, 'member', userId]
    )

    console.log('groupKeys', groupKeys, groupMemberEntry);
    _.forEach(groupKeys, g => {
        if (groupMemberEntry[g]) {
            updates['group/' + g + '/member/' + userId + '/photo'] = photoKey;
        }
    })

    await pPhotoUpload; 
    await pThumbUpload;
    return {success: true, updates};
}
exports.setProfilePhotoAsync = setProfilePhotoAsync;