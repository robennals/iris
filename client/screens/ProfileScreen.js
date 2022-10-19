import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, parseQuestions, ScreenContentScroll, textToKey, WideButton } from '../components/basics';
import { firebaseSignOut, getCurrentUser, internalReleaseWatchers, setDataAsync, useDatabase, watchData } from '../data/fbutil';
import { Picker, StyleSheet, View, Text } from 'react-native';
import { reportMemberAsync, setMemberRoleAsync, updateProfileAsync } from '../data/servercall';
import _ from 'lodash';
import { ModeToggle } from '../components/modetoggle';
import { MemberPhotoIcon, MemberProfilePhotoPlaceholder, MemberProfilePhotoPreview, PhotoPreview, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';
import { Loading } from '../components/loading';
import { Catcher } from '../components/catcher';

export function ProfileScreen({navigation, route}) {
    const {community, member} = route.params;

    const photoKey = useDatabase([community, member], ['commMember', community, member, 'photoKey']);
    const answers = useDatabase([community, member], ['commMember', community, member, 'answer']);
    const communityInfo = useDatabase([community], ['community', community]);
    const followAvoid = useDatabase([member], ['perUser', ])
    const name = answers?.['Full Name'];

    if (!photoKey || !answers) return <Loading />

    return (
        <ScreenContentScroll>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <MemberPhotoIcon photoKey={photoKey} user={member} thumb={false} size={200} />
            </View>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <Text style={{fontSize: 32, fontWeight: 'bold'}}>{name}</Text>
            </View>
            {/* <Text style={{marginTop: 16, textAlign: 'center', fontSize: 20, fontWeight: 'bold'}}>Bio Answers</Text> */}
            <Catcher>
                <BioAnswers communityInfo={communityInfo} answers={answers} />
            </Catcher>
            <WideButton alwaysActive onPress={() => navigation.replace('reportAbuse', {community, member})} 
                        style={{alignSelf: 'center'}}>
                    Report Abuse
            </WideButton>

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