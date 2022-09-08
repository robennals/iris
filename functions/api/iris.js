const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

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
    if (index != -1) {
        const first = text.slice(0, index);
        const rest = text.slice(index + sep.length);
        return [first, rest]
    } else {
        return [text, '']
    }
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

async function maybeSendNextQuestionAsync({group, irisBotGroup}) {
    console.log('maybeSendNextQuentionAsync', group, irisBotGroup);
    const dayAgo = Date.now() - dayMillis;
    if (irisBotGroup.lastMessageTime > dayAgo) {
        console.log('still active', group);
        return;
    }
    if (!irisBotGroup.pending) {
        console.log('nothing pending');
        return;
    }
    const pending = JSON.parse(irisBotGroup.pending);
    if (pending.length == 0) {
        console.log('empty pending');
        return;
    }
    const first = pending[0];
    const rest = pending.slice(1);
    const restJson = rest.length > 0 ? JSON.stringify(rest) : null;
    const updates = {
        ['special/irisBotGroup/' + group + '/pending']: restJson
    }

    const messageText = 'Another question to think about: ' + first;
    const result = await sendMessageAsync({group, text: messageText, userId: 'zzz_irisbot'});
    return {...result, updates: {...result.updates, ...updates}} 
}

exports.maybeSendNextQuestionAsync = maybeSendNextQuestionAsync;


async function writeIntroMessagesAsync({community, group, topic, members, updates}) {
    const memberNames = members.map(m => m.name);
    const memberAnds = AndFormat.format(memberNames);
    const time = Date.now();

    updates['/group/' + group + '/member/zzz_irisbot/name'] = 'Irisbot';

    var timeIncrement = 0;
    const firstMessageText = 'This is a private conversation about ' + topic 
        + ' between ' + memberAnds
        + '.\nHere is a question to get you started:';
    botMessageAsync({group, text: firstMessageText, time, updates});

    console.log('firstMessage', firstMessageText);

    const topicsTxt = await FBUtil.getDataAsync(['community', community, 'topics']);
    console.log('topicsTxt', community, topicsTxt);
    const topics = parseTopics(topicsTxt);
    const selectedTopic = _.find(topics, t => t.title == topic);

    if (selectedTopic && selectedTopic.questions) {
        const questions = selectedTopic?.questions;
        const firstQuestion = questions[0];
        const otherQuestions = questions.slice(1);

        // botMessageAsync({group, text:'Here is a question to get you started:', time: time + 1, updates});
        botMessageAsync({group, text:firstQuestion, time: time + 2, updates});

        updates['special/irisBotGroup/' + group + '/pending'] = JSON.stringify(otherQuestions);
        updates['special/irisBotGroup/' + group + '/lastMessageTime'] = time;
    }
    
    // var questions = [];
    // if (selectedTopic) {
    //     selectedTopic.questions.forEach(question => {
    //         timeIncrement++;
    //         questions.push(question);
    //         // botMessageAsync({group, text: question, time: time+timeIncrement, updates});
    //     })
    // }

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

    var notifs = []
    const notifBase = {
        title: 'New Group Chat: ' + topic,
        body: 'You have been added to a new group chat.',
        data: {
            group, groupName: topic, time, type: 'newGroup'
        }
    }

    members.forEach(member => {
        const {user, name, bio, photoKey, answers} = member;
        const userData = {
            name, bio: bio || null, photo: photoKey || null, answers: answers || null
        }
        updates['group/' + group + '/member/' + user] = userData;
        updates['adminCommunity/' + community + '/group/' + group + '/member/' + user] = userData;
        updates['userPrivate/' + user + '/name'] = name;
        updates['userPrivate/' + user + '/group/' + group] = {name:topic, lastMessage, community}

        const notif = {...notifBase, toUser: user};
        notifs.push(notif);
    })

    console.log('updates', updates);

    // return {success: false, message: 'Not completed yet'};

    return {success: true, updates, data: {group}, notifs}
}

exports.adminCreateGroupAsync = adminCreateGroupAsync;

