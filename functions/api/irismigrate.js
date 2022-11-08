const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');
const { importMixPanelEventsAsync } = require('../output/mixpanel');
const { forEach } = require('lodash');
const { normStr } = require('./basics');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

const name_label = 'Full Name';
const email_label = 'Email Address';



const rob_userId = 'N8D5FfWwTxaJK65p8wkq9rJbPCB3'


async function deleteUser({email}) {
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    var user = _.findKey(userEmails, userEmail => normStr(userEmail) == normStr(email))

    console.log('deleting user with email', email);

    if (!user) {
        console.log('no such user:', email);
        return {success: true}
    }
  
    const pGroups = FBUtil.getDataAsync(['userPrivate', user, 'group']);
    const comms = await FBUtil.getDataAsync(['userPrivate', user, 'comm']);
    const groups = await pGroups;
    var updates = {};
    updates['special/userEmail/' + user] = null;
    updates['special/emailUser/' + FBUtil.emailAsKey(email)] = null;
    updates['userPrivate/' + user] = null;

    _.forEach(_.keys(groups), g => {
        updates['group/' + g + '/member/' + user] = null;
        updates['adminGroup/' + g + '/member/' + user] = null;
    })
    _.forEach(_.keys(comms), c => {
        updates['commMember/' + c + '/' + user] = null;
    })

    console.log('updates', updates);

    return {success: true, updates};
}



async function checkDisconnectedGroups() {
    const groups = await FBUtil.getDataAsync(['group']);
    const users = await FBUtil.getDataAsync(['userPrivate']);
    const communities = await FBUtil.getDataAsync(['community']);
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        const members = group.member;
        _.forEach(_.keys(members), m => {
            if (m != 'zzz_irisbot' && !users[m]?.group[g]?.name) {
                const community = communities[group.community];
                console.log('Disconnected Group', m, g, users[m]?.name, group.name, community?.name);
            }
        })
    })
    return {success: true}
}

async function migrateLastHighlightAsync(){ 
    const highlights = await FBUtil.getDataAsync(['published']);
    const topics = await FBUtil.getDataAsync(['topic']);
    const communities = await FBUtil.getDataAsync(['community']);
    var updates = {};
    _.forEach(_.keys(highlights), c => {
        console.log('== ' + communities[c]?.name + '(' + c + ') ==');
        _.forEach(_.keys(highlights[c]), t => {
            console.log('* ' + topics[c][t].name);
            const topicHighlights = highlights[c][t];
            const sortedKeys = _.sortBy(_.keys(topicHighlights), h => topicHighlights[h].time).reverse();
            const latestMessageKey = sortedKeys[0];
            const latestMessage = topicHighlights[latestMessageKey];
            console.log('latestMessage', topics[c][t].name, latestMessage.text.slice(0, 40));
            updates['topic/' + c + '/' + t + '/lastMessage'] = latestMessage;
        })
    })
    // console.log('updates', updates);
    return {success: true, updates};
}


