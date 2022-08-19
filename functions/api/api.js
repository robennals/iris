const Signin = require('./signin');
const Group = require('./group');
const Message = require('./message');
const Profile = require('./profile');
const Digest = require('./digest');
const Cron = require('./cron');
const Migrate = require('./migrate');
const Export = require('./export');
const Iris = require('./iris');

async function apiActionAsync({action, components, params}) {
    console.log('apiAction', action, components);
    switch (action) {
        case 'test': {
            return {success: true, data: {hello: 42}}
        }
        case 'createGroup': {
            return Group.createGroupAsync(params);   
        }
        case 'getLoginTokenForCode': {
            return Signin.getLoginTokenForCode(params);
        }
        case 'requestLoginCode': {
            return Signin.requestLoginCode({email: params.email});
        }
        case 'joinGroup': {
            return Group.joinGroupAsync(params);
        }
        case 'postMessage': {
            return Message.postMessageAsync(params);
        }
        case 'reportAbuse': {
            return Profile.reportAbuseAsync(params);
        }
        case 'setMemberRole': {
            return Profile.setMemberRoleAsync(params);
        }
        case 'leaveGroup': {
            return Group.leaveGroupAsync(params);
        }
        case 'validateReply': {
            return Message.validateReplyAsync(params);
        }
        case 'unsubscribe': {
            return Profile.unsubscribeAsync(params);
        }
        case 'mydigest': {
            return Digest.getMyDigestAsync(params);
        }
        case 'alldigest': {
            return Digest.getAllDigestsAsync(params);
        }
        case 'updateProfile': {
            return Profile.updateProfileAsync(params);
        }
        case 'updateGroupProfile': {
            return Profile.updateGroupProfileAsync(params);
        }
        case 'highlightMessage': {
            return Message.highlightMessageAsync(params);
        }
        case 'likeMessage': {
            return Message.likeMessageAsync(params);
        }
        case 'ping': {
            return Cron.pingAsync(params);
        }
        case 'addSubgroups': {
            return Group.addSubgroupsAsync(params);
        }
        // TODO: Comment this out once done
        // case 'migrateAll': {
        //     return Migrate.migrateAllMessagesAsync();
        // }
        case 'export': {
            return Export.exportGroupAsync(params, components);
        }
        case 'blockMember': {
            return Group.blockMemberAsync(params);
        }

        // IRIS
        case 'adminCreateGroup': {
            return Iris.adminCreateGroupAsync(params);
        }
        case 'sendMessage': {
            return Iris.sendMessageAsync(params);
        }
        case 'setProfilePhoto': {
            return Iris.setProfilePhotoAsync(params);
        }
        

        default: {
            console.log('unknown action', action);
            return {success: false, message: 'no such api'}
        }
    }
}
exports.apiActionAsync = apiActionAsync;