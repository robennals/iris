import { getCurrentDomain, track } from "../components/shim";
import { firebaseApp } from "./config";
import { getDataAsync, internalReleaseWatchers, onFirebaseAuthStatechanged, releaseWatcher, signInWithTokenAsync, watchData } from "./fbutil";
import _ from 'lodash';

var global_accessKey = null;
var global_userId = null;
var global_keyWatcher = null;
var global_watchers = null;

export function setupServerTokenWatch(userId) {
    const keyPath = ['userPrivate', userId, 'accessKey'];
    if (global_watchers) {
        internalReleaseWatchers(global_watchers);
    }
    global_watchers = {};
    global_userId = userId;
    watchData(global_watchers, keyPath, key => {
        global_accessKey = key
        // console.log('access key', key);
    });
}

export function releaseServerTokenWatch(){
    console.log('release server token watch', global_userId, global_watchers);
    if (global_watchers) {
        internalReleaseWatchers(global_watchers);
    }
    global_watchers = null;
    global_userId = null;
}

export async function initServerAccessKeyAsync(userId){
    console.log('initServerAccessKey', userId);
    const accessKey = await getDataAsync(['userPrivate', userId, 'accessKey']);
    console.log('got access key', accessKey);
    global_accessKey = accessKey;
}

export function setInitialAccessKey(userId, accessKey) {
    console.log('setInitialAccessKey', userId, accessKey);
    global_userId = userId;
    global_accessKey = accessKey;
}

function getApiPrefix() {
    return getCurrentDomain() + '/api/v1/';
}

function makeQueryUrl(action, params) {
    const fullParams = {...params, userId: global_userId, accessKey: global_accessKey};
    const paramKeys = Object.keys(fullParams);
    const nonNullKeys = _.filter(paramKeys, k => fullParams[k]);
    const keyVals = nonNullKeys.map(k => k + '=' + encodeURIComponent(fullParams[k]));
    return getApiPrefix() + action + '?' + keyVals.join('&');
}

function makeFullParams(params) {
    return {...params, userId: global_userId, accessKey: global_accessKey};
}

async function callServerApiAsync(action, params) {
    const actionUrl = getApiPrefix() + action;
    if (global_userId && !global_accessKey) {
        console.log('access key missing - fetching it');
        await initServerAccessKeyAsync(global_userId);
    }
    const fullParams = makeFullParams(params);
    // const fetchUrl = makeQueryUrl(action, params);
    console.log('calling API', action);
    const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(fullParams)
    });
    // console.log('got response');
    const data = await response.json();
    // console.log('parsed response', data);
    if (data.success == true) {
        return data;
    } else {
        throw new Error(data.message);
    }
}

export async function requestLoginCode({email, createUser=false}) {
    console.log('requestLoginCode', email, getCurrentDomain());
  
    const fetchUrl = getApiPrefix() + 'requestLoginCode?email=' + encodeURIComponent(email.toLowerCase()) 
        + (createUser ? '&createUser=true' : '');
    console.log('fetchUrl', fetchUrl);
    const response = await fetch(fetchUrl);
    const data = await response.json();
    return data;
}

export async function signinWithLoginCode({email, code, onError}) {
    console.log('signinWithLoginCode', email, code, getCurrentDomain());
  
    const fetchUrl = getApiPrefix() + 'getLoginTokenForCode?email=' + encodeURIComponent(email.toLowerCase()) + '&code=' + code;
    console.log('siginUrl', fetchUrl);
    const response = await fetch(fetchUrl);
    const data = await response.json();
    console.log('login response', data);
    if (data.success == true) {
        try {
            await signInWithTokenAsync(data.token);
            setInitialAccessKey(data.userId, data.accessKey);
            setupServerTokenWatch(data.userId);
        } catch (error) {
            onError && onError(error.message);
            return {success: false, message: error.message};
        }
    } else {
      onError && onError(data.message);
    }
    return data;
}

export async function createGroupAsync({groupName, adminName}) {
    console.log('createGroupAsync', groupName, adminName);
    return await callServerApiAsync('createGroup', {groupName, adminName});
}

export async function joinGroupAsync({group, memberName, photoKey}) {
    console.log('joinGroupAsync', group);
    return await callServerApiAsync('joinGroup', {group, memberName, photoKey});
}

export async function postMessageAsync({group, text, type, title, photoKey, photoData, rootKey, editKey, replyTo, membersOnly}) {
    console.log('postMessage', text, {photoKey, photoData});
    return await callServerApiAsync('postMessage', {group, text, type, photoKey, photoData, title, rootKey, editKey, replyTo, membersOnly});
}

export async function reportAbuseAsync({group, community, member, abuseType, details}) {
    return await callServerApiAsync('reportAbuse', {group, community, member, abuseType, details});
}

export async function setMemberRoleAsync({group, member, role}) {
    return await callServerApiAsync('setMemberRole', {group, member, role});
}

