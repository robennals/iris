import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import { email_label, name_label, parseQuestions, parseTopics, ScreenContentScroll } from '../components/basics'
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';

function tabLineForMember({member, questionNames, topicKeys}) {
    console.log('tabLine', {member, topicKeys});
    const basics = [member?.answer?.[name_label] || '', member?.answer?.[email_label] || ''];
    const answers = questionNames.map(q => member?.answer?.[q]);
    const topics = topicKeys.map(t => member?.topic?.[t] || '');
    const confirmed = (member.confirmed == 'false' ? 'NO' : 'yes');
    const allCells = [...basics, confirmed, ...answers, ...topics];
    return _.join(allCells, '\t');
}

export function CommunitySignupsScreen({route}) {
    const {community} = route.params;
    // const [intake, setIntake] = useState(null);
    const [topics, setTopics] = useState(null);
    const [members, setMembers] = useState(null);
    const [info, setInfo] = useState(null);
    useEffect(() => {
        var x = {};
        // watchData(x, ['intake', community], setIntake);
        watchData(x, ['commMember', community], setMembers);
        watchData(x, ['community', community], setInfo);
        watchData(x, ['topic', community], setTopics);
        return () => internalReleaseWatchers(x);
    }, [community]);

    if (!members || !info || !topics) return null;

    // console.log('stuff', {community, members, info});

    const questions = parseQuestions(info.questions);
    // const topics = parseTopics(info.topics);
    const questionNames = questions.map(q => q.question).filter(n => n != email_label && n != name_label);
    const topicNames = _.keys(topics).map(k => topics[k].name);

    const columns = ['Name', 'Email', 'Confirmed', ... questionNames, ... topicNames] 
    const columnText = _.join(columns, '\t');
    const itemLines = Object.keys(members).map(k => tabLineForMember({member: members[k], questionNames, topicKeys: _.keys(topics)}));
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