// TODO: Send notification to other group members on mobile
async function sendMessageAsync({messageKey, group, text, replyTo, userId}) {
    console.log('sendMessageAsync', group, text, userId);
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const pCommunity = FBUtil.getDataAsync(['group', group, 'community'], null);
    const members = await pMembers; const groupName = await pGroupName; const community = await pCommunity;
    // console.log('members', members);
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

    const lastMessage = {
        text: text || null, time, from: userId, fromName
    }

    if (community) {
        updates['adminCommunity/' + community + '/group/' + group + '/lastMessage'] = lastMessage;
    }

    updates['special/irisBotGroup/' + group + '/lastMessageTime'] = time;

    // update local state for all members
    Object.keys(members).forEach(member => {
        updates['userPrivate/' + member + '/group/' + group + '/lastMessage'] = lastMessage;
        if (member != userId) {
            updates['userPrivate/' + member + '/lastMessageTime'] = time;
            const notif = {...notifBase, toUser: member}
            notifs.push(notif);
        }
    })

    // console.log('notifs', notifs);

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

async function submitCommunityFormAsync({community, logKey, photoData, thumbData, name, email, answers, selectedTopics, userId}) {
    console.log('submit communityForm', {community, name, email, answers, selectedTopics});

    var uid = userId;
    var created = false;
    if (!uid) {
        const result = await FBUtil.getOrCreateUserAsync(email);      
        uid = result.uid;
        created = result.created;
    }

    const pPrevIntake = FBUtil.getDataAsync(['userPrivate', uid, 'communityIntake', community], null);
    const communityName = await FBUtil.getDataAsync(['community', community, 'name']);
    const prevIntake = await pPrevIntake;

    const newPhotoKey = FBUtil.newKey();
    var pPhotoUpload; var pThumbUpload;
    if (photoData) {
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId: uid, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId: uid, key: newPhotoKey});    
    }

    const time = Date.now();

    const key = FBUtil.newKey();
    var updates = {};
    const confirmed = userId ? true : false
    updates['intake/' + community + '/' + key] = {
        user: uid, logKey, photoKey: newPhotoKey, name, email, answers, selectedTopics, time, confirmed
    }
    if (userId || created) {
        updates['userPrivate/' + uid + '/photo'] = newPhotoKey;
        updates['userPrivate/' + uid + '/name'] = name;
    }

    updates['userPrivate/' + uid + '/comm/' + community] = {
        name: communityName,
        confirmed,
        lastMessage: {text: 'Joined Community', time}
    }

    if (confirmed || !prevIntake) {
        updates['userPrivate/' + uid + '/communityIntake' + community] = {answers};
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
    const intakeItem = await FBUtil.getDataAsync(['intake/' + community + '/' + intake], null);

    const uid = intakeItem.user;
    if (!intakeItem || !uid) {
        return {success: 'false', message: 'malformed request'};
    }

    const template = FS.readFileSync('template/confirmsuccess.html').toString();
    const html = Mustache.render(template, {communityName});

    var updates = {};
    updates['intake/' + community + '/' + intake + '/confirmed'] = true;
    updates['userPrivate/' + uid + '/comm/' + community + '/confirmed'] = true;
    updates['userPrivate/' + uid + '/communityIntake/' + community] = {answers: intakeItem.answers};

    if (intakeItem.logKey) {
        updates['/logs/intake/'+ community + '/' + intakeItem.logKey + '/confirmed'] = true;
    }

    return {success: true, updates, html};
}

exports.confirmSignupAsync = confirmSignupAsync;


const rob_userId = 'N8D5FfWwTxaJK65p8wkq9rJbPCB3'

async function migrateIntakeAsync() {
    console.log('migrateIntake');
    const allIntake = await FBUtil.getDataAsync(['intake']);
    const allCommunities = await FBUtil.getDataAsync(['community']);
    var updates = {};
    const time = Date.now();
    _.forEach(_.keys(allIntake), community => {
        const communityInfo = allCommunities[community];
        console.log('communityInfo', community, communityInfo.name);
        _.forEach(_.keys(allIntake[community]), intakeKey => {
            const intake = allIntake[community][intakeKey];
            updates['userPrivate/' + intake.user + '/comm/' + community] = {
                name: communityInfo.name,
                confirmed: intake.confirmed,
                lastMessage: {text: 'Joined Community', time}
            } 
            updates['userPrivate/' + intake.user + '/communityIntake/' + community] = {
                answers: intake.answers
            }
        })
    })
    // console.log('updates', updates);
    // return {success: false, message: 'not finished'};
    return {success: true, updates};
}

async function adminRemoveCommunities() {
    const allUsers = await FBUtil.getDataAsync(['userPrivate']);
    const userKeys = _.keys(allUsers);
    var updates = {};
    userKeys.forEach(k => {
        updates['userPrivate/' + k + '/community'] = null;
    })
    console.log('updates', updates);
    return {success: true, updates}
}

async function adminCommandAsync({command, params, userId}) {

    const paramList = params.trim().split('\n').map(x => x.trim()).filter(x => x);
    console.log('adminCommand', command, paramList);

    if (userId != rob_userId) {
        return {success: false, message: 'Access denied'}
    }

    switch (command) {
        case 'migrateIntake':
            return await migrateIntakeAsync();
        case 'removeCommunities':
            return await adminRemoveCommunities();
        default:
            return {success: false, message: 'Unknown admin command'}
    }

    return {success: true}
}

exports.adminCommandAsync = adminCommandAsync;


async function leaveCommunityAsync({community, userId}) {
    var updates = {};
    // remove all intake due to me
    const intakes = await FBUtil.getDataAsync(['intake', community]);
    _.keys(intakes).forEach(k => {
        intake = intakes[k];
        console.log('intake', intake);
        if (intake.user == userId) {
            updates['intake/' + community + '/' + k] = null;
        }        
    })
    updates['userPrivate/' + userId + '/comm/' + community] = null;
    updates['userPrivate/' + userId + '/communityIntake/' + community] = null;

    console.log('updates', updates);

    return {success: true, updates};

}
exports.leaveCommunityAsync = leaveCommunityAsync;


function logIntakeAsync({logKey, community, stage, data, ip, userId}) {
    var updates = {};
    updates['/logs/intake/' + community + '/' + logKey + '/' + stage] = data || true;
    if (userId) {
        updates['/logs/intake/' + community + '/' + logKey + '/user'] = userId;
    }
    updates['/logs/intake/'+ community + '/' + logKey + '/ip'] = ip;
    return {success: true, updates}
}

exports.logIntakeAsync = logIntakeAsync;