function textToKey(text) {
    return text.replace(/[\/\.\$\#\[\]]/g, '_');
}
  
function findTopicKey(communityTopics, topicName) {
    var result = null;
    _.forEach(_.keys(communityTopics), t => {
        if (textToKey(topicName.trim().toLowerCase()) == textToKey(communityTopics[t].name.trim().toLowerCase())) {
            // console.log('matched topic', topicName, communityTopics[t].name)
            result = t;
        }
    })
    return result;
}

function oldTopicsToNew(communityTopics, userTopics) {
    var out = {};
    _.forEach(_.keys(userTopics), topicName => {
        const topicKey = findTopicKey(communityTopics, topicName);
        if (topicKey) {
            out[topicKey] = 'yes';
        } 
    })
    return out;
}

async function migrateHighlightsAsync() {
    const groups = await FBUtil.getDataAsync(['group']);    
    var updates = {};
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        const community = group.community;
        const topic = group.topic;
        const messages = group.message;
        var lastHighlightForUser = {};
        const sortedMessageKeys = _.sortBy(_.keys(messages), m => messages[m].time);
        var hasHighlights = false; 
        _.forEach(sortedMessageKeys, m => {
           if (messages[m].published) {
            lastHighlightForUser[messages[m].from] = m;
            hasHighlights = true;
           } 
        });
        _.forEach(sortedMessageKeys, m => {
            if (messages[m].proposePublic && !lastHighlightForUser[messages[m].from]) {
                lastHighlightForUser[messages[m].from] = m;
                hasHighlights = true;
            } 
        });

        if (hasHighlights) {
            console.log('== group', group.name, lastHighlightForUser);
        }
        _.forEach(sortedMessageKeys, m => {
            const message = messages[m];
            if ((message.proposePublic || message.published) && lastHighlightForUser[message.from] && m != lastHighlightForUser[message.from] && community && topic) {
                // console.log('old highlight', m, message.text.slice(0,40));
                // console.log('replaced by', lastHighlightForUser[message.from]);
                updates['published/' + community + '/' + topic + '/' + m] = null;
                updates['group/' + g + '/message/' + m] = {
                    ...message, proposePublic: null, published: null, 
                    wasPublic: {proposePublic: message.proposePublic || null, published: message.published || null}
                }
            } else if (message.published) {
                // console.log('keeping public', m, message.text.slice(0,40));
            } else if(message.proposePublic) {
                // console.log('keeping proposed', m, message.text.slice(0,40));
            }
         });
    })
    console.log('updates', updates);
    return {success: true, updates};
}

async function migrateLastReadAsync() {
    console.log('reading...');
    const privates = await FBUtil.getDataAsync(['userPrivate']);
    console.log('got');
    const updates = {};
    // console.log('eh', privates);
    _.forEach(_.keys(privates), u => {
        console.log('user', u);
        const userPrivate = privates[u];
        const groups = userPrivate.group;
        _.forEach(_.keys(groups), g => {
            const group = groups[g];
            const readTime = group.readTime;
            if (readTime) {
                updates['group/' + g + '/memberRead/' + u] = readTime;
                if (group.community) {
                    updates['adminCommunity/' + group.community + '/group/' + g + '/memberRead/' + u] = readTime;
                }
            }
        })
    })
    console.log('updates', updates);
    return {success: true, updates};
}

async function migrateLastSpokeAsync() {
    const groups = await FBUtil.getDataAsync(['group']);
    var updates = {};
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        const community = group.community;
        const messages = group.message;
        const messageKeys = _.keys(messages);
        if (community) {
            const sortedMessageKeys = _.sortBy(messageKeys, k => messages[k].time);
            _.forEach(sortedMessageKeys, m => {
                const message = messages[m];
                updates['/adminCommunity/' + community + '/group/' + g + '/member/' + message.from + '/lastSpoke'] = message.time 
            })
        }
    })
    console.log('updates', updates);
    return {success: true, updates}
}

async function migrateGroupTopicsAsync() {
    const groups = await FBUtil.getDataAsync(['group']);
    const topics = await FBUtil.getDataAsync(['topic']);
    const groupKeys = _.keys(groups);
    var updates = {};
    _.forEach(groupKeys, g => {
        const group = groups[g];
        const community = group.community;
        if (community && !group.topic) {
            const communityTopics = topics[community];
            const topicKey = findTopicKey(communityTopics, group.name);
            if (topicKey) {
                updates['group/' + g + '/topic'] = topicKey;
            } else {
                console.log('Group lacks a topic ' + g);
            }
        }
    })
    console.log('updates', updates);
    return {success: true, updates};
}

