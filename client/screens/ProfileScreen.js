import React, { useEffect, useState } from 'react'
import { firstName, FixedTouchable, FormInput, FormTitle, parseQuestions, ScreenContentScroll, textToKey, WideButton } from '../components/basics';
import { firebaseSignOut, getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, useDatabase, watchData } from '../data/fbutil';
import { Picker, StyleSheet, View, Text } from 'react-native';
import { createDirectChatAsync, renameUserAsync, reportMemberAsync, setMemberRoleAsync, updateProfileAsync } from '../data/servercall';
import _ from 'lodash';
import { ModeToggle } from '../components/modetoggle';
import { MemberPhotoIcon, MemberProfilePhotoPlaceholder, MemberProfilePhotoPreview, PhotoPreview, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';
import { Loading } from '../components/loading';
import { Catcher } from '../components/catcher';
import { FollowAvoid } from '../components/followavoid';
import { Entypo, Ionicons } from '@expo/vector-icons';

function RenameWidget({name, user}) {
    const [newName, setNewName] = useState('');
    const [inProgress, setInProgress] = useState(false);

    async function onRename() {
        setInProgress(true);
        await renameUserAsync({name: newName || name, user});
        setInProgress(false);
    }

    return (
        <View style={{maxWidth: 450, alignSelf: 'center'}}>
            <FormTitle title='Rename User'>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <FormInput value={newName || name} onChangeText={setNewName} />
                    <WideButton onPress={onRename} 
                        style={{margin: 0}} 
                        alwaysActive progressText='Renaming...' disabled={inProgress}>
                            Change Name
                    </WideButton>
                </View>
            </FormTitle>
        </View>
    )

}


export function ProfileScreen({navigation, route}) {
    const {community, member} = route.params;

    const photoKey = useDatabase([community, member], ['commMember', community, member, 'photoKey']);
    const answers = useDatabase([community, member], ['commMember', community, member, 'answer']);
    const communityInfo = useDatabase([community], ['community', community]);
    const name = answers?.['Full Name'];

    if (!photoKey || !answers) return <Loading />
    const first = firstName(name || '');

    async function onMessage() {
        const {group} = await createDirectChatAsync({community, user: member});
        navigation.navigate('group', {group});
    }

    return (
        <ScreenContentScroll>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <MemberPhotoIcon photoKey={photoKey} user={member} thumb={false} size={200} />
            </View>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <Text style={{fontSize: 32, fontWeight: 'bold'}}>{name}</Text>
            </View>
            {member != getCurrentUser() ?
                <View>
                    <FollowAvoid user={member} style={{justifyContent: 'center', marginVertical: 8}} />
                    <Text style={{color: '#666', fontSize: 12, alignSelf: 'center'}}>
                        Follow {first} to get matched with them more often.
                    </Text>
                </View>
            :null}
            {member != getCurrentUser() ?
                <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                    <WideButton style={{paddingHorizontal: 0}} onPress={onMessage}><Entypo size={16} name='chat' style={{marginRight: 4}}/> Message</WideButton>
                </View>
            : null}
            {/* <Text style={{marginTop: 16, textAlign: 'center', fontSize: 20, fontWeight: 'bold'}}>Bio Answers</Text> */}
            <Catcher>
                <BioAnswers communityInfo={communityInfo} answers={answers} />
            </Catcher>
            <WideButton alwaysActive onPress={() => navigation.replace('reportAbuse', {community, member})} 
                        style={{alignSelf: 'center'}}>
                    Report Abuse
            </WideButton>
            {isMasterUser() ? 
                <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth}}>
                    <RenameWidget name={name} user={member} />
                </View>
            : null}


        </ScreenContentScroll>
    )
}

function BioAnswers({communityInfo, answers}) {
    const questions = parseQuestions(communityInfo.questions);
    return (
        // <View style={{alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch', flexShrink: 1}}>
        <View style={{alignItems: 'center', marginTop: 32}}>
            {questions.map(q => 
                <View key={q.question} style={{marginVertical: 4, alignItems: 'center', marginHorizontal: 16}}>
                    <Text style={{color: '#666', fontSize: 12}}>
                        {q.question}
                    </Text>
                    <Text style={{fontSize: 16}}>
                        {answers[textToKey(q.question)]}
                    </Text>
                </View>
            )}
        </View>
    )
}