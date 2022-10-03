const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { mixpanel } = require('../output/mixpanel');
const IrisEmail = require('./irisemail');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

const name_label = 'Full Name';
const email_label = 'Email Address';

function normStr(str) {
    return str.toLowerCase().trim();
  }  

const accessDeniedResult = {success: false, message: 'access denied'};

const masterUsers = ['msxTO8YflDYNgmixbmC5WbYGihU2', 'N8D5FfWwTxaJK65p8wkq9rJbPCB3', '8Nkk25o9o6bipF81nvGgGE59cXG2'];

function isMasterUser(user) {
    for (var i = 0; i < masterUsers.length; i++) {
        if (masterUsers[i] == user) {
            return true;
        }
    }
    return false;
}

exports.isMasterUser = isMasterUser;


async function createMemberAsync(person, userEmails) {
    const {name, email, bio} = person;
    var user = _.findKey(userEmails, userEmail => normStr(userEmail) == normStr(email))

    if (user) {
        console.log('found existing user ' + user + ' for ' + email);
        const photoKey = await FBUtil.getDataAsync(['userPrivate', user, 'photo'], null);
        return {user, name, bio, photoKey}
    } else {
        console.log('creating new user for' + email);
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
    const timeGap = Date.now() - (4 * hourMillis);
    // if (irisBotGroup.lastMessageTime > timeGap) {
    //     console.log('still active', group);
    //     return;
    // }
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
    // const restJson = rest.length > 0 ? JSON.stringify(rest) : null;
    const updates = {
        ['special/irisBotGroup/' + group + '/pending']: null
    }

    const messageText = first;
    const result = await sendMessageAsync({group, text: messageText, userId: 'zzz_irisbot'});

    // post all remaining questions 
    // HACK; this is for shutting down the drip-feed feature
    const time = Date.now();
    var timeIncrement = 0;

    rest.forEach(question => {
        timeIncrement++;
        botMessageAsync({group, text: stripHiddenSymbolFromQuestion(question), time: time+timeIncrement, updates});
    })

    console.log('result', result);
    console.log('updates', updates);
    // return {success: false, message: 'in progress'}
    return {...result, updates: {...result.updates, ...updates}} 
}

exports.maybeSendNextQuestionAsync = maybeSendNextQuestionAsync;


function stripHiddenSymbolFromQuestion(q) {
    if (q[0] == '>') {
        return q.slice(1).trim();
    } else {
        return q.trim();
    }
}


async function writeIntroMessagesAsync({community, group, topic, members, updates, chatExtra}) {
    const memberNames = members.map(m => m.name);
    const memberAnds = AndFormat.format(memberNames);
    const time = Date.now();

    updates['/group/' + group + '/member/zzz_irisbot/name'] = 'Irisbot';

    var timeIncrement = 0;
    const firstMessageText = 'This is a private conversation about ' + topic.name 
        + ' between ' + memberAnds + '.';
        + '.\nHere are some questions to get you started:';
    botMessageAsync({group, text: firstMessageText, time, updates});

    // timeIncrement++;
    // botMessageAsync({group, text: 'Here are some questions to get you started:', time, updates});


    // console.log('firstMessage', firstMessageText);
    
    // const topicsTxt = await FBUtil.getDataAsync(['community', community, 'topics']);
    // console.log('topicsTxt', community, topicsTxt);
    // const topics = parseTopics(topicsTxt);
    // const selectedTopic = _.find(topics, t => t.title == topic);

    // if (selectedTopic && selectedTopic.questions) {
    //     const questions = selectedTopic?.questions?.map(q => stripHiddenSymbolFromQuestion(q));
    //     const firstQuestion = questions[0];
    //     const otherQuestions = questions.slice(1);

    //     // botMessageAsync({group, text:'Here is a question to get you started:', time: time + 1, updates});
    //     botMessageAsync({group, text:firstQuestion, time: time + 2, updates});

    //     updates['special/irisBotGroup/' + group + '/pending'] = JSON.stringify(otherQuestions);
    //     updates['special/irisBotGroup/' + group + '/lastMessageTime'] = time;
    // }

    // var questions = [];
    if (topic.questions) {
        const parsedQuestions = JSON.parse(topic.questions);
        parsedQuestions.forEach(question => {
            timeIncrement++;
            // questions.push(question);
            botMessageAsync({group, text: stripHiddenSymbolFromQuestion(question), time: time+timeIncrement, updates});
        })
    }


    var extraMessage = "Please also introduce yourself, and say why you are personally interested in this topic.";
    if (chatExtra) {
        extraMessage = chatExtra;
    }

    timeIncrement++;
    botMessageAsync({group, 
        text: extraMessage, 
        time: time + timeIncrement + 1, updates
    })

}

async function adminArchiveGroupAsync({group, archive = true, userId}) {
    console.log('adminArchive', archive);
    if (!isMasterUser(userId)) {
        return accessDeniedResult;
    }
    const members = await FBUtil.getDataAsync(['group', group, 'member']);

    var updates = {};
    _.forEach(_.keys(members), member => {
        updates['userPrivate/' + member + '/group/' + group + '/archived'] = archive || null;
    });

    updates['group/' + group + '/archived'] = archive || null;

    return {success: true, updates};
}
exports.adminArchiveGroupAsync = adminArchiveGroupAsync;


async function adminJoinGroupAsync({group, userId}) {
    console.log('adminJoinGroup', group);
   
    if (!isMasterUser(userId)) {
        return accessDeniedResult;
    }

    const community = await FBUtil.getDataAsync(['group', group, 'community'], null);

    const pAdminName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const pGroupPrivateName = FBUtil.getDataAsync(['group', group, 'privateName'], '');
    const pAnswers = FBUtil.getDataAsync(['userPrivate', userId, 'communityIntake', community, 'answers']);
    const adminName = await pAdminName; const photo = await pPhoto;
    const groupName = await pGroupName; const groupPrivateName = await pGroupPrivateName;
    const answers = await pAnswers;

    const userData = {
        name: adminName, photo: photo || null, isAdmin: true, answers
    }

    const time = Date.now();
    const lastMessage = {text: 'You Joined', time}

    const updates = {};
    updates['group/' + group + '/member/' + userId] = userData;
    updates['adminCommunity/' + community + '/group/' + group + '/member/' + userId] = userData;
    updates['userPrivate/' + userId + '/group/' + group] = {
        name: groupName, privateName: groupPrivateName, lastMessage, community};

    const botResult = await sendMessageAsync({group, text: 'admin ' + adminName + ' joined the chat', userId: 'zzz_irisbot'});
    
    return {...botResult, updates: {...botResult.updates, ...updates}} 
}
exports.adminJoinGroupAsync = adminJoinGroupAsync;


async function adminCreateGroupAsync({community, topicKey, privateName, tsvMembers, memberKeys, userId}) {
    console.log('adminCreateGroupAsync', community, topicKey, privateName);

    if (!isMasterUser(userId)) {
        return accessDeniedResult;
    }

    const pAllMembers = FBUtil.getDataAsync(['commMember', community]);
    const pTopic = FBUtil.getDataAsync(['topic', community, topicKey]);
    const pChatExtra = FBUtil.getDataAsync(['community', community, 'chatExtra'], null);
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const allMembers = await pAllMembers; const topic = await pTopic;
    const chatExtra = await pChatExtra;
    const group = FBUtil.newKey();

    const pickedMembers = memberKeys.map(k => {
        const member = allMembers[k];
        return {
            name: member.answer[name_label],
            email: member.answer[email_label],
            photoKey: member.photoKey,
            answers: {...member.answer, [email_label]: null},
            user: k
        }
    })

    const pMembers = _.map(tsvMembers, person => createMemberAsync(person, userEmails));
    const members = [...pickedMembers, ...await Promise.all(pMembers)];

    // console.log('members', members);

    const time = Date.now();
    const lastMessage = {text: 'Group Created', time}

    const pEmails = IrisEmail.createMailsForNewGroupAsync({groupName: topic.name, members, groupKey: group});

    var updates = {};
    updates['group/' + group + '/name'] = topic.name;
    updates['group/' + group + '/community'] = community;
    updates['group/' + group + '/topic'] = topicKey;
    updates['group/' + group + '/privateName'] = privateName;
    updates['adminCommunity/' + community + '/group/' + group + '/name'] = topic.name;
    updates['adminCommunity/' + community + '/group/' + group + '/community'] = community;
    updates['adminCommunity/' + community + '/group/' + group + '/privateName'] = privateName;
    updates['adminCommunity/' + community + '/group/' + group + '/lastMessage'] = lastMessage;

    await writeIntroMessagesAsync({community, group, members, topic, updates, chatExtra});

    var notifs = []
    const notifBase = {
        title: 'New Group Chat: ' + topic.name,
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
        updates['userPrivate/' + user + '/group/' + group] = {name:topic.name, lastMessage, community}

        const notif = {...notifBase, toUser: user};
        notifs.push(notif);
    })

    // console.log('updates', updates);

    // return {success: false, message: 'Not completed yet'};

    return {success: true, updates, data: {group}, notifs, emails: await pEmails}
}

