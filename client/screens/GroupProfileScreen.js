import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, memberKeysToHues, parseQuestions, parseTopics, ScreenContentScroll, shouldIgnoreQuestion, textToKey, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, useDatabase, watchData } from '../data/fbutil';
import { Picker, View, StyleSheet, Text } from 'react-native';
import _ from 'lodash';
import { acceptJoinRequestAsync, adminArchiveGroupAsync, leaveGroupAsync, updateGroupProfileAsync } from '../data/servercall';
import { CommunityPhotoIcon, GroupProfilePhotoPlaceholder, GroupProfilePhotoPreview, MemberPhotoIcon, pickImage } from '../components/photo';
import { resizeImageAsync, useCustomNavigation } from '../components/shim';
import { Catcher } from '../components/catcher';
import { FollowAvoid } from '../components/followavoid';
import { Loading } from '../components/loading';
import { baseColor } from '../data/config';


function BioAnswers({answers, bioQuestions}) {
    if (!bioQuestions || !answers) return null;
    const goodQuestions = bioQuestions.map(q => q.question).filter(q => !shouldIgnoreQuestion(q));
    const sortedAnswers = _.filter(goodQuestions.map(q => answers[textToKey(q)]), x => x);
    const joinedAnswers = _.join(sortedAnswers, ', ');
    return <Text style={{color: '#666'}} numberOfLines={1}>{joinedAnswers}</Text>
}

function MemberPreview({community, group, topic, viewpoint, members, hue, userId, bioQuestions}) {
    const member=members[userId];
    const navigation = useCustomNavigation();
    return (
        <View style={{flexDirection: 'row', minHeight: 150}}>
            <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: userId})} >
                <MemberPhotoIcon hue={hue} photoKey={member.photo} name={member.name} user={userId} thumb={false} size={64} style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}} />
            </FixedTouchable>
            <View style={{marginTop: 0, marginLeft: 16, flex: 1}}>
                <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: userId})} >
                    <Text style={{fontSize: 15, fontWeight: '600', marginBottom: 0}}>{member.name}</Text>
                    {member.bio ? 
                        <Text style={{color: '#666'}}>{member.bio}</Text>
                    : 
                        <Catcher>
                            <BioAnswers answers={member.answers} bioQuestions={bioQuestions} />
                        </Catcher>
                    }
                </FixedTouchable>
                {/* {viewpoint ? 
                    <FixedTouchable onPress={() => navigation.navigate('viewpoint', {community, group, topic, user:userId})}>
                        <View style={{marginTop: 4, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>
                            <Text numberOfLines={2}>{viewpoint.text}</Text>
                            <Text style={{marginTop: 4, color: baseColor, fontSize: 12}}>Read Viewpoint...</Text>
                        </View>
                    </FixedTouchable>
                : null} */}
                <FollowAvoid user={userId} style={{marginTop: 8}}/>
            </View>
        </View>
    )
}


function JoinRequest({user, joinRequest, community, topic}) {
    const [inProgress, setInProgress] = useState(false);

    function onIgnore() {
        setDataAsync(['userPrivate', getCurrentUser(), 'askToJoin', topic, user, 'state'], 'rejected');
    }

    async function onAccept() {
        await acceptJoinRequestAsync({community, topic, user});
    }

    return (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <MemberPhotoIcon user={user} photoKey={joinRequest.photo} name={joinRequest.name} size={64} />
            <View style={{marginLeft: 16}}>
                <Text style={{fontWeight: 'bold', marginBottom: 1}}>{joinRequest.name}</Text>
                <Text style={{color: '#666'}}>{joinRequest.text}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
                    <FixedTouchable onPress={onAccept}>
                        <View style={{borderColor: baseColor, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 16}}>
                            <Text style={{color: baseColor}}>Accept</Text>
                        </View>
                    </FixedTouchable>
                    <FixedTouchable onPress={onIgnore}>
                        <View>
                            <Text style={{color: '#666', marginHorizontal: 16}}>Ignore</Text>
                        </View>
                    </FixedTouchable>
                </View>
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
    const topic = useDatabase([group], ['group', group, 'topic'], null);
    const host = useDatabase([group], ['group', group, 'host'], null);
    const published = useDatabase([community, topic], ['published', community, topic]);
    const archived = useDatabase([group], ['group', group, 'archived'], false);
    const viewpoints = useDatabase([community, topic], ['viewpoint', community, topic], {});
    const askToJoin = useDatabase([topic], ['userPrivate', getCurrentUser(), 'askToJoin', topic]);

    const publishedCount = _.keys(published || {}).length || '';

    const askToJoinKeys = _.keys(askToJoin);
    const pendingJoinKeys = _.filter(askToJoinKeys, k => !askToJoin[k].state);
    const rejectedJoinKeys = _.filter(askToJoinKeys, k => askToJoin[k].state == 'rejected');
    const isHost = host == getCurrentUser();

    console.log('archived', archived);
    console.log('published', published);

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

    if (!members || !viewpoints) return <Loading />;

    const memberHues = memberKeysToHues(_.keys(members || {}));

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
                <View style={{marginTop: 16}}>
                {communityInfo ?
                    <FixedTouchable onPress={() => navigation.navigate('community', {community})} > 
                        <View style={{alignItems: 'center', flexDirection: 'row'}}>
                            <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={24} />
                            <Text style={{fontSize: 18, marginLeft: 4, fontWeight: 'bold'}}>{communityInfo.name}</Text>
                        </View>
                    </FixedTouchable>
                : null}
                <Text style={{fontSize: 32, fontWeight: 'bold', marginTop: 4, marginBottom: 4}}>{name}</Text>
            </View>

            <FixedTouchable onPress={() => navigation.navigate('highlights', {community, topic})}>
                <Text style={{color: '#666'}}>View {publishedCount}{publishedCount ? ' ' : ''}{publishedCount && publishedCount == 1 ? 'viewpoint' : 'viewpoints'}</Text>
            </FixedTouchable>

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

            {isHost && pendingJoinKeys.length > 0 ?
                <View>
                    <Text style={{fontSize: 16, fontWeight: 'bold', marginTop: 32, marginBottom: 24}}>New Join Requests</Text>
                    {pendingJoinKeys.map(k => 
                        <JoinRequest key={k} user={k} joinRequest={askToJoin[k]} community={community} topic={topic} />
                    )}
                </View>
            : null}

            <Text style={{fontSize: 16, fontWeight: 'bold', marginTop: 32, marginBottom: 24}}>Participants</Text>

            {filteredMemberKeys.map(m => 
                <MemberPreview key={m} topic={topic} group={group} viewpoint={viewpoints[m]} community={community} hue={memberHues[m]} members={members} bioQuestions={bioQuestions} userId={m} />
            )}

            {isHost && rejectedJoinKeys.length > 0 ?
                <View>
                    <Text style={{fontSize: 16, fontWeight: 'bold', marginTop: 32, marginBottom: 24}}>Rejected Join Requests</Text>
                    {rejectedJoinKeys.map(k => 
                        <JoinRequest keys={k} user={k} joinRequest={askToJoin[k]} community={community} topic={topic} />
                    )}
                </View>
            : null}

            

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
                        <WideButton onPress={() => adminArchiveGroupAsync({group, archive: !archived})}>{archived ? 'Un-Archive' : 'Archive'} Group</WideButton>
                    </View>
                </View>
            :null}        

            </View>
        </ScreenContentScroll>
    )

}