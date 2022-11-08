import React from 'react';
import { Text, View } from 'react-native';

export function MissingScreen(){
    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontWeight: 'bold', fontSize: 18, marginBottom: 4}}>No such page</Text>
            <Text>Please check the URL you entered</Text>
        </View>
    )
}

