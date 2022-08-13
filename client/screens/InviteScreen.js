
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Entypo, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ScreenContentScroll } from '../components/basics';


export class InviteScreen extends React.Component {
    async componentDidMount() {
        const {navigation} = this.props;
        const {group, name} = this.props.route.params;
        navigation.setOptions({title: name});
    }

    render() {
        const {name, group} = this.props.route.params;
        const url = 'https://talkwell.net/join/'+group;

        return (
            <ScreenContentScroll>
                <View style={{backgroundColor: 'white', padding: 10, marginVertical: 8,
                alignItems: 'center', alignSelf: 'center',
                }}>
                    <Text style={{marginBottom: 8}}>
                        Invite someone to <Text style={{fontWeight: 'bold'}}>{name}</Text> by sending this link
                    </Text>
                    <View style={{flexDirection: 'row', alignSelf: 'center', alignItems: 'center'}}>
                        <View style={{backgroundColor: 'white', borderColor: '#bbb', borderWidth: 1, padding:8, marginRight: 10}}>
                            <TextInput editable={false} value={url} style={{width: 250}} />
                        </View>
                        <TouchableOpacity onPress={() => Clipboard.setString(url)}>
                            <Feather name='copy' size={20} color='#222'/>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScreenContentScroll>
        )

        return <Text>Invite to {name}</Text>
    }
}
