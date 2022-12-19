import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { baseColor } from '../data/config';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import { FixedTouchable } from './basics';

export function FollowButton({user, style, mini=false, firstName=''}) {
    const followAvoid = useDatabase([user], ['perUser', 'followAvoid', getCurrentUser(), user], '');

    function setUserRelationship(type) {
        var newState;
        if (followAvoid == type) {
            newState = null;
        } else {
            newState = type;
        }
        setDataAsync(['perUser', 'followAvoid', getCurrentUser(), user], newState);
    }

    return (
        <View style={{flexDirection: 'row', alignItems: 'center', ...style}}>
            <FixedTouchable onPress={() => setUserRelationship('follow')}>
                {followAvoid == 'follow' ? 
                    <View style={[mini ? styles.miniButton : styles.button, styles.following]}>
                        <Text style={[mini ? styles.miniText : null, styles.activeText]}>Following{firstName}</Text>
                    </View>
                : 
                    <View style={[mini ? styles.miniButton : styles.button, styles.follow]}>
                        <Text style={[mini ? styles.miniText : null, styles.followText]}>Follow{firstName}</Text>
                    </View>
                }
            </FixedTouchable>
        </View>
    )
}


const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth
    },
    miniButton: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth
    },
    miniText: {
        fontSize: 14
    },
    activeText: {
        color: 'white',
    },
    follow: {
        borderColor: baseColor,        
    },
    followText: {
        color: baseColor
    },
    following: {
        borderColor: baseColor,
        backgroundColor: baseColor        
    },
    avoid: {
        borderColor: '#999'
    },
    avoidText: {
        color: '#999',
    },
    avoiding: {
        borderColor: 'red',
        backgroundColor: 'red'
    }
})