exports.adminCreateGroupAsync = adminCreateGroupAsync;

// TODO: Send notification to other group members on mobile
async function sendMessageAsync({messageKey, isEdit=null, editTime=null, group, text, replyTo, userId, ip}) {
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
    const time = editTime || Date.now();
    const fromName = members[userId].name;
    updates['group/' + group + '/message/' + key] = {
        time,
        replyTo: replyTo || null,
        text: text || null,
        editTime: isEdit ? Date.now() : null,
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

    if (community && !isEdit) {
        updates['adminCommunity/' + community + '/group/' + group + '/lastMessage'] = lastMessage;
        updates['adminCommunity/' + community + '/group/' + group + '/member/' + userId + '/lastSpoke'] = time;
    }

    updates['special/irisBotGroup/' + group + '/lastMessageTime'] = time;

    // update local state for all members
    if (!isEdit) {
        Object.keys(members).forEach(member => {
            updates['userPrivate/' + member + '/group/' + group + '/lastMessage'] = lastMessage;
            if (member != userId) {
                updates['userPrivate/' + member + '/lastMessageTime'] = time;
                const notif = {...notifBase, toUser: member}
                notifs.push(notif);
            }
        })
    }

    mixpanel.track(isEdit ? 'Server Edit Message' : 'Server Send Message', {
        distinct_id: userId,
        '$insert_id': key,
        ip: ip, length: text.length, replyTo: replyTo ? true : false,
        group, community, groupName
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
    const pComms = FBUtil.getDataAsync(['userPrivate', userId, 'comm']);

    console.log('requested upload', photoKey);

    const groups = await pGroups; const comms = await pComms;

    var updates = {};
    updates['userPrivate/' + userId + '/photo'] = photoKey;

    const groupKeys = Object.keys(groups);
    const commKeys = Object.keys(comms);

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

    _.forEach(commKeys, c => {
        if (comms[c].name) {
            updates['commMember/' + c + '/' + userId + '/photoKey'] = photoKey;
        }
    })

    await pPhotoUpload; 
    await pThumbUpload;
    return {success: true, updates};
}
exports.setProfilePhotoAsync = setProfilePhotoAsync;

async function createOrUpdateCommunityAsync({community, photoKey, photoUser, photoData, thumbData, name, info, chatExtra='', questions, topics, userId}) {
    const newPhotoKey = photoKey || FBUtil.newKey();

    var pPhotoUpload; var pThumbUpload;
    if (photoData) {
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId, key: newPhotoKey});    
    }

    const communityKey = community || FBUtil.newKey();
    var updates = {};
    updates['community/' + communityKey] = {
        name, info, chatExtra, questions, topics: topics || '', photoKey: newPhotoKey, photoUser: photoUser || userId
    }

    await pPhotoUpload;
    await pThumbUpload;
    return {success: true, updates, result: {communityKey, photoKey}};
}
exports.createOrUpdateCommunityAsync = createOrUpdateCommunityAsync;

async function submitCommunityFormAsync({community, logKey, photoData, thumbData, name, email, answers, selectedTopics=null, topics=null, userId}) {
    console.log('submit communityForm', {userId, community, name, email, answers, selectedTopics, topics});

    var uid = userId;
    var created = false;
    if (!uid) {
        const result = await FBUtil.getOrCreateUserAsync(email);      
        uid = result.uid;
        created = result.created;
    }
    var pEmail; var pName; var pPhotoKey;
    if (userId) {
        pName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
        pEmail = FBUtil.getDataAsync(['special', 'userEmail', userId]);
        pPhotoKey = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    }
    const pPrevIntake = FBUtil.getDataAsync(['userPrivate', uid, 'communityIntake', community], null);
    const pCommTopics = FBUtil.getDataAsync(['topic', community]);
    const pCommInfo = FBUtil.getDataAsync(['community', community]);
    const communityName = await FBUtil.getDataAsync(['community', community, 'name']);
    const prevIntake = await pPrevIntake; const commTopics = await pCommTopics; 
    const commInfo = await pCommInfo;
    var photoKey = null;
    if (userId) {
        email = await pEmail;
        name = await pName;
        photoKey = await pPhotoKey;
        console.log('fetched user data', {email, name, photoKey});
    } else {
        photoKey = null;;
    }

    console.log('user data', {userId, name, email});
    answers[name_label] = name;
    answers[email_label] = email;

    if (selectedTopics && !topics) {
        topics = oldTopicsToNew(commTopics, selectedTopics);
    }

    var pPhotoUpload; var pThumbUpload;
    if (photoData) {        
        photoKey = FBUtil.newKey();
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId: uid, key: photoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId: uid, key: photoKey});    
    }

    const time = Date.now();

    const key = FBUtil.newKey();
    var updates = {};
    const confirmed = userId ? true : false
    updates['intake/' + community + '/' + key] = {
        user: uid, logKey, photoKey: photoKey, name, email, answers, selectedTopics, topics, time, confirmed
    }
    if (created) {
        updates['userPrivate/' + uid + '/photo'] = photoKey;
        updates['userPrivate/' + uid + '/name'] = name;
    }

    updates['userPrivate/' + uid + '/comm/' + community] = {
        name: communityName,
        confirmed,
        photoKey: commInfo.photoKey,
        photoUser: commInfo.photoUser,
        lastMessage: {text: 'You Joined the community', time}
    }

    if (confirmed || !prevIntake) {
        updates['userPrivate/' + uid + '/communityIntake/' + community] = {answers};
        updates['commMember/' + community + '/' + uid] = {
            answer: answers, topic: topics, confirmed, intakeTime: time,
            photoKey: photoKey
        };
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

    await pPhotoUpload; await pThumbUpload;

    // console.log('updates', updates);
    // return {success: true}

    return {success: true, updates, emails}
}
exports.submitCommunityFormAsync = submitCommunityFormAsync;


