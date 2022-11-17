import React from 'react';
import { Text, View } from 'react-native';
import { formatDate } from '../../functions/api/basics';
import { OneLineText, ScreenContentScroll } from '../components/basics';
import { Loading } from '../components/loading';
import { MemberPhotoIcon } from '../components/photo';
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
    const {community, topic, user} = route.params;

    const viewpoint = useDatabase([community,topic,user], ['viewpoint', community, topic, user]);
    const topicName = useDatabase([community, topic], ['topic', community, topic, 'name']);

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
                    <MemberPhotoIcon photoKey={viewpoint.authorPhoto} name={viewpoint.authorName} user={viewpoint.from} />
                    <View style={{marginLeft: 4}}>
                        <Text style={{fontWeight: 'bold'}}>{viewpoint.authorName}</Text>                   
                        <Text style={{fontSize: 13, color: '#666'}}>{formatDate(viewpoint.time)}</Text>
                    </View> 
                </View>
                <Text>{viewpoint.text}</Text>
            </View>
        </ScreenContentScroll>
    )
}
