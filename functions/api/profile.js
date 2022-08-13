const FBUtil = require('../output/fbutil');
const _ = require('lodash');
const { sendNotifAsync } = require('../output/notifs');
const Email = require('../output/email');
const Mustache = require('mustache');
const FS = require('fs');


async function reportAbuseAsync({group, member, abuseType, details, userId}) {
    const pGroupName = FBUtil.getDataAsync(['group', group, 'name']);
    const pMemberName = FBUtil.getDataAsync(['group', group, 'member', member, 'name']);
    const pReporterName = FBUtil.getDataAsync(['group', group, 'member', userId, 'name']);
    const groupName = await pGroupName;
    const memberName = await pMemberName;
    const reporterName = await pReporterName;

    const htmlTemplate = FS.readFileSync('template/abusereport.html').toString();
    const htmlOutput = Mustache.render(htmlTemplate, {
        groupName, group, memberName, member, abuseType, details, userId, reporterName});
    const email = {
        To: 'rob.ennals@gmail.com',
        From: 'TalkWell Abuse <abuse@talkwell.net>',
        Subject: 'Abuse Report: ' + memberName,
        HtmlBody: htmlOutput
    }
    return {success: true, emails: [email]}
}

exports.reportAbuseAsync = reportAbuseAsync;

async function setMemberRoleAsync({group, member, role, userId}) {
    const pOldRole = FBUtil.getDataAsync(['group',group,'member',member, 'role'], null);
    const userRole = await FBUtil.getDataAsync(['group',group,'member',userId, 'role'], null);
    const oldRole = await pOldRole;
    
    if (userRole != 'admin') {
        return {success: false, errorMessage: 'Access denied'};
    }

    var updates = {
        ['group/' + group + '/member/' + member + '/role/']: role,
    }
    if ((role == 'admin' || role == 'member') && oldRole == 'visitor') {
        updates['group/' + group + '/member/' + member + '/memberTime'] = Date.now()
    }

    return {success: true, updates}
}

exports.setMemberRoleAsync = setMemberRoleAsync;

async function unsubscribeAsync({unSubUser, key}) {
    const unSubKey = await FBUtil.getDataAsync(['userPrivate', unSubUser, 'unSubKey'], 0);
    if (unSubKey != key) {
        return {success: 'false', errorMessage: 'access denied'};
    } else {
        const updates = {
            ['userPrivate/' + unSubUser + '/unsubscribed']: true
        }
        return {success: true, updates, redirect: '/confirm_unsubscribe.html'}
    }
}
exports.unsubscribeAsync = unsubscribeAsync;  

async function updateProfileAsync({group, member, name, photoData, thumbData, userId}) {
    var newPhotoKey;
    var pPhotoUpload; var pThumbUpload;

    var role;
    if (member != userId) {
        role = await FBUtil.getDataAsync(['group', group, 'member', userId, 'role']);
    }

    var updates = {};
    if (member != userId && role != 'admin') {
        return {success: false, errorMessage: 'access denied'};
    }

    console.log('updateProfile', member, photoData ? true : false);

    if (photoData) {
        newPhotoKey = FBUtil.newKey();
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId:member, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId:member, key: newPhotoKey});
        updates['group/' + group + '/member/' + member + '/photo'] = newPhotoKey;
        updates['userPrivate/' + userId + '/photo'] = newPhotoKey;
    }
    if (name) {
        updates['group/' + group + '/member/' + member + '/name'] = name;
        updates['userPrivate/' + userId + '/name'] / name;
    }

    await pPhotoUpload; await pThumbUpload;   
    return {success: true, updates}
}
exports.updateProfileAsync = updateProfileAsync;




async function updateGroupProfileAsync({group, name, photoData, thumbData, userId}) {
    var newPhotoKey;
    var pPhotoUpload; var pThumbUpload;

    console.log('updateGroupProfile', group, name, photoData ? true : false, userId);
    const pGroupParents = FBUtil.getDataAsync(['group', group, 'parent']);
    const members = await FBUtil.getDataAsync(['group', group, 'member']);
    const groupParents = await pGroupParents;
    const role = _.get(members, [userId,'role']);

    var updates = {};
    if (role != 'admin') {
        return {success: false, errorMessage: 'access denied'};
    }

    console.log('continuing...');

    if (photoData) {
        newPhotoKey = FBUtil.newKey();
        console.log('uploading photos...', newPhotoKey);
        pPhotoUpload = FBUtil.uploadBase64Image({base64data: photoData, isThumb: false, userId, key: newPhotoKey});
        pThumbUpload = FBUtil.uploadBase64Image({base64data: thumbData, isThumb: true, userId, key: newPhotoKey});
        updates['group/' + group + '/photo'] = {key: newPhotoKey, user: userId};
        _.forEach(_.keys(members), m => {
            updates['userPrivate/' + m + '/group/' + group + '/photo'] = {key: newPhotoKey, user: userId};
        })
    }
    if (name) {
        updates['group/' + group + '/name'] = name;
        _.forEach(_.keys(members), m => {
            updates['userPrivate/' + m + '/group/' + group + '/name'] = name;
        })
    }
    if (groupParents) {
        _.forEach(_.keys(groupParents), p => {
            if (name) {
                updates['group/' + p + '/subgroup/' + group + '/name'] = name;
            }
            if (newPhotoKey) {
                updates['group/' + p + '/subgroup/' + group + '/photo'] = {key: newPhotoKey, user: userId}
            }
        })
    }

    await pPhotoUpload; await pThumbUpload;   
    return {success: true, updates}
}
exports.updateGroupProfileAsync = updateGroupProfileAsync;

