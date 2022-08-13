import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Entypo, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ScreenContentScroll, WideButton } from '../components/basics';
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { addSubgroupsAsync } from '../data/servercall';


export function AddSubgroupScreen({route, navigation}) {
    const {group} = route.params;
    const [name, setName] = useState(null);
    const [groupLinks, setGroupLinks] = useState('');
    const [newGroupNames, setNewGroupNames] = useState('');

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'name'], setName);
        return () => internalReleaseWatchers(x);
    }, [group]);

    async function addSubgroups() {
        await addSubgroupsAsync({group, groupLinks, newGroupNames});
        navigation.goBack();
    }    


    return (
        <KeyboardSafeView>
            <ScreenContentScroll>            
                <View style={{margin: 16}}>
                    <Text>Add new subgroups to <Text style={{fontWeight: 'bold'}}>{name}</Text>.</Text>
                    <Text style={styles.head}>Links to Existing Groups:</Text>
                    <TextInput multiline value={groupLinks} onChangeText={setGroupLinks} style={styles.textArea} />
                    <Text style={styles.head}>Names of New Groups to Create:</Text>
                    <TextInput multiline value={newGroupNames} onChangeText={setNewGroupNames} style={styles.textArea} />
                </View>                
                <WideButton progressText='Adding...' onPress={addSubgroups} style={{alignSelf: 'flex-start', marginTop: 16}}>Add Subgroups</WideButton>
            </ScreenContentScroll>
        </KeyboardSafeView>
    )
}

const styles = StyleSheet.create({
    head: {marginTop: 24, marginBottom: 8},
    textArea: {height: 150, padding: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8}
})