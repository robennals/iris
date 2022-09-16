import React, { useState } from 'react'
import { Text } from 'react-native'
import { FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics'
import { isMasterUser } from '../data/fbutil'
import { adminCommandAsync } from '../data/servercall'
import _ from 'lodash';


const textBoxStyle = {
    backgroundColor: 'white',
    padding: 8,
    borderColor: '#ddd',
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
    flex: 1,
    marginHorizontal: 16
  }

export function AdminCommandScreen() {
    const [command, setCommand] = useState('');
    const [params, setParams] = useState('');

    if (!isMasterUser()) {
        return <Text>Access Denied</Text>
    }
    return (
        <ScreenContentScroll>
            <FormTitle title='Command'>
                <FormInput value={command} onChangeText={setCommand} />
            </FormTitle>
            <FormTitle title='Params (one per line)'>
                <FormInput multiline value={params} onChangeText={setParams} 
                    style={[textBoxStyle, {height: 200}]} />
            </FormTitle>
            <WideButton onPress={() => adminCommandAsync({command, params})} alwaysActive>
                Send Command
            </WideButton>
        </ScreenContentScroll>        
    )
}


