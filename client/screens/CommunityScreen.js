import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { FixedTouchable, OneLineText, ScreenContentScroll, WideButton } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, watchData } from '../data/fbutil';
import { IntakeScreen } from './IntakeScreen';

export function CommunityScreenHeader({navigation, route, children}) {
    const {community} = route.params;
    const [name, setName] = useState('');
    const [photoKey, setPhotoKey] = useState(null);
    const [photoUser, setPhotoUser] = useState(null);

    useEffect(() => {
        var x = {}
        watchData(x, ['community', community, 'name'], setName, '');
        watchData(x, ['community', community, 'photoKey'], setPhotoKey);
        watchData(x, ['community', community, 'photoUser'], setPhotoUser);

        return () => internalReleaseWatchers(x);
    }, [community])

    return (
        <FixedTouchable onPress={() => navigation.navigate(isMasterUser() ? 'editCommunity' : 'communityProfile', {community})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <CommunityPhotoIcon photoKey={photoKey} photoUser={photoUser} name={name} size={28} style={{opacity: (name && photoKey) ? 1 : 0}}/>
                <View style={{marginLeft: 8}}>
                    <Text style>{name}</Text>
                </View>
            </View>
        </FixedTouchable>
    )
}


export function CommunityScreen({navigation, route}) {
    const {community} = route.params;
    const [role, setRole] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'community', community, 'role'], setRole, false)
    }, [community])

    console.log('communityScreen', community)

    if (role == null) {
        return null;
    }

    if (role == false && !isMasterUser()) {
        return (
            <IntakeScreen community={community} />
        )
    }

    return (
        <ScreenContentScroll>
            <View style={{margin: 16}}>
            <Text>Not much here yet.</Text>
            <Text>
                Send the URL of this page to a non-member so they can fill out the intake questionairre.
            </Text>
            <Text>
                Click the header to edit the community.
            </Text>
            <Text>
                Soon this screen will allow community members to express interest in new topics.
            </Text>
            <WideButton style={{alignSelf: 'flex-start'}} onPress={() => navigation.navigate('communitySignups', {community})}>See Signups</WideButton>
            </View>
        </ScreenContentScroll>
    )
}

