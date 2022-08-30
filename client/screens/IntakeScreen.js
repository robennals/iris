import { Entypo, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { email_label, FixedTouchable, FormInput, FormTitle, makePhotoDataUrl, name_label, parseQuestions, parseTopics, ScreenContentScroll, textToKey, validateEmail, validateName, WideButton } from '../components/basics';
import { CommunityPhotoIcon, getUrlForImage, PhotoPicker } from '../components/photo';
import { PopupSelector } from '../components/shim';
import { baseColor, highlightColor } from '../data/config';
import { getCurrentUser, watchData } from '../data/fbutil';
import { submitCommunityFormAsync } from '../data/servercall';


function ValidationWarning({children}) {
    return <Text style={{marginBottom: 8, marginHorizontal: 16, color: 'red'}}>{children}</Text>
}

function ValidateAnswer({answerType, answer}) {
    if (answerType == 'email' && answer && !validateEmail(answer)) {
        return <ValidationWarning>Invalid email address</ValidationWarning>
    } else if (answerType == 'name' && answer && !validateName(answer)) {
        return <ValidationWarning>Please enter the real name you are generally known by. It will only be shown to community admins and other members of your small discussion group.</ValidationWarning>
    }
    return null;
}

function keysToSet(keys) {
    return _.fromPairs(_.map(keys, k => [k,true]));
}

function QuestionAnswer({question, answer, onChangeAnswer, selector, onSelectorChange}) {
    const [focus, setFocus] = useState(false);
    const atype = question.answerType;
    if (question.answerType == 'options') {
        const items = question.options.map(option => ({label: option, id: option}));
        const itemSet = keysToSet(items.map(item => item.id));
        var shownAnswer = answer;
        var isOther = false;
        if (answer && !itemSet[answer] && answer != 'choose') {
            shownAnswer = 'other';
            isOther = true;
            // console.log('other', {answer, itemSet, items});
        }
        // return <PopupSelector value={answer} items={[{id: 'hello', label: 'Hello'}]} />
        return (
            <View>
                <PopupSelector width={200} value={shownAnswer || 'choose'}
                    onSelect={onChangeAnswer}
                    items={[{id:'choose', label: 'Choose an option'},...items, {id:'other', label: 'Other (please specify)'}]} />
                {isOther ? 
                    <FormInput value={answer == 'other' ? '' : answer} onChangeText={onChangeAnswer} 
                        placeholder='Please specify'
                    />
                : null}
            </View>
        )
    } else {
        return (
            <View>
                <FormInput
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    autocomplete={atype == 'text' ? null : atype}
                    keyboardType={atype == 'email' ? 'email-address' : null}
                    textContentType={atype == 'email' ? 'emailAddress' : (atype == 'name' ? 'name' : null)}
                    value={answer || ''}
                    onChangeText={onChangeAnswer} />
                {focus ? null :
                    <ValidateAnswer answerType={atype} answer={answer} />
                }                
            </View>
        )
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


const shadowStyle = {
    shadowRadius: 4, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5, elevation: 3}

function Topic({topic, selected, onChangeSelected}) {
    return (
        <View style={{marginHorizontal: 16, marginVertical: 4}}>
            <FixedTouchable onPress={() => onChangeSelected(!selected)}>
                <View style={{flexDirection: 'row', alignItems: 'center', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, padding: 8, borderRadius: 8,
                    ... selected ? shadowStyle : {}
                    }}>
                    {/* <MaterialIcons color='#666' name={selected ? 'check-box' : 'check-box-outline-blank'} size={40} /> */}
                    <View style={{width: 40, height: 40,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: selected ? baseColor : 'white',
                            borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 20,
                            }}>
                        {selected ?
                            <Entypo name='check' size={30} style={{marginTop: 4, color: 'white'}} />
                        : null}
                    </View>
                    <View style={{marginLeft: 12}}>
                        <Text style={{fontWeight: 'bold', marginBottom: 4}}>{topic.title}</Text>
                        {topic.questions.map(question =>
                            <Text key={question} style={{color: '#666'}}>{question}</Text>
                        )}
                    </View>
                </View>
            </FixedTouchable>
        </View>
    )

}


function ConfirmScreen({community, email}) {
    const [info, setInfo] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setInfo);
    }, [community])

    if (!info) return null;

    return (
        <ScreenContentScroll>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{info.name}</Text>
            </View>
            <View style={{margin: 16}}>
                {getCurrentUser() ? 
                    <View>
                        <Text style={{fontWeight: 'bold', fontSize: 24, marginBottom: 8}}>Look out for an Email Soon</Text>
                        <Text style={{color: '#666'}}>
                            We will send you an email once we've added you to a discussion group.
                        </Text>
                    </View> 
                :
                    <View>
                        <Text style={{fontWeight: 'bold', fontSize: 24, marginBottom: 8}}>Check your Email to Confirm</Text>
                        <Text style={{color: '#666'}}>We just sent a confirmation email to <Text style={{fontWeight: 'bold'}}>{email}</Text>. Click the link in that message to confirm your sign up.
                        </Text>
                    </View>
                }
            </View>

        </ScreenContentScroll>
    )
}


