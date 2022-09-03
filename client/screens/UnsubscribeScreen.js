import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MinorButton, ScreenContentScroll, WideButton } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { leaveCommunityAsync } from '../data/servercall';

function CommunityToLeave({communities, communityKey}) {
    const [info, setInfo] = useState({});
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        var x = {};
        watchData(x, ['community', communityKey], setInfo);
        return () => internalReleaseWatchers(x);
    }, [])

    const communityInfo = communities[communityKey]
    return (
        <View>
            <View style={{flexDirection: 'row', marginVertical: 8, alignItems: 'center'}} communityInfo={communityInfo}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} size={60} />
                <View style={{marginLeft: 8}}>
                    <Text style={{fontSize: 16, fontWeight: 'bold'}}>{communityInfo.name}</Text>
                    <WideButton disabled={expanded} alwaysActive onPress={()=>setExpanded(true)} style={{margin: 0, marginTop: 4, alignSelf: 'flex-start'}}>Leave</WideButton>
                </View>
            </View>
            {expanded ? 
            <View style={{marginBottom: 32, alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8, padding: 8}}>
                <Text style={{fontWeight: 'bold'}}>Are you sure you want to leave <Text>{info.name}</Text></Text>
                <View style={{flexDirection: 'row', marginTop: 8}}>
                    <WideButton onPress={() => leaveCommunityAsync({community:communityKey})} style={{margin:0, alignSelf: 'flex-start'}} progressText='Leaving...'>Yes, Leave</WideButton> 
                    <MinorButton onPress={() => setExpanded(false)}>No, Cancel</MinorButton>
                </View>
            </View>
            : null}
        </View>        
    )
}

export function UnsubscribeScreen(){ 
    const [communities, setCommunties] = useState();
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'community'], setCommunties);
        return () => internalReleaseWatchers();
    }, [])
    if (!setCommunties) return null;

    const filteredCommunityKeys = _.filter(_.keys(communities), k => communities[k].name);
    const sortedCommunityKeys = _.sortBy(filteredCommunityKeys, k => communities[k].name);

    console.log('unsubscriber', communities, sortedCommunityKeys);

    return (
        <ScreenContentScroll>

            <Text style={{fontSize: 24, marginVertical: 16}}>Your Communities</Text>
            {sortedCommunityKeys.map(k => 
                <CommunityToLeave communities={communities} communityKey={k} key={k} />
            )}
            <Text style={{marginTop: 16, color: '#666'}}>
                If you leave a community all your data from that community will be deleted
                and you will no longer be invited to conversations with community members.
            </Text>
        </ScreenContentScroll>
    )

}


