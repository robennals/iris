const FBUtil = require('../output/fbutil');
const _ = require('lodash');

async function createGroupAsync({groupName, adminName, userId}) {
    const group = FBUtil.newKey();
    const updates = {
        ['group/' +  group]: {
            name: groupName,
            member: {[userId]: {
                name: adminName,
                role: 'admin'
            }}
        },
        ['userPrivate/' + userId + '/name']: adminName,
        ['userPrivate/' + userId + '/group/' + group]: {name: groupName}
    } 
    return {success: true, updates, data: {group}};   
}
exports.createGroupAsync = createGroupAsync;

function urlToGroup(url) {
    const parts=url.trim().split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart || null;
}

async function addSubgroupsAsync({group, groupLinks, newGroupNames, userId}) {
    const pMeMember = FBUtil.getDataAsync(['group', group,'member', userId]);
    const groupLinkList = _.filter(_.map(groupLinks.split('\n'), l => urlToGroup(l)));
    const newGroupNameList = _.filter(_.map(newGroupNames.split('\n'), n => n.trim()));
    const pParentName = FBUtil.getDataAsync(['group', group, 'name']);
    const pParentPhoto = FBUtil.getDataAsync(['group', group, 'photo']);
    const pLinkedGroupNames = _.map(groupLinkList, g => FBUtil.getDataAsync(['group', g, 'name'], null));
    const pLinkedGroupPhotos = _.map(groupLinkList, g => FBUtil.getDataAsync(['group', g, 'photo'], null));

    const linkedGroupNames = await Promise.all(pLinkedGroupNames);
    const linkedGroupPhotos = await Promise.all(pLinkedGroupPhotos);    
    const meMember = await pMeMember;
    const parentName = await pParentName; const parentPhoto = await pParentPhoto;

    if (meMember.role != 'admin') {
        return {success: 'false', message: 'access denied'}
    }

    if (!_.every(linkedGroupNames)) {
        return {success: 'false', message: 'invalid group links'}
    }

    const time = Date.now();

    var updates = {};
    _.forEach(groupLinkList, (g, i) => {
        const name = linkedGroupNames[i];
        const photo = linkedGroupPhotos[i];
        updates['group/' + group + '/subgroup/' + g] = {name, photo, time}
        updates['group/' + g + '/parent/' + group] = {name: parentName, photo: parentPhoto, time}
    })

    _.forEach(newGroupNameList, name => {
        const g = FBUtil.newKey();
        updates['group/' + group + '/subgroup/' + g] = {name, time}
        updates['group/' + g] = {
            name,
            parent: {[group]: {name: parentName, photo: parentPhoto, time}}, 
            member: {
                [userId]: {
                    name: meMember.name,
                    role: 'admin',
                    photo: meMember.photo || null,
                    time
                }
            }
        }
        updates['userPrivate/' + userId + '/group/' + g] = {name: name, time}
    })

    return {success: true, updates}
}
exports.addSubgroupsAsync = addSubgroupsAsync;

async function joinGroupAsync({group, memberName, photoKey, userId}) {
    const pGroupPhoto = FBUtil.getDataAsync(['group', group,'photo'], null);
    const pGroupName = FBUtil.getDataAsync(['group',group,'name']);
    const pOldPhoto = FBUtil.getDataAsync(['userPrivate', userId, 'photo']);
    const members = await FBUtil.getDataAsync(['group',group,'member']);
    const memberStatus = members[userId];
    if (memberStatus) {
        console.log('already a member');
        return {success: true}
    }

    const groupName = await pGroupName;
    const groupPhoto = await pGroupPhoto;
    const oldPhoto = await pOldPhoto;

    console.log('join group', memberName, groupName);

    // const admins = _.filter(_.keys(members), m => members[m].role == 'admin');

    // const notifBase = {
    //     title: memberName + ' joined ' + groupName,
    //     body: 'Welcome them to the group',
    //     data: {
    //         type: 'join',
    //         from: userId, fromName: memberName, group, groupName,
    //         time: Date.now()
    //     }
    // }
    // const notifs = admins.map(m => ({...notifBase, toUser: m}));

    // console.log('join notifs', notifs);
    // console.log('join admins', admins);

    const updates = {
        ['group/' + group + '/member/' + userId]: {
            name:memberName,
            role: 'visitor',
            photo: photoKey || oldPhoto || null
        },
        ['userPrivate/' + userId + '/group/' + group]: {
            name: await pGroupName,
            time: Date.now(),
            photo: groupPhoto
        },
        ['userPrivate/' + userId + '/name']: memberName
    }
    return {success: true, updates};
}
exports.joinGroupAsync = joinGroupAsync;

async function leaveGroupAsync({group, userId}) {
    const updates = {
        ['group/' + group + '/member/' + userId]: null,
        ['userPrivate/' + userId + '/group/' + group]: null    
    }
    return {success: true, updates}
}
exports.leaveGroupAsync = leaveGroupAsync;

async function blockMemberAsync({group, member, block, userId}) {
    const updates = {
        ['group/' + group + '/block/' + userId + '/' + member] : block
    }    
    return {success: true, updates}
}
exports.blockMemberAsync = blockMemberAsync;
