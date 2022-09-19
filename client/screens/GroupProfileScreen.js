import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, parseQuestions, parseTopics, ScreenContentScroll, shouldIgnoreQuestion, textToKey, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, watchData } from '../data/fbutil';
import { Picker, View, StyleSheet, Text } from 'react-native';
import _ from 'lodash';
import { adminArchiveGroupAsync, leaveGroupAsync, updateGroupProfileAsync } from '../data/servercall';
import { CommunityPhotoIcon, GroupProfilePhotoPlaceholder, GroupProfilePhotoPreview, MemberPhotoIcon, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';
import { Catcher } from '../components/catcher';

function BioAnswers({answers, bioQuestions}) {
    if (!bioQuestions || !answers) return null;
    const goodQuestions = bioQuestions.map(q => q.question).filter(q => !shouldIgnoreQuestion(q));
    const sortedAnswers = goodQuestions.map(q => answers[textToKey(q)]);
    const joinedAnswers = _.join(sortedAnswers, ', ');
    return <Text>{joinedAnswers}</Text>
}

function MemberPreview({members, userId, bioQuestions}) {
    const member=members[userId];
    return (
        <View style={{flexDirection: 'row', height: 150}}>
            <MemberPhotoIcon photoKey={member.photo} name={member.name} user={userId} thumb={false} size={128} style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}} />
            <View style={{marginTop: 0, marginLeft: 16, flex: 1}}>
                <Text style={{fontSize: 18, fontWeight: '600', marginBottom: 4}}>{member.name}</Text>
                <Text>{member.bio}</Text>
                <Catcher>
                    <BioAnswers answers={member.answers} bioQuestions={bioQuestions} />
                </Catcher>
            </View>
        </View>
    )
}

export function GroupProfileScreen({navigation, route}) {
    const {group} = route.params;
    const [members, setMembers] = useState(null);
    const [name, setName] = useState('');
    const [questions, setQuestions] = useState('');
    const [community, setCommunity] = useState(null);
    const [communityInfo, setCommunityInfo] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'name'], setName)
        watchData(x, ['group', group, 'member'], setMembers)
        watchData(x, ['group', group, 'questions'], setQuestions, '');
        watchData(x, ['group', group, 'community'], setCommunity);
        return () => internalReleaseWatchers(x)
    }, [group]);

    useEffect(() => {
        var x = {};
        if (community) {
            watchData(x, ['community', community], setCommunityInfo, null);
        }
    }, [community]);    

    if (!members) return null;

    const filteredMemberKeys = Object.keys(members || {}).filter(k => k != 'zzz_irisbot');

    var selectedTopicQuestions = [];
    var bioQuestions = [];
    // console.log('communityInfo', communityInfo)
    if (communityInfo) {
        const topics = parseTopics(communityInfo.topics);
        const selectedTopic = _.find(topics, t => t.title == name);
        selectedTopicQuestions = selectedTopic?.questions;    

        bioQuestions = parseQuestions(communityInfo.questions);
    }


    // console.log('selectedTopicquestions', selectedTopicQuestions);
    // console.log('bioQuestions', bioQuestions);

    const filteredQuestions = selectedTopicQuestions?.filter(q => q[0] != '>')

    // console.log('groupProfile', questions);

    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 16}}>
                <View style={{marginVertical: 16}}>
                {communityInfo ? 
                    <View style={{alignItems: 'center', flexDirection: 'row'}}>
                        <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={24} />
                        <Text style={{fontSize: 18, marginLeft: 4, fontWeight: 'bold'}}>{communityInfo.name}</Text>
                    </View>
                : null}
                <Text style={{fontSize: 32, fontWeight: 'bold', marginTop: 4, marginBottom: 8}}>{name}</Text>
            </View>

            <View>
                {filteredQuestions ? 
                    filteredQuestions.map(question => 
                        <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                            <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                            <Text key={question} style={{color: '#666', marginBottom: 2}}>{question}</Text>
                        </View>
                    )
                :null}
            </View>

            <Text style={{fontSize: 24, fontWeight: 'bold', marginTop: 32, marginBottom: 24}}>Participants</Text>

            {filteredMemberKeys.map(m => 
                <MemberPreview key={m} members={members} bioQuestions={bioQuestions} userId={m} />
            )}


            <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />

            <View style={{flexDirection: 'row'}}>
                <WideButton onPress={() => navigation.replace('leaveGroup', {group})}>
                    Leave Group
                </WideButton>
                <WideButton alwaysActive onPress={() => navigation.replace('reportAbuse', {group})} 
                        style={{alignSelf: 'flex-start'}}>
                    Report Abuse
                </WideButton>
            </View>
            {isMasterUser(getCurrentUser()) ?
                // <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, margin: 16,padding: 8, borderRadius: 8}}>
                <View>
                    <View style={{marginVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />

                    <Text style={{alignSelf: 'center', fontWeight: 'bold'}}>Admin Controls</Text>
                    <View style={{flexDirection: 'row'}}>
                        <WideButton onPress={() => adminArchiveGroupAsync({group})}>Archive Group</WideButton>
                    </View>
                </View>
            :null}        

            </View>
        </ScreenContentScroll>
    )

}