async function confirmSignupAsync({community, intake}) {
    const communityName = await FBUtil.getDataAsync(['community', community, 'name']);
    const intakeItem = await FBUtil.getDataAsync(['intake/' + community + '/' + intake], null);
 
    const uid = intakeItem.user;
    const commMember = await FBUtil.getDataAsync(['commMember/' + community + '/' + uid], null);
    const commTopics = await FBUtil.getDataAsync(['topic', community]);

    if (!intakeItem || !uid) {
        return {success: 'false', message: 'malformed request'};
    }

    const topic = intakeItem.topics || oldTopicsToNew(commTopics, intakeItem.selectedTopics);

    const template = FS.readFileSync('template/confirmsuccess.html').toString();
    const html = Mustache.render(template, {communityName});

    const time = Date.now();
    var updates = {};
    // if (!commMember) {
    updates['intake/' + community + '/' + intake + '/confirmed'] = true;
    updates['userPrivate/' + uid + '/comm/' + community + '/confirmed'] = true;
    updates['userPrivate/' + uid + '/communityIntake/' + community] = {answers: intakeItem.answers};
    updates['commMember/' + community + '/' + uid] = {
        answer: intakeItem.answers, topic, confirmed: true, intakeTime: time,
        photoKey: intakeItem.photoKey || null}

    if (intakeItem.logKey) {
        updates['/logs/intake/'+ community + '/' + intakeItem.logKey + '/confirmed'] = true;
    }

    return {success: true, updates, html};
}

