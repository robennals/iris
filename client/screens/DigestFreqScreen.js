import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ScreenContentScroll, ToggleCheck } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';

export function DigestFreqScreen() {
    const [storedFreq, setStoredFreq] = useState(null);
    const [localFreq, setLocalFreq] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'digestFreq'], setStoredFreq, 'daily');
        return () => internalReleaseWatchers(x);
    })
    if (!storedFreq) return null;
    const freq = localFreq || storedFreq;
    function setValue(checked, newFreq) {
        if (checked) {
            setLocalFreq(newFreq);
            setDataAsync(['userPrivate', getCurrentUser(), 'digestFreq'], newFreq);
        }
    }
    return (
        <ScreenContentScroll>
            <View style={{padding: 16}}>
                <Text style={{marginBottom: 8, fontSize: 16}}>Set Max Digest Frequency</Text>
                <ToggleCheck style={{marginVertical: 4}} label='Daily' value={freq == 'daily'} onValueChange={checked => setValue(checked, 'daily')} />
                <ToggleCheck style={{marginVertical: 4}} label='Weekly' value={freq == 'weekly'} onValueChange={checked => setValue(checked, 'weekly')} />
                <ToggleCheck style={{marginVertical: 4}} label='Monthly' value={freq == 'monthly'} onValueChange={checked => setValue(checked, 'monthly')} />
                <ToggleCheck style={{marginVertical: 4}} label='Never' value={freq == 'never'} onValueChange={checked => setValue(checked, 'never')} />
            </View>
        </ScreenContentScroll>
    )
}