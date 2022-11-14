const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');

const community_general = '-NAilGYooypt_utC2dJ3';
const community_irisUsers = '-NCS3mSw7G2gm5Koihuc';

const user_rob = 'N8D5FfWwTxaJK65p8wkq9rJbPCB3';
const user_lucie = '8Nkk25o9o6bipF81nvGgGE59cXG2';
const user_think = '68ZDRSJECrPk2f8InWTuj2mkpHj2';

async function OLD_testTopicsEmailAsync() {
    const templateData = {
        communityNameList: 'Autobots, The Illuminati, and Silly People',
        community: [
            {
                communityName: 'Autobots',
                topic: [
                    {
                        topicUrl: 'https://iris-talk.com/community/-NAeYUhZwzFXOB6YqaX3',
                        topicName: 'Ultra Magnus',
                        topicSummary: 'Master of pointlessness',
                        question: [
                            {questionText: 'Why bother?'},
                            {questionText: 'Is he actually Megatron in disguise?'}
                        ]
                    },
                    {
                        topicName: 'Megatron, the master of silly gunishness',
                        topicSummary: 'Yes',
                    }

                ],
                highlight: [
                    {
                        topicName: 'Silly Things',
                        highlightText: 'I love silly things',
                        authorName: 'Godzilla',
                        authorPhotoUrl: 'https://firebasestorage.googleapis.com/v0/b/iris-talk.appspot.com/o/thumb%2FJAK3NW79hkTgbyedF2fX2MDoVS62%2F-NB8RRvOR_qYlFJi1JYY.jpeg?alt=media',
                        extraCount: 'View 3 more highlights'
                    },
                    {
                        topicName: 'Marvel Movies',
                        highlightText: 'Marvel movies really are terrible.',
                        authorName: 'Robinson Crusoe',
                        authorPhotoUrl: 'https://firebasestorage.googleapis.com/v0/b/iris-talk.appspot.com/o/thumb%2FJAK3NW79hkTgbyedF2fX2MDoVS62%2F-NB8RRvOR_qYlFJi1JYY.jpeg?alt=media',
                    }

                ]
            },
        ]
    }

    const htmlTemplate = FS.readFileSync('template/newtopics.html').toString();
    const html = Mustache.render(htmlTemplate, templateData);
    
    return {success: true, html};
}

async function testTopicsEmailAsync() {
    const pTopics = FBUtil.getDataAsync(['topic']);
    const pCommunities = FBUtil.getDataAsync(['community']);
    const pLastEmail = FBUtil.getDataAsync(['perUser', 'lastTopicEmail']);
    const pBackoff = FBUtil.getDataAsync(['perUser', 'topicEmailBackoff']);
    const pMembers = FBUtil.getDataAsync(['commMember']);
    const userEmails = await FBUtil.getDataAsync(['special', 'userEmail']);
    const topics = await pTopics; const communities = await pCommunities;
    const lastEmail = await pLastEmail; const backoff = await pBackoff;
    const members = await pMembers; 

    const userKeys = _.keys(userEmails);

    // const pAllUsers = _.map(userKeys, u => () => 
    //     sendTopicsEmailForUser({userId: u, topics, communities, userEmails, lastEmail, backoff, members}));
    // const allUserResults = await Basics.promiseSequentialAsync(pAllUsers);
    // const nonEmptyResults = _.filter(allUserResults, r => r);

    // const randomIndex = Math.floor(Math.random() * nonEmptyResults.length);
    // const randomResult = nonEmptyResults[randomIndex];

    // const html = randomResult.emails[0].HtmlBody;
    // return {success: true, html};


    const randomIndex = Math.floor(Math.random() * userKeys.length);
    // const randomUser = '7RMzBgJwdbaEvVP3l7NbRM7zbiz2';
    // const randomUser = user_lucie;
    const randomUser = user_rob;
    // const randomUser = user_think;
    const forceSend = true;
    // const randomUser = userKeys[randomIndex];
    console.log('random user', randomUser);

    // const result = await sendTopicsEmailForUser({userId: randomUser, forceSend, topics, communities, userEmails, lastEmail, backoff, members});
    const result = await sendTopicsEmailForAllUsers({userId: randomUser, forceSend, topics, communities, userEmails, lastEmail, backoff, members});
    
    // console.log('result', result);
    if (!result || result.emails.length == 0) {
        console.log('no emails');
        return {success: true};
    }
    
    const html = result.emails[0].HtmlBody;
    // console.log('email', {...result.emails[0], HtmlBody: null})

    console.log('updates', result.updates);

    // return {success: true, html};
    // return {success: true, emails: result.emails, html};
    return {success: true, html, emails: result.emails, updates: result.updates};
}
exports.testTopicsEmailAsync = testTopicsEmailAsync;


