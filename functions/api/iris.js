const FBUtil = require('../output/fbutil');
const _ = require('lodash');


async function createMemberAsync(person, userEmails) {
    const {name, email, bio} = person;
    var uid = _.findKey(userEmails, userEmail => userEmail == email)

    if (uid) {
        console.log('found existing user ' + uid + ' for ' + email);
        return {uid, name, bio}
    } else {
        uid = await FBUtil.createUser(email);
        console.log('created new user ' + uid + ' - ' + email);
        return {uid, name, bio};        
    }
}

async function adminCreateGroupAsync({name, questions, people}) {
    console.log('adminCreateGroupAsync', name, questions, people);
    const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
    const group = FBUtil.newKey();
    
    const pMembers = _.map(people, person => createMemberAsync(person, userEmails));
    const members = await Promise.all(pMembers);
    var updates = {};
    updates['group/' + group + '/name'] = name;
    updates['group/' + group + '/questios'] = questions;

    members.forEach(member => {
        const {uid, bio} = member;
        updates['group/' + group + '/member/' + uid + '/name'] = member.name;
        updates['group/' + group + '/member/' + uid + '/bio'] = bio;        
        updates['userPrivate/' + uid + '/group/' + group] = {name}
    })

    console.log('updates', updates);

    return {success: true, updates, data: {group}}
}

exports.adminCreateGroupAsync = adminCreateGroupAsync;
