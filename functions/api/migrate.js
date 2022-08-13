const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const FS = require('fs');

function getRootForMessage({messages, messageKey}) {
    const message = messages[messageKey];
    if (message.replyTo) {
        return getRootForMessage({messages, messageKey: message.replyTo});
    } else {
        return messageKey;
    }
}

function migrateMessagesForGroup({groupKey, group}) {
    var updates = {};
    console.log('== group', groupKey, group.name);
    const messages = group.message;
    const sortedMessageKeys = _.sortBy(_.keys(messages), k => messages[k].time);
    var replyCount = {};
    var extraCount = {};
    _.forEach(sortedMessageKeys, m => {
        const rootKey = getRootForMessage({messages, messageKey: m});
        const message = messages[m];
        const root = messages[rootKey];
        if (message.replyTo) {
            _.set(replyCount, [root.from, rootKey], _.get(replyCount, [root.from, rootKey], 0) + 1);
            _.set(extraCount, [message.from, rootKey], _.get(extraCount, [message.from, rootKey], 0) + 1);    
            updates['group/' + groupKey + '/memberMsg/' + root.from + '/' + rootKey + '/replyCount'] = _.get(replyCount, [root.from, rootKey]);            
            updates['group/' + groupKey + '/memberMsg/' + message.from + '/' + rootKey + '/moreCount'] =  _.get(extraCount, [message.from, rootKey]);
            if (root.highlight) {
                updates['group/' + groupKey + '/memberMsg/highlight/' + rootKey + '/replyCount'] = _.get(replyCount, [root.from, rootKey]);            
            }
        }
    })

    _.forEach(sortedMessageKeys, m => {
        const message = messages[m];

        const rootKey = getRootForMessage({messages, messageKey: m});
        const root = messages[rootKey];
        updates['group/' + groupKey + '/post/' + rootKey + '/' + m] = message;
        updates['group/' + groupKey + '/memberMsg/' + message.from + '/' + rootKey + (message.replyTo ? '/reply' : '/post')] = {
            ...message, 
            key: message.replyTo ? m : null,
            title: message.title || root.title || null,
            edited: message.edited || null,
            membersOnly: root.membersOnly ? (root.firstTime || root.time) : null,       
        };    
        updates['group/' + groupKey + '/memberMsg/' + message.from + '/' + rootKey + '/time'] = message.time;
        updates['group/' + groupKey + '/member/' + message.from + '/lastMessage'] = {
            text: message.text, title: message.title || root.title || null, isReply: message.replyTo ? true : null}

        if (message.highlight) {
            updates['group/' + groupKey + '/memberMsg/highlight/' + rootKey + '/post'] = message;
            updates['group/' + groupKey + '/memberMsg/highlight/' + rootKey + '/time'] = message.time;
            updates['group/' + groupKey + '/member/highlight/lastMessage'] = message
        }
    
    })
    return updates;
}

async function migrateAllMessagesAsync() {
    const groups = await FBUtil.getDataAsync(['group']);  
    var updates = {};

    await forEachAsync(_.keys(groups), groupKey => {
        const newUpdates = migrateMessagesForGroup({groupKey, group: groups[groupKey]});
        updates = {...newUpdates, ...updates};
    })   
    // const updatesText = JSON.stringify(updates);
    // FS.writeFileSync('updates.txt', updatesText);
    // console.log('wrote updates.txt');

    // console.log('updates', updates);
    return {success: true, updates, html: 'DONE'} 
}
exports.migrateAllMessagesAsync = migrateAllMessagesAsync;

async function forEachAsync(list, func) {
    for (var i = 0; i < list.length; i++) {
        await func(list[i]);
    }
}

