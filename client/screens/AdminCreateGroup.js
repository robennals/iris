import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { email_label, FixedTouchable, FormInput, FormTitle, name_label, parseQuestions, parseTopics, WideButton } from '../components/basics';
import _ from 'lodash';
import { adminCreateGroupAsync } from '../data/servercall';
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { PopupSelector } from '../components/shim';
import { Entypo } from '@expo/vector-icons';
import { baseColor } from '../data/config';

function IntakeMember({intake, questionTitles, selected, onSelect}) {
    const answers = _.map(questionTitles, q => intake.answers[q])
    const answerSummary = _.join(answers, ', ');
    const topicSummary = _.join(_.sortBy(Object.keys(intake.selectedTopics),x=>x), ', ');

    return (
        <FixedTouchable onPress={() => onSelect(!selected)} >
            <View style={{flexDirection: 'row', marginVertical: 8, alignItems: 'center'}}>
                {selected ?
                    <View style={{width: 50, height: 50,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: baseColor,
                        borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 25,
                        }}>
                        <Entypo name='check' size={40} style={{marginTop: 4, color: 'white'}} />
                    </View>
                : 
                    <MemberPhotoIcon photoKey={intake.photoKey} user={intake.user} size={50} />
                }
                <View style={{marginLeft: 8}}>
                    <Text style={{fontWeight: 'bold', marginBottom: 2}}>{intake.name} <Text style={{fontWeight: '400'}}>{'<' + intake.email + '>'}</Text></Text>
                    <Text>{answerSummary}</Text>
                    <Text style={{color: '#666', fontSize: 13}}>{topicSummary}</Text>
                </View>
            </View>
        </FixedTouchable>
    )
}

export function AdminCreateGroupScreen({navigation, route}) {
    const {community} = route.params;
    const [tsv, setTsv] = useState('');
    const [name, setName] = useState('');
    // const [questions, setQuestions] = useState('');
    const [confirm, setConfirm] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const [communityInfo, setCommunityInfo] = useState(null);
    const [intake, setIntake] = useState(null);
    const [topic, setTopic] = useState('choose');
    const [selectedMembers, setSelectedMembers] = useState({});
    const [method, setMethod] = useState(null);
    const [privateName, setPrivateName] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setCommunityInfo);
        watchData(x, ['intake', community], setIntake);
        return () => internalReleaseWatchers();
    }, [community])

    if (!community || !communityInfo || !intake) return null;

    const textBoxStyle = {
        backgroundColor: 'white',
        padding: 8,
        borderColor: '#ddd',
        borderRadius: 8,
        borderWidth: 1,
        margin: 4,
        // flex: 1,
        marginHorizontal: 16,
        marginTop: 8
    }

    const people = parseTsv(tsv || '');

    async function onCreateGroupClicked() {
        setInProgress(true);
        const picked = Object.keys(selectedMembers).filter(x => selectedMembers[x]).map(k => intake[k]);
        await adminCreateGroupAsync({community, topic, privateName, people, picked});
        setConfirm('Created group "' + topic + '" with ' + memberCount + ' members' + '\n' + confirm)
        // setName('');
        // setQuestions('');
        // setTsv('');
        // setInProgress(false);
        navigation.goBack();
    }
    
    const topics = parseTopics(communityInfo.topics);
    const questions = parseQuestions(communityInfo.questions);
    const topicItems = [{id: 'choose', label: 'Choose a Topic'}, ... topics.map(t => ({id: t.title, label: t.title}))]
    const questionTitles = questions.map(q => q.question).filter(x => x != name_label && x != email_label);
    const intakeKeysForTopic = Object.keys(intake).filter(k => intake[k].selectedTopics[topic] || topic == 'choose');

    const memberCount = people.length + Object.keys(selectedMembers).filter(k => selectedMembers[k]).length;
    console.log('group', {community, topic, people, privateName, selectedMembers, memberCount})

    return (
        <View>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{communityInfo.name}</Text>
            </View>

            <FormTitle title='Topic'>
                <PopupSelector width={200} value={topic || 'choose'} items={topicItems} onSelect={setTopic} />
            </FormTitle>

            <FormTitle title='Private Name'>
                <FormInput value={privateName || ''} style={textBoxStyle} onChangeText={setPrivateName} placeholder='Name only seen by admin, to disguish different groups for same topic' />
            </FormTitle>


            <FormTitle title='Member Selection Method'>
                <PopupSelector value={method || 'signups'} items={[{id: 'signups', label: 'Signups'}, {id: 'tsv', label: 'Tab Separated Values'}]} 
                    onSelect={setMethod}
                />
            </FormTitle>

            {/* <FormTitle title='Group Name'>
                <TextInput value={name} onChangeText={setName} style={textBoxStyle} />
            </FormTitle>
            <FormTitle title='Discussion Questions'>
                <TextInput multiline value={questions} onChangeText={setQuestions} style={[textBoxStyle, {height: 100}]} />
            </FormTitle> */}

            {method != 'tsv' ?
                <FormTitle title='Members (from signups)'>
                    <ScrollView style={{height: 400, marginHorizontal: 16, marginVertical: 8, borderColor: '#ddd', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 8}}>
                        {intakeKeysForTopic.map(k => 
                            <IntakeMember key={k} intake={intake[k]} questionTitles={questionTitles} 
                                selected={selectedMembers[k]} 
                                onSelect={selected => setSelectedMembers({...selectedMembers, [k]: selected})} />
                        )}
                    </ScrollView>
                </FormTitle>
            :
                <FormTitle title='Members (TSV)'>
                    <TextInput multiline placeholder='Copy/paste a table of members from Google Sheets, with Name, Email, Bio columns'  
                        onChangeText={setTsv}
                        value={tsv}
                        style={[textBoxStyle, {height: 200}]} />
                    {/* <FormInput multiline placeholder='Paste a table from Google Sheets, with Name, Email, Bio columns' style={{height: 100}} /> */}
                </FormTitle>
            }

            <FormTitle title='Parsed Members'>
                {people.map(person =>
                    <MemberPreview person={person} key={person.email} />
                )}
            </FormTitle>

            <WideButton alwaysActive onPress={onCreateGroupClicked} style={{alignSelf: 'flex-start'}} disabled={!topic || !privateName || inProgress || (memberCount <= 1)}>
                {inProgress ? 'Creating Group...' : 'Create Group' }
            </WideButton>

        </View>
    )
}

function parseTsv(tsv) {
    const lines = _.filter(tsv.trim().split('\n'));
    const people = _.map(lines, line => {
        const [name, email, bio] = line.split('\t');
        return {name: name.trim(), email: email.trim(), bio: bio.trim()}
    })
    return people;
}

function MemberPreview({person}) {
    const {name, email, bio} = person;
    return (
        <View style={{marginHorizontal:16, marginVertical: 8}}>
            <Text style={{fontSize: 16}}><Text style={{fontWeight:'bold'}}>{name}</Text> <Text>({email})</Text></Text>
            <Text style={{fontSize: 14, color: '#666'}}>{bio}</Text>
        </View>
    )
    return <Text>Hello {name}</Text>
}