export function IntakeScreen({community}) {
    const [info, setInfo] = useState(null);
    const [answers, setAnswers] = useState({});
    const [selectedTopics, setSelectedTopics] = useState({});
    const [photoData, setPhotoData] = useState(null);
    const [thumbData, setThumbData] = useState(null);
    const [inProgress, setInProgress] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setInfo);
    }, [community])

    // console.log('intake', info, community);

    if (!info) return null;

    const questions = parseQuestions(info.questions);
    const topics = parseTopics(info.topics);
    // console.log('questions', questions);
    // console.log('answers', answers);
    // console.log('topics', topics, selectedTopics);

    async function onSubmit() {
        const name = answers[name_label];
        const email = answers[email_label];
        setInProgress(true);
        await submitCommunityFormAsync({community, photoData, thumbData, name, email, answers, selectedTopics});
        setConfirmed(true);
    }

    // console.log('stuff', answers, answers.email, answers.name, photoData);

    // return <ConfirmScreen community={community} email='hello@world.com' />

    if (confirmed) {
        return <ConfirmScreen community={community} email={answers[email_label]} />
    }

    return (
        <ScreenContentScroll>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{info.name}</Text>
            </View>
            <View style={{margin: 16}}>
                <Text style={{color: '#666'}}>{info.info}</Text>
            </View>
            <View style={{borderTopColor: '#ddd', marginVertical: 16, borderTopWidth: StyleSheet.hairlineWidth}} />
            <View style={{margin: 16}}>
                <Text style={{fontSize: 18, marginBottom: 4, fontWeight: 'bold'}}>About You</Text>
                <Text style={{color: '#666'}}>This information is used to help match you with people to talk with. It will only be shared with community admins and members of your chat groups.</Text>

            </View>
            <View style={{margin: 16, alignSelf: 'center'}}>
                <PhotoPicker photoData={photoData} onChoosePhoto={({photoData, thumbData}) => {setPhotoData(photoData); setThumbData(thumbData)}} />
            </View>
            {questions.map(q =>
                <Question key={q.question} question={q} 
                    answer={answers[textToKey(q.question)]} 
                    onChangeAnswer={answer => setAnswers({...answers, [textToKey(q.question)]: answer})} 
                />
            )}
            <View style={{borderTopColor: '#ddd', marginHorizontal: 0, marginBottom: 16, marginTop: 32, borderTopWidth: StyleSheet.hairlineWidth}} />
            <View style={{margin: 16}}>
                <Text style={{fontSize: 18, marginBottom: 4, fontWeight: 'bold'}}>What Topics would you like to Discuss?</Text>
                <Text style={{color: '#666'}}>Choosing more topics increases the chance of a good match.</Text>
            </View>
            {topics.map(topic =>
                <Topic key={topic.title} topic={topic}
                    selected={selectedTopics[textToKey(topic.title)]}
                    onChangeSelected={selected => setSelectedTopics({...selectedTopics, [textToKey(topic.title)]: selected})}
                />
            )}
            <View style={{borderTopColor: '#ddd', marginHorizontal: 0, marginBottom: 16, marginTop: 32, borderTopWidth: StyleSheet.hairlineWidth}} />
            <WideButton style={{alignSelf: 'flex-start'}} onPress={onSubmit} disabled={!answers[email_label] || !answers[name_label] || !thumbData || inProgress}>
                {inProgress ? 'Submitting...' : 'Submit'}
            </WideButton>

        </ScreenContentScroll>
    )
}