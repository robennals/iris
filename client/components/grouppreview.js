import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firstLine, FixedTouchable, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, searchMatches, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { CommunityPhotoIcon, GroupMultiIcon, GroupPhotoIcon, MemberPhotoIcon } from '../components/photo';

export function isGroupUnread(groupInfo) {
    return (_.get(groupInfo,'readTime', 0) < _.get(groupInfo, ['lastMessage', 'time'], 0))
        && _.get(groupInfo, ['lastMessage', 'from']) != getCurrentUser();
}


export function GroupPreview ({group, name, groupInfo, highlight, shrink}) {
    const [members, setMembers] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers);
        return () => internalReleaseWatchers(x);
    }, [group])

    const unread = isGroupUnread(groupInfo);

    var summaryLine = '';
    if (groupInfo.lastMessage) {
        summaryLine = _.get(groupInfo,['lastMessage','fromName'],'') + ': ' + 
            firstLine(_.get(groupInfo,['lastMessage','text'],''))
    }
    return (
        <View style={[styles.groupPreview, 
                highlight ? {backgroundColor: '#eee'} : null]}>
            <GroupMultiIcon members={members || {}} name={name} size={60} photo={groupInfo.photo} />

            {/* <GroupIcon name={name} size={shrink ? 40 : 50} /> */}
                <View style={styles.groupPreviewRight}>
                    <OneLineText style={{fontSize: 16, fontWeight: unread ? 'bold' : null}}>
                        {name}
                    </OneLineText>
                    <OneLineText numberOfLines={1} style={{
                            color: '#666', marginTop: 4,
                            fontWeight: unread ? 'bold' : null}}>
                        {summaryLine}
                    </OneLineText>
                </View>
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupPreview: {
        maxWidth: 500, marginHorizontal: 8, padding: 8, marginVertical: 4, backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        height: 66
        // borderColor: '#ddd', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    },
    shrinkGroupPreview: {
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
        height: 66,
        justifyContent: 'space-around',
        // borderRadius: 8
    },

    groupPreviewTitle: {
        fontSize: 16, color: 'black'
    },
    groupPreviewRight: {
        flex: 1,
        marginLeft: 12
    },
    p: {
        marginVertical: 8,
        maxWidth: 500,
        color: '#222'
    }
  });
  