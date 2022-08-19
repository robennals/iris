import { getCurrentDomain } from "../components/shim";
import { firebaseApp } from "./config";
import { onFirebaseAuthStatechanged, releaseWatcher, signInWithTokenAsync, watchData } from "./fbutil";
import _ from 'lodash';

var global_accessKey = null;
var global_userId = null;
var global_keyWatcher = null;

export function setupServerTokenWatch(userId) {
    const keyPath = ['userPrivate', userId, 'accessKey'];
    if (global_keyWatcher) {
        releaseWatcher(keyPath, global_keyWatcher);
    }
    global_userId = userId;
    global_keyWatcher = watchData(null, keyPath, key => {
        global_accessKey = key
        // console.log('access key', key);
    });
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
    const fullParams = makeFullParams(params);
    // const fetchUrl = makeQueryUrl(action, params);
    console.log('calling API', action, params);
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

export async function requestLoginCode({email}) {
    console.log('requestLoginCode', email, getCurrentDomain());
  
    const fetchUrl = getApiPrefix() + 'requestLoginCode?email=' + encodeURIComponent(email.toLowerCase());
    console.log('fetchUrl', fetchUrl);
    const response = await fetch(fetchUrl);
    const data = await response.json();
    return data;
}

export async function signinWithLoginCode({email, code, onError}) {
    console.log('signinWithLoginCode', email, code, getCurrentDomain());
  
    const fetchUrl = getApiPrefix() + 'getLoginTokenForCode?email=' + encodeURIComponent(email.toLowerCase()) + '&code=' + code;
    const response = await fetch(fetchUrl);
    const data = await response.json();
    if (data.success == true) {
        try {
            await signInWithTokenAsync(data.token);
        } catch (error) {
            onError(error.message);
        }
    } else {
      onError(data.message);
    }
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

export async function reportAbuseAsync({group, member, abuseType, details}) {
    return await callServerApiAsync('reportAbuse', {group, member, abuseType, details});
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

export async function likeMessageAsync({group, title, rootKey, messageKey, like}) {
    return await callServerApiAsync('likeMessage', {group, title, rootKey, messageKey, like});
}

export async function addSubgroupsAsync({group, groupLinks, newGroupNames}) {
    return await callServerApiAsync('addSubgroups', {group, groupLinks, newGroupNames});
}

export async function reportMemberAsync({group, member, block}) {
    return await callServerApiAsync('blockMember', {group, member, block});
}

export async function adminCreateGroupAsync({name, questions, people}) {
    return await callServerApiAsync('adminCreateGroup', {name, questions, people});
}

export async function sendMessageAsync({group, text}) {
    return await callServerApiAsync('sendMessage', {group, text});
}

export async function setProfilePhotoAsync({photoData, thumbData}) {
    return await callServerApiAsync('setProfilePhoto', {photoData, thumbData});
}
