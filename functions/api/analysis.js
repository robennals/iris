const FBUtil = require('../output/fbutil');
const _ = require('lodash');

const accessKey = 'EKLrx5zjmj';
const access_failed = {success: false, message: 'access denied'};
const name_label = 'Full Name';
const email_label = 'Email Address';

function gridToTSV(grid){
    var out = '';
    _.forEach(grid, row => {
        _.forEach(row, cell => {
            out += cell + '\t';
        })
        out += '\n';
    })
    return out;
}

function allItemKeys(itemList) {
    return _.uniq(_.flatten(_.map(itemList, e => _.keys(e))));
}

function objListToGrid({entries, firstCols}) {
    const keys = allItemKeys(entries);
    console.log('keys', keys);
    const notFirstCols = _.filter(keys, k => _.indexOf(firstCols, k) == -1);
    console.log('notFirstCols', notFirstCols);
    const cols = [...firstCols, ...notFirstCols];
    console.log('cols', cols);
    const gridRows = entries.map(item => cols.map(col => item[col] ?? ''));
    return [cols, ...gridRows];
}

async function getIntakeLogsAsync({key}) {
    // if (key != accessKey) {
    //     return access_failed;
    // }

    const pCommunities = FBUtil.getDataAsync(['community']);
    const intakeLogs = await FBUtil.getDataAsync(['logs','intake']);
    const communities = await pCommunities;
    var entries = [];
    _.forEach(_.keys(intakeLogs), communityKey => {
        const community = communities[communityKey];
        console.log('community', communityKey, community?.name);

        const communityName = community?.name;
        _.forEach(_.keys(intakeLogs[communityKey]), logKey => {

            const intake = intakeLogs[communityKey][logKey];            
            const hasName = _.find(intake.answer, v => v == name_label) ? true : null;
            const hasEmail = _.find(intake.answer, v => v == email_label) ? true : null;
            const answerCount = _.keys(intake.answer ?? {}).length;
            const topicCount = _.keys(intake.topic ?? {}).length;
            const entry = {...intake, communityName, communityKey, logKey, hasName, hasEmail, answerCount, topicCount}
            const ignore = intake.ip == 'no-ip';
            if (!ignore) {
                entries.push(_.omit(entry, ['topic', 'answer']));
            }
        })
    })
    const grid = objListToGrid({entries, firstCols: ['logKey', 'communityName', 'submit', 'received', 'confirmed', 'ip', 'hasName', 'hasEmail', 'photo', 'answerCount', 'topicCount', 'communityKey']})
    const tsvData = gridToTSV(grid);
    return {success: true, tsvData}
}

exports.getIntakeLogsAsync = getIntakeLogsAsync;


