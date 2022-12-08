import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { baseColor } from '../data/config';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import { FixedTouchable } from './basics';

export function FollowAvoid({user, style}) {
    const followAvoid = useDatabase([user], ['perUser', 'followAvoid', getCurrentUser(), user], '');

    function setUserRelationship(type) {
        var newState;
        if (followAvoid == type) {
            newState = '';
        } else {
            newState = type;
        }
        setDataAsync(['perUser', 'followAvoid', getCurrentUser(), user], newState);
    }

    return (
        <View style={{flexDirection: 'row', alignItems: 'center', ...style}}>
            <FixedTouchable onPress={() => setUserRelationship('follow')}>
                {followAvoid == 'follow' ? 
                    <View style={[styles.button, styles.following]}>
                        <Text style={styles.activeText}>Following</Text>
                    </View>
                : 
                    <View style={[styles.button, styles.follow]}>
                        <Text style={styles.followText}>Follow</Text>
                    </View>
                }
            </FixedTouchable>
            {/* <View style={{margin: 8}} />
            <FixedTouchable onPress={() => setUserRelationship('avoid')}>
                {followAvoid == 'avoid' ? 
                    <View style={[styles.button, styles.avoiding]}>
                        <Text style={styles.activeText}>Avoiding</Text>
                    </View>
                : 
                    <View style={[styles.button, styles.avoid]}>
                        <Text style={styles.avoidText}>Avoid</Text>
                    </View>
                }

            </FixedTouchable>             */}
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