async function sendTopicsEmailForAllUsers({topics, count, communities, userEmails, lastEmail, backoff, members}) {
    var userKeys = _.keys(userEmails);
    if (count) {
        userKeys = userKeys.slice(0, count);
    }

    const pAllUsers = _.map(userKeys, u => () => 
        sendTopicsEmailForUser({userId: u, topics, communities, userEmails, lastEmail, backoff, members}));
    const allUserResults = await Basics.promiseSequentialAsync(pAllUsers);
    const nonEmptyResults = _.filter(allUserResults, r => r);

    var updates = {};
    var emails = [];

    _.forEach(nonEmptyResults, result => {
        updates = {...updates, ...result.updates};
        emails = [...emails, ...result.emails];
    })

    return {updates, emails};
}


async function sendTopicsEmailForUser({userId, forceSend=false, topics, communities, userEmails, lastEmail, backoff, members}) {
    const pName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pComm = FBUtil.getDataAsync(['userPrivate', userId, 'comm']);
    const lastAction = await FBUtil.getDataAsync(['userPrivate', userId, 'lastAction'], 0);    
    // console.log('last Action', Basics.formatTime(lastAction));

    const comm = await pComm; const name = await pName;
    const emailAddresses = userEmails[userId];
    console.log('user name', name);
    const dataForUser = await topicsDataForUser({userId, forceSend, topics, userCommunities: comm, communities, lastAction, 
        lastTopicsEmail: lastEmail[userId] || 0, backoff: backoff[userId] || 1, members});

    if (!dataForUser) {
        return null;
        // return {success: true}
    }

    var updates = {};
    const now = Date.now();
    updates['/perUser/lastTopicEmail/' + userId] = now;
    updates['/perUser/topicEmailBackoff/' + userId] = 
        (lastAction[userId] > lastEmail[userId]) ? 1 : (backoff[userId] || 1) + 1

    var emails = [];
    _.forEach(dataForUser.community, communityData => {
        const communityName = communityData.communityName;
        const templateData = {communityNameList: communityName, community: [communityData]};        
        const htmlTemplate = FS.readFileSync('template/newtopics.html').toString();
        const html = Mustache.render(htmlTemplate, templateData);

        const firstTopicName = communityData.topic[0].topicName;
        const secondTopicName = communityData.topic[1].topicName;
        const thirdTopicName = communityData.topic[2].topicName;
        const topicCount = communityData.topic.length - 3;
    
        const email = {
            To: name + ' <' + emailAddresses + '>',
            From: communityName + ' on Iris <topics@iris-talk.com>',
            Subject: 'New Topics: ' + firstTopicName + ', ' + secondTopicName + ', ' + thirdTopicName + ', and ' + topicCount + ' more',
            MessageStream: 'topic-digest',
            HtmlBody: html
        }
        console.log('email', {...email, HtmlBody: null});
        emails.push(email);
    })

    return {success: true, emails, updates};
}


// TODO: Eventually this needs to be a mapreduce
async function generateTopicsEmailDataForAllUsers(){

    // const pUsers = FBUtil.getDataAsync(['userPrivate']);
    
    console.log('getting data');
    const topics = await pTopics; const communities = await pCommunities; 
    const users = await pUsers;
    console.log('got data');

    var userOutput = {};
    const now = Date.now();
    _.forEach(_.keys(users), u => {
        const user = users[u];
        const output = topicsDataForUser({topics, communities, user});
        userOutput[u] = output;
    })
    return userOutput;
}

