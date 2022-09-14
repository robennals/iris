import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ScreenContentScroll } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { watchData } from '../data/fbutil';

export function CommunityProfileScreen({route}) {
    const {community} = route.params;
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
        </ScreenContentScroll>
    )
}