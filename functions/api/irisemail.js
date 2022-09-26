const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const Basics = require('./basics');


async function irisDigestAsync() {
    const members = [
        {name: 'Rob Ennals', user: 'N8D5FfWwTxaJK65p8wkq9rJbPCB3'},
        {name: 'Donald Duck', user: 'hdZ4GQ6KduOvFBkdjuGW5HKJqvu2'},
        {name: 'Albert Einstein', user: 'ubBCBxJzEMZretnB9uHOTkaX1Xs1'},
        {name: 'Elvis Presley', user: 'qmEIIC0LPwUzPscXOeebjIEJsoq2'}
    ]
    const emails = await createMailsForNewGroupAsync({groupName: 'Silly Cats', members, groupKey: '-N9UcS3J-XXp1Yg3tbS3'});
    console.log(emails);
    return {success: true, html: emails[1].HtmlBody, emails:[emails[1]]}
}
exports.irisDigestAsync = irisDigestAsync;

const AndFormat = new Intl.ListFormat('en', {style: 'long', type: 'conjunction'});

async function createMailsForNewGroupAsync({groupName, members, groupKey}) {
    const htmlTemplate = FS.readFileSync('template/newgroup.html').toString();
    const textTemplate = FS.readFileSync('template/newgroup.text').toString();
    const pEmails = FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['special', 'userEmail', k], null);
    const pActiveTimes = FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['userPrivate', k, 'lastAction'], 0);
    const tokens = await FBUtil.getMultiDataAsync(members.map(m => m.user), k => ['userPrivate', k, 'notifToken'], null);
    const emailAddresses = await pEmails;
    const activeTimes = await pActiveTimes;

    var emails = [];

    const timeNow = Date.now();
    const dayAgo = timeNow - Basics.dayMillis;

    console.log('tokens', tokens);

    _.forEach(members, member => {
        const notThem = _.filter(members, m => m.name != member.name);
        const groupMemberNames = AndFormat.format(notThem.map(m => m.name));
        const needsAppPromo = tokens[member.user] == null;
        const templateData = {name: Basics.firstName(member.name), groupName, groupMemberNames, needsAppPromo, groupKey};
        if (activeTimes[member.user] > dayAgo && tokens[member.user]) {
            console.log('no email needed for ' + member.name + ' since they have notifs and are active');
        } else {
            const HtmlBody = Mustache.render(htmlTemplate, templateData);
            const TextBody = Mustache.render(textTemplate, templateData);

            const emailToSend = {
                To: member.name + ' <' + emailAddresses[member.user] + '>',
                From: 'Iris Matching <matching@iris-talk.com>',
                Subject: "We've added you to a new chat - " + groupName,
                HtmlBody, TextBody
            }
            emails.push(emailToSend);
        }
    })
    return emails;
}

exports.createMailsForNewGroupAsync = createMailsForNewGroupAsync;

