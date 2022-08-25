import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { FixedTouchable, ScreenContentNoScroll, ScreenContentScroll, WideButton } from '../components/basics';
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';
import { GroupPreview } from '../components/grouppreview';

export function CommunityGroupsScreen({navigation, route}) {
    const {community} = route.params;
    const [groupSet, setGroupSet] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['adminCommunity', community, 'group'], setGroupSet);
        return () => internalReleaseWatchers();
    }, [community])

    if (!groupSet) return null;

    const groupKeys = Object.keys(groupSet);
    const sortedGroupKeys = _.sortBy(groupKeys, k => _.get(groupSet, [k, 'lastMessage', 'time'], 0)).reverse();

    return (
        <ScreenContentScroll>
            <WideButton alwaysActive style={{alignSelf: 'flex-start'}} onPress={()=>navigation.navigate('adminCreateGroup', {community})}>New Group</WideButton>
            <ScrollView>
                {sortedGroupKeys.map(k => 
                    <FixedTouchable key={k} onPress={() => navigation.navigate('group', {group: k})}>
                        <GroupPreview key={k} group={k} groupInfo={groupSet[k]} />
                    </FixedTouchable>
                )}
            </ScrollView>
        </ScreenContentScroll>
    )
}