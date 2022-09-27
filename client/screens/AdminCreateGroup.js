import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { email_label, FixedTouchable, FormInput, FormTitle, name_label, parseQuestions, parseTopics, ScreenContentScroll, searchMatches, textToKey, WideButton } from '../components/basics';
import _ from 'lodash';
import { adminCreateGroupAsync } from '../data/servercall';
import { internalReleaseWatchers, useDatabase, watchData } from '../data/fbutil';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { PopupSelector } from '../components/shimui';
import { Entypo } from '@expo/vector-icons';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { dayMillis, formatFullTime, formatTime } from '../components/time';
import { Loading } from '../components/loading';
import { SearchBox } from '../components/searchbox';

function topicSelected(state) {
    return state == 'yes' || state == 'maybe';
}

function Member({memberKey, member, topicsForUser, questionTitles, allTopics, sortedTopicKeys, selected, onSelect}) {
    const answers = _.map(questionTitles, q => member.answer[textToKey(q)])
    const answerSummary = _.join(answers, ', ');
    const memberTopics = sortedTopicKeys.filter(t => topicSelected(member.topic?.[t]))
    const memberTopicNames = memberTopics.map(t => allTopics[t].name);
    const neededTopicNames = memberTopicNames.filter(topicName => !topicsForUser[topicName]);
    const topicSummary = _.join(neededTopicNames, ', ');
    const doneTopics = _.sortBy(_.keys(topicsForUser), x => x);
    const doneTopicsSummary = _.join(doneTopics, ', ');


    const name = member.answer[name_label];
    const email = member.answer[email_label];

    console.log('doneTopics', name, doneTopics);


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
                    <MemberPhotoIcon name={name} photoKey={member.photoKey} user={memberKey} size={50} />
                }
                <View style={{marginLeft: 8}}>
                    <Text style={{fontWeight: 'bold', marginBottom: 2}}>{name} <Text style={{fontWeight: '400'}}>{'<' + email + '>'} <Text style={{color: '#666', fontSize: 12}}> {formatTime(member.intakeTime)}</Text></Text></Text>
                    <Text>{answerSummary}</Text>
                    {neededTopicNames.length > 0 ?
                        <Text style={{color: '#666', fontSize: 13}}>Wants: {topicSummary}</Text>
                    : null}
                    {doneTopics.length > 0 ?
                        <Text style={{color: '#666', fontSize: 13}}>Got: {doneTopicsSummary}</Text>
                    : null}
                </View>
            </View>
        </FixedTouchable>
    )
}

function getUsersWithTopic(groups) {
    var usersForTopic = {};
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        const topic = group.name;
        console.log('group', topic, group.member, group);
        if (!usersForTopic[topic]) {
            usersForTopic[topic] = {};
        }
        _.forEach(_.keys(group.member), m => {
            usersForTopic[topic][m] = true;
        })
    })
    return usersForTopic;
}

function getTopicsForUser(groups) {
    const timeCutoff = Date.now() - (14 * dayMillis);
    var topicsForUser = {};
    _.forEach(_.keys(groups), g => {
        const group = groups[g];
        const topic = group.name;
        _.forEach(_.keys(group.member), m => {
            if (!topicsForUser[m]) {
                topicsForUser[m] = {};
            }
            topicsForUser[m][topic] = true;
        })
    })    
    return topicsForUser;
}

