import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import { email_label, name_label, parseQuestions, parseTopics, ScreenContentScroll } from '../components/basics'
import { internalReleaseWatchers, useDatabase, watchData } from '../data/fbutil';
import _ from 'lodash';
import { formatFullTime, formatShortDate, formatTime } from '../components/time';

function getPlatform(props) {
    if (!props) {
        return 'Unknown';
    }
    if (props['Has Platform iOS']) {
        return 'iOS'
    } else if (props['Has Platform Android']) {
        return 'Android'
    } else if (props['Has Platform Web']) {
        return 'Web'
    } else {
        return 'unknown'
    }
}

function tabLineForMember({member, memberKey, questionNames, topicKeys, props, groupCount, spokeCount, lastSpoke, lastRead, readCount}) {
    console.log('tabLine', {member, topicKeys});
    const fullTime = formatShortDate(member.intakeTime);
    const basics = [member?.answer?.[name_label] || '', member?.answer?.[email_label] || ''];
    const answers = questionNames.map(q => member?.answer?.[q]);
    const topics = topicKeys.map(t => member?.topic?.[t] || '');
    const confirmed = (member.confirmed == false ? 'NO' : 'yes');
    const platform = props?.['Has Platform iOS'] 
    const extras = [getPlatform(props), props?.['Mobile Notifs Connected'] || false]
    const allCells = [fullTime, ...basics, confirmed, groupCount, spokeCount, readCount, 
        lastSpoke ? formatShortDate(lastSpoke) : 'never', 
        lastRead ? formatShortDate(lastRead) : 'never',
        memberKey, ...extras, ...answers, ...topics];
    return _.join(allCells, '\t');
}

function getUserGroupCount(groups) {
    var userGroupCount = {};
    var userSpokeCount = {};
    var userReadCount = {};
    var userLastSpoke = {};
    var userLastRead = {};
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        _.forEach(_.keys(group.member), m => {
            const member = group.member[m];
            if (!userGroupCount[m]) {
                userGroupCount[m] = 0;
            }  
            if (!userReadCount[m]) {
                userReadCount[m] = 0;
            }  
            if (!userSpokeCount[m]) {
                userSpokeCount[m] = 0;
            }  
            userGroupCount[m] ++;
            if (member.lastSpoke) {
                userSpokeCount[m] ++;
                userLastSpoke[m] = Math.max(userLastSpoke[m] || 0, member.lastSpoke);
            }
            if (group?.memberRead?.[m]) {
                userReadCount[m] ++;
                userLastRead[m] = Math.max(userLastRead[m] || 0, group.memberRead[m]);
            }
        })
    })
    return {userGroupCount, userSpokeCount, userLastSpoke, userLastRead, userReadCount};
}

export function CommunitySignupsScreen({route}) {
    const {community} = route.params;
    // const [intake, setIntake] = useState(null);
    const [topics, setTopics] = useState(null);
    const [members, setMembers] = useState(null);
    const [info, setInfo] = useState(null);
    const userProps = useDatabase([], ['perUser', 'props']);
    const groups = useDatabase([community], ['adminCommunity', community, 'group']);
    useEffect(() => {
        var x = {};
        // watchData(x, ['intake', community], setIntake);
        watchData(x, ['commMember', community], setMembers);
        watchData(x, ['community', community], setInfo);
        watchData(x, ['topic', community], setTopics);
        return () => internalReleaseWatchers(x);
    }, [community]);

    if (!members || !info || !topics || !groups) return null;

    // console.log('stuff', {community, members, info});
    
    const {userGroupCount, userSpokeCount, userLastSpoke, userLastRead, userReadCount} = 
        getUserGroupCount(groups);

    const questions = parseQuestions(info.questions);
    // const topics = parseTopics(info.topics);
    const questionNames = questions.map(q => q.question).filter(n => n != email_label && n != name_label);
    const topicNames = _.keys(topics).map(k => topics[k].name);

    const columns = ['Time', 'Name', 'Email', 'Confirmed', 'Groups', 'Spoke In', 'Read In', 'Last Spoke', 'Last Read', 'UserId', 'Platform', 'Notifs', ... questionNames, ... topicNames] 
    const columnText = _.join(columns, '\t');
    const sortedMemberKeys = _.sortBy(_.keys(members), k => members[k].intakeTime);
    const sortedTopicKeys = _.sortBy(_.keys(topics), k => topics[k].time);
    const itemLines = sortedMemberKeys.map(k => tabLineForMember({
        memberKey: k,
        groupCount: userGroupCount[k] || 0, spokeCount: userSpokeCount[k], lastSpoke: userLastSpoke[k],
        lastRead: userLastRead[k], readCount: userReadCount[k],
        props: userProps?.[k], member: members[k], questionNames, topicKeys: sortedTopicKeys
    }));
    const allLines = [columnText, ...itemLines];
    const tabText = _.join(allLines, '\n') + '\n';

    return (
        <ScreenContentScroll>
            <TextInput multiline value={tabText} 
                style={{borderColor: '#ddd', margin: 16, borderWidth: StyleSheet.hairlineWidth, padding: 8, borderRadius: 8, height: 200}}
            />
            <Text style={{marginHorizontal: 16, color: '#666'}}>
                Paste the text above into Google Sheets to get a table of all form submissions.
            </Text>
        </ScreenContentScroll>
    )
}
