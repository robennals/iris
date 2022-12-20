import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormCheckbox, FormInput, FormTitle, mergeEditedParams, ScreenContentScroll, WideButton } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { internalReleaseWatchers, isMasterUser, watchData } from '../data/fbutil';
import { editPostTopicAsync, editTopicAsync } from '../data/servercall';
import _ from 'lodash';

function questionJsonToText(questions) {
    // console.log('questions', questions);
    if (!questions) {
        return '';
    }
    try {
        const questionList = JSON.parse(questions);
        // console.log('parsed', questionList);
        return _.join(questionList, '\n');
    } catch (e) {
        return '';
    }
}

function questionTextToJson(questionText) {
    const questionList = questionText.trim().split('\n').map(t => t.trim()).filter(x => x);
    return JSON.stringify(questionList);
}

export function EditTopicScreen({navigation, route}) {
    const {community, topic} = route.params;
    const [name, setName] = useState(null);
    const [pinned, setPinned] = useState(null);
    const [questions, setQuestions] = useState(null);
    const [summary, setSummary] = useState(null);
    const [communityInfo, setCommunityInfo] = useState(null);
    const [old, setOld] = useState({});

    const isMaster = isMasterUser();

    useEffect(() => {
        var x = {};
        if (topic) {
            watchData(x, ['postTopic', community, topic], setOld);
        }
        return () => internalReleaseWatchers();
    }, [topic])

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setCommunityInfo);
        return () => internalReleaseWatchers(x);
    }, [community])

    const oldQuestions = questionJsonToText(old.questions);

    const merged = mergeEditedParams({
        oldObj: {...old, questions: oldQuestions}, 
        newObj: {name, summary, pinned, questions}})


    async function onSubmit() {
        await editPostTopicAsync({community, topic: topic || null, name: merged.name, 
                pinned: merged.pinned,
                summary: merged.summary, questions: questionTextToJson(merged.questions)});
        navigation.goBack();
    }

    if (!communityInfo || !old) {
        return null;
    }

    return (
        <ScreenContentScroll>
            <View style={{marginVertical: 16}}>
                {!isMaster ?
                    <View style={{margin: 16, padding: 8, borderColor: '#ddd', alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8}}>
                        <Text>Your topic will need to be approved by a community admin.</Text>
                    </View>
                : null}

                <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                    <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={64} />
                    <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{communityInfo.name}</Text>
                </View>

                <FormTitle title='Topic Name'>
                    <FormInput value={merged.name} maxLength={40} onChangeText={setName} />
                </FormTitle>
                <FormTitle title='Brief Summary (optional)'>
                    <FormInput value={merged.summary} onChangeText={setSummary} />                
                </FormTitle>
                {/* <FormTitle title='Three Short Questions (one per line)'>
                    <FormInput value={merged.questions || ''} onChangeText={setQuestions} multiline extraStyle={{flex: null, height: 72}} />
                </FormTitle> */}
                {/* {isMaster ?
                    <FormCheckbox label='Pin in Intake Form' selected={merged.pinned} onChangeSelected={setPinned} />
                : null} */}
                <WideButton onPress={onSubmit} style={{marginTop: 32, alignSelf: 'flex-start'}} 
                    inProgress={topic ? 'Updating...' : 'Creating Topic...'}>
                    {topic ? 'Update Topic' : (isMaster ? 'Create Topic' : 'Suggest Topic')}
                </WideButton>
            </View>
        </ScreenContentScroll>
    )
}