async function migrateIntakeAsync() {
    console.log('migrateIntake');
    const allIntake = await FBUtil.getDataAsync(['intake']);
    const allCommunities = await FBUtil.getDataAsync(['community']);
    const allTopics = await FBUtil.getDataAsync(['topic']);
    var updates = {};
    const time = Date.now();
    _.forEach(_.keys(allIntake), community => {
        const communityInfo = allCommunities[community];
        const communityTopics = allTopics[community];
        console.log('communityInfo', community, communityInfo.name);
        _.forEach(_.keys(allIntake[community]), intakeKey => {
            const intake = allIntake[community][intakeKey];
            var userTopics;
            if (intake.selectedTopics) {
                userTopics = oldTopicsToNew(communityTopics, intake.selectedTopics);
            } else if (intake.topics) {
                userTopics = intake.topics;
            } else {
                userTopics = {};
            }
            updates['userPrivate/' + intake.user + '/comm/' + community] = {
                name: communityInfo.name,
                confirmed: intake.confirmed,
                photoKey: communityInfo.photoKey,
                photoUser: communityInfo.photoUser,
                lastMessage: {text: 'Joined Community', time}
            } 
            updates['commMember/' + community + '/' + intake.user + '/answer'] = intake.answers;
            updates['commMember/' + community + '/' + intake.user + '/confirmed'] = intake.confirmed;
            updates['commMember/' + community + '/' + intake.user + '/topic'] = userTopics;
            updates['commMember/' + community + '/' + intake.user + '/photoKey'] = intake.photoKey;
            updates['userPrivate/' + intake.user + '/communityIntake/' + community] = {
                answer: intake.answers, topic: userTopics
            }
        })
    })
    // console.log('updates', updates);
    // return {success: false, message: 'not finished'};
    return {success: true, updates};
}

async function migrateIntakeTimeAsync() {
    console.log('migrateIntakeTime');
    const allIntake = await FBUtil.getDataAsync(['intake']);
    const allCommunities = await FBUtil.getDataAsync(['community']);
    var updates = {};
    const time = Date.now();
    _.forEach(_.keys(allIntake), community => {
        const communityInfo = allCommunities[community];
        console.log('communityInfo', community, communityInfo.name);
        _.forEach(_.keys(allIntake[community]), intakeKey => {
            const intake = allIntake[community][intakeKey];
            updates['commMember/' + community + '/' + intake.user + '/intakeTime'] = intake.time;
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
        case 'migrateTopics':
            return await migrateTopicsAsync();
        // case 'migrateIntake':
        //     return await migrateIntakeAsync();
        case 'migrateIntakeTime':
            return await migrateIntakeTimeAsync();
        // case 'removeCommunities':
        //     return await adminRemoveCommunities();
        case 'migrateMixPanel':
            return await migratePastMixPanelMessagesAsync();
        case 'migrateGroupTopics':
            return await migrateGroupTopicsAsync();
        case 'migrateLastSpoke': 
            return await migrateLastSpokeAsync();
        case 'migrateLastRead': 
            return await migrateLastReadAsync();
        case 'migrateHighlights':
            return await migrateHighlightsAsync();
        case 'migrateLastHighlight':
            return await migrateLastHighlightAsync();
        case 'checkDisconnected':
            return await checkDisconnectedGroups();
        case 'deleteUser':
            return await deleteUser({email: paramList[0]});
        default:
            return {success: false, message: 'Unknown admin command'}
    }

    return {success: true}
}

exports.adminCommandAsync = adminCommandAsync;


async function migratePastMixPanelMessagesAsync() {
    const groups = await FBUtil.getDataAsync(['group']);
    const communities = await FBUtil.getDataAsync(['community']);
    var events = [];
    _.forEach(_.keys(groups), group => {
        const groupName = groups[group].name;
        const community = groups[group].community;
        console.log('group', group, groupName, community);
        const communityName = community ? communities[community].name : null;
        console.log('community', communityName);
        const messageKeys = _.keys(groups[group].message);
        // console.log('message count', messageKeys.length);
        _.forEach(messageKeys, m => {
            const message = groups[group].message[m];
            // console.log('message', m, message.text);
            events.push({
                event: 'Server Send Message', 
                properties: {
                    time: message.time,
                    length: message.text?.length,
                    distinct_id: message.from,
                    replyTo: message.replyTo ? true : false,
                    group, groupName, community, communityName,
                    '$insert_id': m
                }
            })
        })
    })
    
    console.log('sending to mixpanel...');

    const result = await importMixPanelEventsAsync(events);
    console.log('result', result);

    // console.log('events', events);
    return {success: true}
}