function topicsDataForUser({userId, forceSend, topics, userCommunities, communities, lastAction, lastTopicsEmail, backoff, members, topicSeenEmail}) {
    const now = Date.now();
    if (!forceSend && (lastTopicsEmail > lastAction) && lastTopicsEmail > now - (backoff * Basics.weekMillis)) {
        console.log('last wakeup email too recent');
        return null; // last wakeup email too recent
    }
    if (!forceSend && lastAction > now - Basics.weekMillis) {
        console.log('active in the last week');
        return null; // active in the last week - doesn't need a topic digest
    }
    var communityOutput = {};
    _.forEach(_.keys(userCommunities), c => {
        const communityTopics = topics[c];
        const community = communities[c];
        const userCommunity = userCommunities[c];
        // console.log('community', c, community.name);
        // console.log('comm topics', communityTopics);
        communityTopicsOutput = topicsDataForUserCommunity({userId, userCommunity, communityTopics, communityKey: c, lastTopicsEmail, members, topicSeenEmail});        
        // console.log('topics', communityTopicsOutput);
        if (_.keys(communityTopicsOutput).length > 3) {
            // console.log('adding community');
            communityOutput[c] = {
                communityName: community.name,
                topic: communityTopicsOutput
            }    
        } else if (_.keys(communityTopicsOutput).length > 0) {
            // console.log('community has too few topics: ' + _.keys(communityTopicsOutput).length);
        } else {
            // console.log('community has no new topics');
        }
    })
    const communityKeys = _.keys(communityOutput);
    const sortedCommunityKeys = _.sortBy(communityKeys, c => userCommunities[c].readTime).reverse();
    const communityList = sortedCommunityKeys.map(c => communityOutput[c]);


    const communityNames = _.map(sortedCommunityKeys, c => communities[c].name);
    const communityNameList = Basics.AndFormat.format(communityNames);

    // console.log('communityNames', communityNames);

    return {
        communityNameList, 
        community: communityList
    };
}

function getHighlightExtraCountText(topic) {
    if (!topic.publishCount) {
        return 'View Highlights';
    }

    const extraCount = topic.publishCount - 1;
    if (extraCount == 0) {
        return 'View Highlight';
    }
    if (extraCount == 1) {
        return 'View 1 more Highlight'
    } else {
        return 'View ' + extraCount + ' more Highlights';
    }
}

function topicsDataForUserCommunity({userId, userCommunity, communityTopics, communityKey, lastTopicsEmail, members}) {
    var outTopics = [];
    if (communityKey == community_general || communityKey == community_irisUsers) {
        return [];
    }
 
    const lastRead = userCommunity?.lastRead || 0;
    const votedTopics = members?.[communityKey]?.[userId]?.topic || {};
    const intakeTime = members?.[communityKey]?.[userId]?.intakeTime || 0;
    // console.log('lastRead', Basics.formatTime(lastRead));
    // console.log('intakeTime', Basics.formatTime(intakeTime));
    if (!intakeTime) {
        return [];
    }
    
    const sortedTopicKeys = _.sortBy(_.keys(communityTopics || {}), t => communityTopics[t].time).reverse(); 
    // console.log('topics', communityTopics);
    // console.log(_.keys(communityTopics));
    // console.log('sortedTopicKeys', sortedTopicKeys);

    _.forEach(sortedTopicKeys, t => {
        const topic = communityTopics[t];
        // console.log('topic', Basics.formatTime(topic.time), topic.name);
        if (!votedTopics[t] && topic.time > lastTopicsEmail && topic.time > intakeTime && topic.approved !== false) {
            // console.log('New topic - adding');
            const questions = JSON.parse(topic.questions);
            var topicHighlight = null;
            if (topic.lastMessage) {
                topicHighlight = {
                    authorName: topic.lastMessage.authorName,
                    highlightText: _.truncate(topic.lastMessage.text, {length: 100}),
                    extraCount: getHighlightExtraCountText(topic)
                }
            }
            outTopics.push({                
                topicName: topic.name,
                topicKey: t,
                topicSummary: _.truncate(topic.summary, {length: 100}),
                time: Basics.formatDate(topic.time),
                question: _.map(questions, q => ({questionText:q})),
                topicHighlight, 
                topicUrl: 'https://iris-talk.com/topic/' + communityKey + '/' + t
            })
        } else {
            // console.log('old topic - skipping');
        }
    });

    // console.log('outTopics', outTopics.slice(0,4));
    return outTopics.slice(0,10);
}



