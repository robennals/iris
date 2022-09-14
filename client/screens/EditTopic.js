import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FormInput, FormTitle, mergeEditedParams, ScreenContentScroll, WideButton } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import { editTopicAsync } from '../data/servercall';

function questionJsonToText(questions) {
    if (!questions) {
        return '';
    }
    try {
        const questionList = JSON.parse(questions);
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
    const [questions, setQuestions] = useState(null);
    const [summary, setSummary] = useState(null);
    const [communityInfo, setCommunityInfo] = useState(null);
    const [old, setOld] = useState({});

    useEffect(() => {
        var x = {};
        if (topic) {
            watchData(x, ['topic', community, topic], setOld);
        }
        return () => internalReleaseWatchers();
    }, [topic])

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setCommunityInfo);
        return () => internalReleaseWatchers(x);
    }, [community])

    const merged = mergeEditedParams({
        oldObj: {...old, questions: questionJsonToText(old.questions)}, 
        newObj: {name, summary, questions}})

    async function onSubmit() {
        await editTopicAsync({community, topic: topic || null, name: merged.name, 
                summary: merged.summary, questions: questionTextToJson(merged.questions)});
        navigation.goBack();
    }

    if (!communityInfo || !old) {
        return null;
    }

    return (
        <ScreenContentScroll>
            <View style={{marginVertical: 16}}>
                <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                    <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={64} />
                    <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{communityInfo.name}</Text>
                </View>

                <FormTitle title='Topic Name'>
                    <FormInput value={merged.name} onChangeText={setName} />
                </FormTitle>
                <FormTitle title='Brief Summary (optional)'>
                    <FormInput value={merged.summary} onChangeText={setSummary} />                
                </FormTitle>
                <FormTitle title='Three Short Questions (one per line)'>
                    <FormInput value={merged.questions} onChangeText={setQuestions} multiline extraStyle={{flex: null, height: 72}} />
                </FormTitle>
                <WideButton onPress={onSubmit} style={{marginTop: 32, alignSelf: 'flex-start'}} 
                    inProgress={topic ? 'Updating...' : 'Creating Topic...'}>
                    {topic ? 'Update Topic' : 'Create Topic'}
                </WideButton>
            </View>
        </ScreenContentScroll>
    )
}