export async function leaveGroupAsync({group}) {
    return await callServerApiAsync('leaveGroup', {group});
}

export async function validateReplyAsync({group, rootKey, messageKey}) {
    return await callServerApiAsync('validateReply', {group, rootKey, messageKey});
}

export async function updateProfileAsync({group, member, name, photoData, thumbData}) {
    return await callServerApiAsync('updateProfile', {group, member, name, photoData, thumbData});
}

export async function updateGroupProfileAsync({group, name, photoData, thumbData}) {
    return await callServerApiAsync('updateGroupProfile', {group, name, photoData, thumbData});
}

export async function highlightMessageAsync({group, messageKey, highlight}) {
    return await callServerApiAsync('highlightMessage', {group, messageKey, highlight});
}

// export async function likeMessageAsync({group, title, rootKey, messageKey, like}) {
//     return await callServerApiAsync('likeMessage', {group, title, rootKey, messageKey, like});
// }

export async function addSubgroupsAsync({group, groupLinks, newGroupNames}) {
    return await callServerApiAsync('addSubgroups', {group, groupLinks, newGroupNames});
}

export async function reportMemberAsync({group, member, block}) {
    return await callServerApiAsync('blockMember', {group, member, block});
}

export async function adminCreateGroupAsync({community, topicKey, privateName, tsvMembers, memberKeys}) {
    return await callServerApiAsync('adminCreateGroup', {community, topicKey, privateName, tsvMembers, memberKeys});
}

export async function sendMessageAsync({messageKey, isEdit, proposePublic, editTime, group, text, replyTo}) {
    return await callServerApiAsync('sendMessage', {messageKey, isEdit, proposePublic, editTime, group, text, replyTo});
}

export async function setProfilePhotoAsync({photoData, thumbData}) {
    return await callServerApiAsync('setProfilePhoto', {photoData, thumbData});
}

export async function createOrUpdateCommunityAsync({community, photoData, thumbData, photoKey, photoUser, name, info, chatExtra, questions, topics}) {
    return await callServerApiAsync('createOrUpdateCommunity', {
        community, photoData, thumbData, photoKey, photoUser, name, info, chatExtra, questions, topics});
}

export async function submitCommunityFormAsync({sendEmail, community, logKey, photoData, thumbData, name, email, answers, topics}) {
    return await callServerApiAsync('submitCommunityForm', {
        sendEmail, community, logKey, photoData, thumbData, name, email, answers, topics});
}

export async function adminCommandAsync({command, params}) {
    return await callServerApiAsync('adminCommand', {
        command, params
    })
}

export async function leaveCommunityAsync({community}) {
    track('Leave Community', {community});
    return await callServerApiAsync('leaveCommunity', {community});
}

export async function logIntakeAsync({community, logKey, stage, data}) {
    return await callServerApiAsync('logIntake',{community, logKey, stage, data});
}

export async function adminJoinGroupAsync({community, group}) {
    return await callServerApiAsync('adminJoinGroup', {community, group});
}

export async function adminArchiveGroupAsync({group, archive=true}) {
    return await callServerApiAsync('adminArchiveGroup', {group, archive});
}

export async function editTopicAsync({community, topic, name, pinned, summary, questions}) {
    return await callServerApiAsync('editTopic', {community, topic, name, pinned, summary, questions});
}

export async function adminGetLoginTokenAsync({email}) {
    return await callServerApiAsync('adminGetLoginToken', {email});
}

export async function publishMessageAsync({group, messageKey, publish}) {
    return await callServerApiAsync('publishMessage', {group, messageKey, publish});
}

export async function likeMessageAsync({group, messageKey}) {
    return await callServerApiAsync('likeMessage', {group, messageKey});
}

export async function endorseMessageAsync({group, messageKey, endorse}) {
    return await callServerApiAsync('endorseMessage', {group, messageKey, endorse});
}

export async function renameUserAsync({user, name}) {
    return await callServerApiAsync('renameUser', {name, user});
}

export async function createDirectChatAsync({community, user}) {
    return await callServerApiAsync('createDirectChat', {community, user});
}

export async function saveViewpointAsync({community, topic, anonymous, text}) {
    return await callServerApiAsync('saveViewpoint', {community, topic, text, anonymous});
}

export async function confirmSignupAsync({community, intake, noHtml}) {
    return await callServerApiAsync('confirmSignup', {community, intake, noHtml});
}

export async function sendFeedbackAsync({text}) {
    return await callServerApiAsync('sendFeedback', {text});
}

export async function saveTopicGroupAsync({community, topic, text}) {
    return await callServerApiAsync('saveTopicGroup', {community, topic, text});
}

export async function logErrorAsync({error, stack=null, context=null}) {
    try {
        return await callServerApiAsync('logError', {error, stack, context});
    } catch (e) {
        console.error('Error logging an error', e);
    }
}


