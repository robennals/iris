import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import { email_label, name_label, parseQuestions, parseTopics, ScreenContentScroll } from '../components/basics'
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';

function tabLineForIntakeLine({intakeItem, questionNames, topicNames}) {
    const basics = [intakeItem.name, intakeItem.email];
    const answers = questionNames.map(q => intakeItem.answers[q]);
    const topics = topicNames.map(t => intakeItem.selectedTopics[t]);
    const allCells = [...basics, ...answers, ...topics];
    return _.join(allCells, '\t');
}

export function CommunitySignupsScreen({route}) {
    const {community} = route.params;
    const [intake, setIntake] = useState(null);
    const [info, setInfo] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['intake', community], setIntake);
        watchData(x, ['community', community], setInfo);
        return () => internalReleaseWatchers(x);
    }, [community]);

    if (!intake || !info) return null;

    console.log('stuff', {community, intake, info});

    const questions = parseQuestions(info.questions);
    const topics = parseTopics(info.topics);
    const questionNames = questions.map(q => q.question).filter(n => n != email_label && n != name_label);
    const topicNames = topics.map(t => t.title);

    const columns = ['Name', 'Email', ... questionNames, ... topicNames] 
    const columnText = _.join(columns, '\t');
    const itemLines = Object.keys(intake).map(k => tabLineForIntakeLine({intakeItem: intake[k], questionNames, topicNames}));
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
