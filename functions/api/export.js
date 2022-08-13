const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');
const JSZip = require('jszip');

function chopSuffix(filename) {
    const parts = filename.split('.');
    return parts[0];
}

async function renderIndex({name, members, posts}) {
    const sortedPostKeys = _.sortBy(_.keys(posts), p => _.get(posts,[p, p, 'time'])).reverse();
    const sortedPostInfo = _.map(sortedPostKeys, p => {
        const root = _.get(posts, [p, p]);
        const messageCount = _.keys(posts[p]).length - 1;
        return {
            postTitle: root.title,
            postKey: p,
            postAuthor: _.get(members, [root.from, 'name']),
            dateText: new Date(root.time).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}),
            postText: root.text,
            hasReplies: messageCount > 0,
            messageCount
        }
    })
    console.log('data', sortedPostInfo);
    const template = FS.readFileSync('template/exportindex.html').toString();
    return Mustache.render(template, {groupTitle: name, sortedPostInfo});
}

async function exportGroupAsync({group, userId}, components) {
    console.log('exportGroupAsync', group, userId, components);
    const dirname = chopSuffix(components[1]);

    const pName = FBUtil.getDataAsync(['group', group, 'name']);
    const pMembers = FBUtil.getDataAsync(['group', group, 'member']);
    const pPosts = FBUtil.getDataAsync(['group', group, 'post']); 
    const members = await pMembers;
    const posts = await pPosts;
    const name = await pName;
    
    // const pMeMember = FBUtil.getDataAsync(['group', group,'member', userId]);
    // if (meMember.role != 'admin') {
    //     return {success: false, message: 'access denied'};
    // }

    const zip = new JSZip();
    const index = renderIndex({name, members, posts});
    zip.file(dirname + '/index.html', index);

    zip.file(dirname + '/hello.txt', 'Hello World');
    const base64 = await zip.generateAsync({type: 'base64'});

    // console.log('base64', base64);

    // return {success: true}
    return {success: true, contentType: 'application/zip', base64}
}
exports.exportGroupAsync = exportGroupAsync;