exports.confirmSignupAsync = confirmSignupAsync;


async function migrateTopicsAsync() {
    const allCommunities = await FBUtil.getDataAsync(['community']);
    const allTopics = await FBUtil.getDataAsync(['topic']);
    var updates = {};
    _.forEach(_.keys(allCommunities), community => {
        const commInfo = allCommunities[community];
        console.log('community: ', commInfo.name);
        const commTopics = _.get(allTopics,community,{});
        var knownTopics = {};
        _.keys(commTopics).forEach(k => {
            const topic = commTopics[k];
            knownTopics[topic.name] = true;
        })
        console.log('known topics', knownTopics);
        if (commInfo.topics) {
            const topics = parseTopics(commInfo.topics);
            topics.forEach(topic => {
                if (!knownTopics[topic.title]) {
                    const key = FBUtil.newKey();
                    updates['topic/' + community + '/' + key] = {
                        name: topic.title,
                        questions: JSON.stringify(topic.questions),
                        time: Date.now()
                    }
                    console.log('topic', topic.title);
                } else {
                    console.log('known topic', topic.title);
                }
            })
        }
    })
    // console.log('updates', updates);
    // return {success: false, message: 'in progress'}
    return {sucess: true, updates}
}


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


async function editTopicAsync({community, topic=null, name, questions, pinned, summary, userId}) {
    const isMaster = isMasterUser(userId);
    var updates = {};
    var topicKey = topic ? topic : FBUtil.newKey();
    var oldTopic = null;
    const pMembers = FBUtil.getDataAsync(['commMember', community]);
    const pCommunityName = FBUtil.getDataAsync(['community', community, 'name']);
    if (topic) {
        oldTopic = await FBUtil.getDataAsync(['topic', community, topic], null);
    }
    const members = await pMembers; const communityName = await pCommunityName;

    console.log('editTopic', topic, topicKey, pinned);

    const time = Date.now();
    updates['topic/' + community + '/' + topicKey] = {
        name, questions, summary, time: oldTopic?.time || time,
        pinned: pinned || null,
        approved: isMaster, from: userId
    }
    var notifs = [];
    const summaryText = summary ? (' - ' + summary) : '';
    const questionText = _.join(JSON.parse(questions), '\n');

    if (!topic) {
        const notifBase = {
            title: 'New Topic in ' + communityName,
            body: name + summaryText + '\n' + questionText,
            data: {
                community, topicKey, time, type: 'topic'
            }
        }
    
        const lastMessage = {text: 'New topic: ' + name, time};
        updates['community/' + community + '/lastMessage'] = lastMessage

        _.forEach(_.keys(members), member => {
            updates['userPrivate/' + member + '/comm/' + community + '/lastMessage'] = lastMessage
            notifs.push({...notifBase, toUser: member});
            console.log('new topic notif', name);
        })
    }
    return {success: true, updates, notifs}
}
exports.editTopicAsync = editTopicAsync;