export function AdminCreateGroupScreen({navigation, route}) {
    const {community} = route.params;
    const [tsv, setTsv] = useState('');
    const [name, setName] = useState('');
    // const [questions, setQuestions] = useState('');
    const groups = useDatabase([community], ['adminCommunity', community, 'group']);
    const [confirm, setConfirm] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const [communityInfo, setCommunityInfo] = useState(null);
    // const [intake, setIntake] = useState(null);
    const [members, setMembers] = useState(null);
    const [allTopics, setAllTopics] = useState(null);
    const [topic, setTopic] = useState('choose');
    const [selectedMembers, setSelectedMembers] = useState({});
    const [method, setMethod] = useState(null);
    const [privateName, setPrivateName] = useState(null);
    const [search, setSearch] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['commMember', community], setMembers);
        watchData(x, ['topic', community], setAllTopics);
        watchData(x, ['community', community], setCommunityInfo);
        return () => internalReleaseWatchers();
    }, [community])

    console.log('groups', {community, members, groups});

    if (!community || !members || !communityInfo || !groups || !allTopics) return <Loading />;

    const usersWithTopic = getUsersWithTopic(groups);
    const topicsForUser = getTopicsForUser(groups);

    console.log('topicMaps', {groups, usersWithTopic, topicsForUser});


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
        // const picked = Object.keys(selectedMembers).filter(x => selectedMembers[x]).map(k => intake[k]);
        const memberKeys = _.keys(selectedMembers).filter(k => selectedMembers[k]);
        await adminCreateGroupAsync({community, topicKey: topic, privateName, tsvMembers: people, memberKeys});
        setConfirm('Created group "' + topic + '" with ' + memberCount + ' members' + '\n' + confirm)
        // setName('');
        // setQuestions('');
        // setTsv('');
        // setInProgress(false);
        navigation.goBack();
    }
    
    // const topics = parseTopics(communityInfo.topics);
    const questions = parseQuestions(communityInfo.questions);
    const allTopicKeys = _.keys(allTopics);
    const sortedTopicKeys = _.sortBy(allTopicKeys, k => allTopics[k].time).reverse();
    const topicItems = [{id: 'choose', label: 'Choose a Topic'}, ... allTopicKeys.map(k => ({id: k, label: allTopics[k].name}))]
    const questionTitles = questions.map(q => q.question).filter(x => x != name_label && x != email_label);
    // const intakeKeysForTopic = Object.keys(intake).filter(k => intake[k].selectedTopics[topic] || topic == 'choose');
    // console.log('stuff', {members, allTopics});
    const realMemberKeys = _.keys(members).filter(k => members[k].answer);
    const sortedMemberKeys = _.sortBy(realMemberKeys, k => members[k].intakeTime);
    // console.log('topic', topic);
    const topicName = allTopics[topic]?.name;
    const memberKeysForTopic = sortedMemberKeys.filter(k => 
        (topicSelected(members[k].topic?.[topic]) && !usersWithTopic[topicName]?.[k]) || topic == 'choose');
    var searchFilteredMembers = memberKeysForTopic;
    if (search) {
        searchFilteredMembers = _.filter(memberKeysForTopic, m => searchMatches(members[m]?.answer?.[name_label], search));
    }
    console.log('members', members);

    const memberCount = people.length + Object.keys(selectedMembers).filter(k => selectedMembers[k]).length;
    // console.log('group', {community, topic, people, privateName, selectedMembers, memberCount})    

    return (
        <ScreenContentScroll>
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
                    {/* <View style={{flexDirection: 'row'}}>
                        <Text style={{fontSize: 12, fontWeight: 'bold', marginTop: 12}}>Members</Text>
                        <SearchBox value={search} onChangeText={setSearch} style={{marginVertical: 8}} />
                    </View> */}
                    <SearchBox value={search} onChangeText={setSearch} style={{marginHorizontal: 16, marginBottom: 16}} />
                    <ScrollView style={{height: 400, marginHorizontal: 16, marginVertical: 8, borderColor: '#ddd', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 8}}>
                        {/* <SearchBox value={search} onChangeText={setSearch} /> */}
                            {searchFilteredMembers.map(k => 
                            <Catcher key={k}>
                                <Member key={k} memberKey={k} member={members[k]} questionTitles={questionTitles} 
                                    topicsForUser={topicsForUser[k]}
                                    selected={selectedMembers[k]} allTopics={allTopics} sortedTopicKeys={sortedTopicKeys}
                                    onSelect={selected => setSelectedMembers({...selectedMembers, [k]: selected})} />
                            </Catcher>
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

            <WideButton alwaysActive onPress={onCreateGroupClicked} style={{alignSelf: 'flex-start'}} disabled={!topic || topic=='choose' || !privateName || inProgress || (memberCount <= 1)}>
                {inProgress ? 'Creating Group...' : 'Create Group' }
            </WideButton>

        </ScreenContentScroll>
    )
}

function parseTsv(tsv) {
    const lines = _.filter(tsv.trim().split('\n'));
    const people = _.map(lines, line => {
        const [name, email, bio] = line.split('\t');
        return {name: name?.trim(), email: email?.trim(), bio: bio?.trim()}
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
}
