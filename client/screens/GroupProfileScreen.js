import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { Picker, View, StyleSheet, Text } from 'react-native';
import _ from 'lodash';
import { leaveGroupAsync, updateGroupProfileAsync } from '../data/servercall';
import { GroupProfilePhotoPlaceholder, GroupProfilePhotoPreview, MemberPhotoIcon, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';

function MemberPreview({members, userId}) {
    const member=members[userId];
    return (
        <View style={{flexDirection: 'row', height: 150}}>
            <MemberPhotoIcon photoKey={member.photo} name={member.name} user={userId} thumb={false} size={128} style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}} />
            <View style={{marginTop: 0, marginLeft: 16}}>
                <Text style={{fontSize: 18, fontWeight: '600', marginBottom: 4}}>{member.name}</Text>
                <Text>{member.bio}</Text>
            </View>
        </View>
    )
}

export function GroupProfileScreen({navigation, route}) {
    const {group} = route.params;
    const [members, setMembers] = useState(null);
    const [name, setName] = useState('');
    const [questions, setQuestions] = useState('');

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'name'], setName)
        watchData(x, ['group', group, 'member'], setMembers)
        watchData(x, ['group', group, 'questions'], setQuestions, '');

        return () => internalReleaseWatchers(x)
    }, [group]);

    if (!members) return null;

    console.log('groupProfile', questions);

    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 16}}>
            <Text style={{fontSize: 32, fontWeight: 'bold', marginTop: 16, marginBottom: 8}}>{name}</Text>

            <Text style={{lineHeight: 20}}>{questions}</Text>

            <Text style={{fontSize: 24, fontWeight: 'bold', marginTop: 32, marginBottom: 24}}>Participants</Text>

            {Object.keys(members || {}).map(m => 
                <MemberPreview key={m} members={members} userId={m} />
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
            </View>
        </ScreenContentScroll>
    )

}