async function logErrorAsync({error, stack=null, context=null, userId}) {
    var updates = {};
    const key = FBUtil.newKey();
    updates['errorLog/' + key] = {
        userId, error, stack, context
    }
    return {success: true, updates};
}
exports.logErrorAsync = logErrorAsync;

async function publishMessageAsync({group, messageKey, publish, userId}) {
    const pCommunity = FBUtil.getDataAsync(['group', group, 'community'], null); 
    const pTopic = FBUtil.getDataAsync(['group', group, 'topic'], null);
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const message = await FBUtil.getDataAsync(['group', group, 'message', messageKey]);
    var replyToAuthor = null;
    if (message.replyTo) {
        replyToAuthor = await FBUtil.getDataAsync(['group', group, 'message', message.replyTo, 'from']);
    }
    const community = await pCommunity;
    const topic = await pTopic;
    const members = await pMembers;
    const member = members[userId];

    const published = await FBUtil.getDataAsync(['published', community, topic]);
    console.log('published', published);
    const oldPublishCount = _.keys(published).length;
    const newPublishCount = publish ? oldPublishCount + 1 : oldPublishCount - 1;

    if (message.from != userId) {
        return accessDeniedResult;
    }
    if (!community || !topic) {
        return {success: false, message: 'No community or topic in this group'};
    }
    var updates = {};
    const pubMessage = {...message, 
        authorName: member.name,
        authorPhoto: member.photo,
        publishTime: Date.now(), 
        replyToAuthorName: replyToAuthor ? members[replyToAuthor]?.name : null
    }
    updates['group/' + group + '/message/' + messageKey + '/published'] = publish ? Date.now() : null;
    if (publish) {
        updates['topic/' + community + '/' + topic + '/lastMessage'] = pubMessage;
    }    
    updates['topic/' + community + '/' + topic + '/publishCount'] = newPublishCount;
    updates['published/' + community + '/' + topic + '/' + messageKey] = publish ? pubMessage : null;
    console.log('updates', updates);
    return {success: true, updates};
}
exports.publishMessageAsync = publishMessageAsync;

// Actually liking the message is done on the client.
// All we have to do here is send a notif to the message author, and light up the group for them
async function likeMessageAsync({group, messageKey, userId}) {
    const pLikerName = FBUtil.getDataAsync(['group', group, 'member', userId, 'name']);
    const message = await FBUtil.getDataAsync(['group', group, 'message', messageKey]);
    const likerName = await pLikerName;
    const time = Date.now();
    const notif = {
        title: likerName + ' liked your message',
        body: message.text,
        toUser: message.from,
        data: {type:'like', group, messageKey, time}
    }
    const updates = {
        ['/userPrivate/' + message.from + '/group/' + group + '/lastMessage']: {
            text: likerName + ' liked your message',
            time
        }
    }
    return {success: true, updates, notifs: [notif]}
}

exports.likeMessageAsync = likeMessageAsync;