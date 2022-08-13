import React, { useContext, useState } from 'react';
import { Text, View, StyleSheet, Platform} from 'react-native';
import { baseColor } from '../data/config';
import { FixedTouchable } from './basics';

function ToggleOption({name, selected, onSelect}) {
    const shadowStyle = {
        marginTop: -2,
        borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
        shadowRadius: 1, shadowOpacity: 0.5, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
    }

    return (
        <FixedTouchable onPress={onSelect}>
            <View style={{
                    ... (selected ? shadowStyle: {}),
                    backgroundColor: selected ? 'white' : null,
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16}}>
                <Text style={{fontWeight: selected ? 'bold' : null,
                        color: selected ? 'black' : '#666'}}>
                    {name}
                </Text>
            </View>
        </FixedTouchable>
    )

}

export function ModeToggle({options, value, onChangeSelection, style}) {
    return (
        <View style={{flexDirection: 'row', borderColor: '#ddd', 
            backgroundColor: '#eee',
            marginVertical: 4,
            borderWidth: StyleSheet.hairlineWidth, 
            alignSelf: 'flex-start',
            borderRadius: 16, ...style}}>
            {options.map(o => 
                <ToggleOption name={o.name} key={o.id}
                    selected={value==o.id} 
                    onSelect={() => onChangeSelection(o.id)} />
            )}
        </View>
    )
}