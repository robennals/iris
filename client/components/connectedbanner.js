import React, { useContext, useEffect, useState } from 'react';
import _ from 'lodash';
import { Entypo } from '@expo/vector-icons';
import { SafeAreaView, Text, View } from 'react-native';
import { NetworkContext } from './context';

export function ConnectedBanner() {
    const {connected, waited} = useContext(NetworkContext);
    if (!connected && waited) {
        return (
            <SafeAreaView>
                <View style={{backgroundColor: 'red', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8}}>
                    <Entypo name='warning' color='white' size={15} style={{marginTop: 1}} />
                    <Text style={{color: 'white', fontWeight: 'bold', marginLeft: 8}}>
                        Network Connection Lost
                    </Text>
                </View>
            </SafeAreaView>
        )
    } else {
        return null;
    }
}
