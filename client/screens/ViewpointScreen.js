import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, OneLineText, ScreenContentScroll, ViewpointActions } from '../components/basics';
import { LinkText } from '../components/linktext';
import { Loading } from '../components/loading';
import { MemberPhotoIcon } from '../components/photo';
import { useCustomNavigation } from '../components/shim';
import { formatMessageTime, formatShortDate } from '../components/time';
import { getCurrentUser, useDatabase } from '../data/fbutil';
import { EditViewpointScreen } from './EditViewpointScreen';

export function ViewpointScreenHeader({route}) {
    const {community, topic, user} = route.params;
    
    const viewpoint = useDatabase([community,topic,user], ['viewpoint', community, topic, user]);
    const topicName = useDatabase([community, topic], ['topic', community, topic, 'name']);

    return (
        <View>
            <OneLineText style={{fontWeight: 'bold', fontSize: 16}}>
                {topicName}
            </OneLineText>
            <Text style={{fontSize: 12}}>Viewpoint by {viewpoint?.authorName}</Text>     
        </View>
    )

}

export function ViewpointScreen({route}) {
    const {community, topic, user, group} = route.params;
    const navigation = useCustomNavigation();

    const viewpoint = useDatabase([community,topic,user], ['viewpoint', community, topic, user]);

    if (user == getCurrentUser()) {
        return <EditViewpointScreen route={route} />
    }

    if (!viewpoint) {
        return <Loading />
    }

    return (
        <ScreenContentScroll>
            <View style={{maxWidth: 450, alignSelf: 'center', marginTop: 8}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                    <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: viewpoint.from})}>
                        <MemberPhotoIcon photoKey={viewpoint.authorPhoto} name={viewpoint.authorName} user={viewpoint.from} />
                    </FixedTouchable>
                    <View style={{marginLeft: 4}}>
                        <Text style={{fontWeight: 'bold'}}>{viewpoint.authorName}</Text>                   
                        <Text style={{fontSize: 13, color: '#666'}}>{formatMessageTime(viewpoint.time)}</Text>
                    </View> 
                </View>
                <LinkText text={viewpoint.text} />
                <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingVertical: 8}}>
                    <ViewpointActions group={group} community={community} topic={topic} viewpoint={viewpoint} messageKey={viewpoint.key} />
                </View>
            </View>
        </ScreenContentScroll>
    )
}
