const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');

async function createMemberAsync(person, userEmails) {
    const {name, email, bio} = person;
    var user = _.findKey(userEmails, userEmail => userEmail == email)

    if (user) {
        console.log('found existing user ' + user + ' for ' + email);
        const photoKey = await FBUtil.getDataAsync(['userPrivate', m, 'photo'], null);
        return {user, name, bio, photoKey}
    } else {
        user = await FBUtil.createUser(email);
        console.log('created new user ' + user + ' - ' + email);
        return {user, name, bio};        
    }
}


function botMessageAsync({group, text, time, updates}) {
    const key = FBUtil.newKey();
    updates['/group/' + group + '/message/' + key] = {
        text, time, from: 'zzz_irisbot'
    }
}

function splitFirst(text, sep) {
    const index = text.indexOf(sep);
    const first = text.slice(0, index);
    const rest = text.slice(index + sep.length);
    return [first, rest]
  }
  

function parseTopics(topicsTxt) {
    const topicList = topicsTxt.trim().split('#').filter(x=>x);
    const parsedTopics = topicList.map(ttxt => {
        const [title,rest] = splitFirst(ttxt, '\n');
        const questions = rest.split('*').filter(x=>x).map(x => x.trim());
        return {title: title.trim(), questions}
    })
    return parsedTopics;
}

const AndFormat = new Intl.ListFormat('en', {style: 'long', type: 'conjunction'});

async function writeIntroMessagesAsync({community, group, topic, members, updates}) {
    const memberNames = members.map(m => m.name);
    const memberAnds = AndFormat.format(memberNames);
    const time = Date.now();

    updates['/group/' + group + '/member/zzz_irisbot/name'] = 'Irisbot';

    var timeIncrement = 0;
    const firstMessageText = 'This is a private conversation about ' + topic 
        + ' between ' + memberAnds
        + '.\nHere are some questions to get you started:'
    botMessageAsync({group, text: firstMessageText, time, updates});

    console.log('firstMessage', firstMessageText);

    const topicsTxt = await FBUtil.getDataAsync(['community', community, 'topics']);
    console.log('topicsTxt', community, topicsTxt);
    const topics = parseTopics(topicsTxt);
    const selectedTopic = _.find(topics, t => t.title == topic);
    if (selectedTopic) {
        selectedTopic.questions.forEach(question => {
            timeIncrement++;
            botMessageAsync({group, text: question, time: time+timeIncrement, updates});
        })
    }
}


async function adminCreateGroupAsync({community, topic, privateName, people, picked}) {
    console.log('adminCreateGroupAsync', community, topic, privateName);
    // return {success: false, message: 'Not completed yet'};

    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const group = FBUtil.newKey();
    
    const pMembers = _.map(people, person => createMemberAsync(person, userEmails));
    const members = [...picked, ...await Promise.all(pMembers)];

    // console.log('members', members);

    const time = Date.now();
    const lastMessage = {text: 'Group Created', time}

    var updates = {};
    updates['group/' + group + '/name'] = topic;
    updates['group/' + group + '/community'] = community;
    updates['group/' + group + '/privateName'] = privateName;
    updates['adminCommunity/' + community + '/group/' + group + '/name'] = topic;
    updates['adminCommunity/' + community + '/group/' + group + '/community'] = community;
    updates['adminCommunity/' + community + '/group/' + group + '/privateName'] = privateName;
    updates['adminCommunity/' + community + '/group/' + group + '/lastMessage'] = lastMessage;

    await writeIntroMessagesAsync({community, group, members, topic, updates});

    members.forEach(member => {
        const {user, name, bio, photoKey, answers} = member;
        const userData = {
            name, bio: bio || null, photo: photoKey || null, answers: answers || null
        }
        updates['group/' + group + '/member/' + user] = userData;
        updates['adminCommunity/' + community + '/group/' + group + '/member/' + user] = userData;

        updates['userPrivate/' + user + '/name'] = name;
        updates['userPrivate/' + user + '/group/' + group] = {name:topic, lastMessage, community}
    })

    console.log('updates', updates);

    // return {success: false, message: 'Not completed yet'};

    return {success: true, updates, data: {group}}
}

exports.adminCreateGroupAsync = adminCreateGroupAsync;

// TODO: Send notification to other group members on mobile
async function sendMessageAsync({messageKey, group, text, replyTo, userId}) {
    console.log('sendMessageAsync', group, text, userId);
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const members = await pMembers; const groupName = await pGroupName;
    console.log('members', members);
    if (!members[userId]) {
        return {success: false, message: 'access denied'};
    }
    var updates = {};
    const key = messageKey || FBUtil.newKey();
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

async function createOrUpdateCommunityAsync({community, photoKey, photoUser, photoData, thumbData, name, info, questions, topics, userId}) {
    const newPhotoKey = photoKey || FBUtil.newKey();

    var pPhotoUpload; var pThumbUpload;
    if (photoData) {
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId, key: newPhotoKey});    
    }

    const communityKey = community || FBUtil.newKey();
    var updates = {};
    updates['community/' + communityKey] = {
        name, info, questions, topics, photoKey: newPhotoKey, photoUser: photoUser || userId
    }

    await pPhotoUpload;
    await pThumbUpload;
    return {success: true, updates, result: {communityKey, photoKey}};
}
exports.createOrUpdateCommunityAsync = createOrUpdateCommunityAsync;

async function submitCommunityFormAsync({community, photoData, thumbData, name, email, answers, selectedTopics, userId}) {
    console.log('submit communityForm', {community, name, email, answers, selectedTopics});

    var uid = userId;
    var created = false;
    if (!uid) {
        const result = await FBUtil.getOrCreateUserAsync(email);      
        uid = result.uid;
        created = result.created;
    }

    const communityName = await FBUtil.getDataAsync(['community', community, 'name']);

    const newPhotoKey = FBUtil.newKey();
    var pPhotoUpload; var pThumbUpload;
    if (photoData) {
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId: uid, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId: uid, key: newPhotoKey});    
    }

    const key = FBUtil.newKey();
    var updates = {};
    const confirmed = userId ? true : false
    updates['intake/' + community + '/' + key] = {
        user: uid, photoKey: newPhotoKey, name, email, answers, selectedTopics, time: Date.now(), confirmed
    }
    if (userId || created) {
        updates['userPrivate/' + uid + '/photo'] = newPhotoKey;
        updates['userPrivate/' + uid + '/name'] = name;
    }

    var emails = [];
    if (!userId) {
        const {HtmlBody, TextBody} = Email.renderEmail('confirm', {
            name, communityName, community, intakeKey: key
        })
        emails.push({
            To: name + '<' + email + '>',
            From: 'Iris Talk <confirm@iris-talk.com>',
            Subject: 'Action Required: Confirm your Signup',
            HtmlBody, TextBody
        })
    }

    return {success: true, updates, emails}
}
exports.submitCommunityFormAsync = submitCommunityFormAsync;


async function confirmSignupAsync({community, intake}) {
    const communityName = await FBUtil.getDataAsync(['community', community, 'name']);

    const template = FS.readFileSync('template/confirmsuccess.html').toString();
    const html = Mustache.render(template, {communityName});

    var updates = {};
    updates['intake/' + community + '/' + intake + '/confirmed'] = true;
    return {success: true, updates, html};
}

exports.confirmSignupAsync = confirmSignupAsync;


async function adminCommandAsync({command, params, userId}) {
    const paramList = params.trim().split('\n').map(x => x.trim()).filter(x => x);
    console.log('adminCommand', command, paramList);

    return {success: true}
}

exports.adminCommandAsync = adminCommandAsync;