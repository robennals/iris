import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormInput, FormTitle, makePhotoDataUrl, ScreenContentScroll } from '../components/basics';
import { CommunityPhotoIcon, getUrlForImage } from '../components/photo';
import { PopupSelector } from '../components/shim';
import { watchData } from '../data/fbutil';

const basicQuestions = [
    {question: 'What is your full name?', answerType: 'name'},
    {question: 'What is your email?', answerType: 'email'}
]

function parseQuestions(questions) {
    const questionList = questions.trim().split('\n');
    const parsedQuestions = questionList.map(qtext => {
        // console.log('qtext', qtext);
        const [question, answerText] = qtext.split(':');
        var answerType;
        var options;
        if (answerText.trim().toLowerCase() == 'text') {
            answerType = 'text'
        } else {
            answerType = 'options'            
            options = answerText.split(',').map(x => x.trim());
        }
        return {question, answerType, options};
    })
    return [...basicQuestions, ...parsedQuestions];
}

function QuestionAnswer({question, answer, onChangeAnswer}) {
    const atype = question.answerType;
    if (question.answerType == 'options') {
        const items = question.options.map(option => ({label: option, id: option}));
        // return <PopupSelector value={answer} items={[{id: 'hello', label: 'Hello'}]} />
        return (
            <PopupSelector width={200} value={answer || 'choose'} 
                onSelect={onChangeAnswer} 
                items={[{id:'choose', label: 'Choose an option'},...items]} />
        )
    } else {
        return <FormInput 
            autocomplete={atype == 'text' ? null : atype} 
            keyboardType={atype == 'email' ? 'email-address' : null}
            textContentType={atype == 'email' ? 'emailAddress' : (atype == 'name' ? 'name' : null)}
            onChangeText={onChangeAnswer} />
    }
}

function Question({question, answer, onChangeAnswer}) {
    return (
        <View>
            <FormTitle title={question.question}>
                <QuestionAnswer question={question} answer={answer} onChangeAnswer={onChangeAnswer} />
            </FormTitle>
        </View>
    )
}

export function IntakeScreen({community}) {
    const [info, setInfo] = useState(null);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setInfo);
    }, [community])

    // console.log('intake', info, community);

    if (!info) return null;

    const questions = parseQuestions(info.questions);
    // console.log('questions', questions);
    // console.log('answers', answers);

    return (
        <ScreenContentScroll>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{info.name}</Text>
            </View>
            <View style={{margin: 16}}>
                <Text style={{color: '#666'}}>{info.info}</Text>
            </View>
            <View style={{borderTopColor: '#ddd', marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth}} />
            {questions.map(q => 
                <Question key={q.question} question={q} answer={answers[q.question]} onChangeAnswer={answer => setAnswers({...answers, [q.question]: answer})} />
            )}
        </ScreenContentScroll>
    )
}