const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');

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
    const userEmails = await FBUtil.getDataAsync(['special', 'userEmail']);
    const topics = await pTopics; const communities = await pCommunities;
    const lastEmail = await pLastEmail; const backoff = await pBackoff;

    const userKeys = _.keys(userEmails);
    const randomIndex = Math.floor(Math.random() * userKeys.length);
    const randomUser = 'VBZsqQlAfUXWIxVz1heH8ytmp6f1';
    // const randomUser = userKeys[randomIndex];
    console.log('random user', randomUser);

    const result = await sendTopicsEmailForUser({userId: randomUser, topics, communities, userEmails, lastEmail, backoff});
    // console.log('result', result);

    const html = result.emails[0].HtmlBody;
    console.log('email', {...result.emails[0], HtmlBody: null})

    return {success: true, html};


    // const pName = FBUtil.getDataAsync(['userPrivate', randomUser, 'name']);
    // const pComm = FBUtil.getDataAsync(['userPrivate', randomUser, 'comm']);
    // const lastAction = await FBUtil.getDataAsync(['userPrivate', randomUser, 'lastAction'], 0);    
    // console.log('last Action', Basics.formatTime(lastAction));

    // const comm = await pComm; const name = await pName;
    // console.log('user name', name);
    // const user = {comm, lastAction};
    // const dataForUser = await topicsDataForUser({topics, userCommunities: comm, communities, lastAction, 
    //     lastTopicsEmail: lastEmail[randomUser] || 0, backoff: backoff[randomUser] || 1});


    // console.log('dataForUser', dataForUser);
    // console.log('first community', dataForUser.community[0]);

    // // const dataForUsers = await generateTopicsEmailDataForAllUsers();


    // // const templateData = dataForUsers[randomUser];
    // const templateData = dataForUser;
    // if (dataForUser) {
    //     const htmlTemplate = FS.readFileSync('template/newtopics.html').toString();
    //     const html = Mustache.render(htmlTemplate, templateData);
    //     return {success: true, html};
    // } else {
    //     return {success: true}
    // }
}
exports.testTopicsEmailAsync = testTopicsEmailAsync;

async function sendTopicsEmailForUser({userId, topics, communities, userEmails, lastEmail, backoff}) {
    const pName = FBUtil.getDataAsync(['userPrivate', userId, 'name']);
    const pComm = FBUtil.getDataAsync(['userPrivate', userId, 'comm']);
    const lastAction = await FBUtil.getDataAsync(['userPrivate', userId, 'lastAction'], 0);    
    console.log('last Action', Basics.formatTime(lastAction));

    const comm = await pComm; const name = await pName;
    const emailAddresses = userEmails[userId];
    console.log('user name', name);
    const dataForUser = await topicsDataForUser({topics, userCommunities: comm, communities, lastAction, 
        lastTopicsEmail: lastEmail[userId] || 0, backoff: backoff[userId] || 1});

    // console.log('dataForUser', dataForUser);
    // console.log('first community', dataForUser.community[0]);

    // const dataForUsers = await generateTopicsEmailDataForAllUsers();

    if (!dataForUser) {
        return {success: true}
    }

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
            From: communityName + ' at Iris <topics@iris-talk.com>',
            Subject: 'New Topics: ' + firstTopicName + ', ' + secondTopicName + ', ' + thirdTopicName + ', and ' + topicCount + ' more',
            MessageStream: 'topic-digest',
            HtmlBody: html
        }
        emails.push(email);
    })


    return {success: true, emails};
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

function topicsDataForUser({topics, userCommunities, communities, lastAction, lastTopicsEmail, backoff}) {
    const now = Date.now();
    if (lastTopicsEmail > now - (backoff * Basics.dayMillis)) {
        console.log('last wakeup email too recent');
        return null; // last wakeup email too recent
    }
    if (lastAction > now - Basics.dayMillis) {
        console.log('active in the last week');
        return null; // active in the last week - doesn't need a topic digest
    }
    var communityOutput = {};
    _.forEach(_.keys(userCommunities), c => {
        const communityTopics = topics[c];
        const community = communities[c];
        const userCommunity = userCommunities[c];
        console.log('community', c, community.name);
        // console.log('comm topics', communityTopics);
        communityTopicsOutput = topicsDataForUserCommunity({userCommunity, communityTopics, communityKey: c, lastTopicsEmail});        
        // console.log('topics', communityTopicsOutput);
        if (_.keys(communityTopicsOutput).length > 3) {
            console.log('adding community');
            communityOutput[c] = {
                communityName: community.name,
                topic: communityTopicsOutput
            }    
        } else {
            console.log('community has no new topics');
        }
    })
    const communityKeys = _.keys(communityOutput);
    const sortedCommunityKeys = _.sortBy(communityKeys, c => userCommunities[c].readTime).reverse();
    const communityList = sortedCommunityKeys.map(c => communityOutput[c]);


    const communityNames = _.map(sortedCommunityKeys, c => communities[c].name);
    const communityNameList = Basics.AndFormat.format(communityNames);

    console.log('communityNames', communityNames);

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

function topicsDataForUserCommunity({userCommunity, communityTopics, communityKey, lastTopicsEmail}) {
    var outTopics = [];
    const lastRead = userCommunity?.lastRead || 0;
    console.log('lastRead', Basics.formatTime(lastRead));
    
    const sortedTopicKeys = _.sortBy(_.keys(communityTopics || {}), t => communityTopics[t].time).reverse(); 
    // console.log('topics', communityTopics);
    console.log(_.keys(communityTopics));
    // console.log('sortedTopicKeys', sortedTopicKeys);

    _.forEach(sortedTopicKeys, t => {
        const topic = communityTopics[t];
        console.log('topic', Basics.formatTime(topic.time), topic.name);
        if (topic.time > lastRead && topic.time > lastTopicsEmail) {
            console.log('New topic - adding');
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
                topicSummary: _.truncate(topic.summary, 100),
                time: Basics.formatDate(topic.time),
                question: _.map(questions, q => ({questionText:q})),
                topicHighlight, 
                topicUrl: 'https://iris-talk.com/community/' + communityKey
            })
        } else {
            console.log('old topic - skipping');
        }
    });

    // console.log('outTopics', outTopics.slice(0,4));
    return outTopics.slice(0,10);
}



