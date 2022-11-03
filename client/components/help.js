import React from 'react';
import _ from 'lodash';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import { FixedTouchable, shadowStyle, WideButton } from './basics';
import { StyleSheet, Text, View } from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';

export function Help({id, title, children}){
    const collapsed = useDatabase([id], ['/userPrivate/', getCurrentUser(), 'helpCollapsed', id], false, true);

    function setCollapsed(isCollapsed) {
        setDataAsync(['userPrivate', getCurrentUser(), 'helpCollapsed', id], isCollapsed);
    }

    console.log('collapsed', collapsed);

    if (collapsed) {
        return (
            <FixedTouchable onPress={() => setCollapsed(false)}>
                <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, 
                        paddingHorizontal: 8, paddingVertical: 4,
                        borderRadius: 8, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name='information-circle-outline' size={15} style={{marginTop: 1, marginRight: 4}} />
                        {/* <Entypo name='help-with-circle' size={14} style={{color: '#666', marginRight: 4}} /> */}
                        <Text style={{fontSize: 13}}>{title}</Text>
                    </View>
                    <Entypo name='chevron-down' />
                </View>
            </FixedTouchable>
        )
    } else {
        return (
            <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                backgroundColor: 'white', ...shadowStyle}}>
                <Text style={{fontWeight: 'bold', marginBottom: 8}}>{title}</Text>
                {children}
                <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8}}>
                    <WideButton style={{margin: 0}} onPress={() => setCollapsed(true)}>Got It</WideButton>
                </View>
            </View>
        )
    }

}

export function HelpText({children}){
    return (
        <Text style={{color: '#444', marginBottom: 8}}>{children}</Text>
    )
}
