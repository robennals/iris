const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const Email = require('../output/email');
const FS = require('fs');
const Mustache = require('mustache');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

const name_label = 'Full Name';
const email_label = 'Email Address';



const rob_userId = 'N8D5FfWwTxaJK65p8wkq9rJbPCB3'


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
        default:
            return {success: false, message: 'Unknown admin command'}
    }

    return {success: true}
}

exports.adminCommandAsync = adminCommandAsync;