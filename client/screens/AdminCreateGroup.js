import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FormInput, FormTitle, WideButton } from '../components/basics';
import _ from 'lodash';
import { adminCreateGroupAsync } from '../data/servercall';
import { internalReleaseWatchers, watchData } from '../data/fbutil';
import { CommunityPhotoIcon } from '../components/photo';

export function AdminCreateGroupScreen({navigation, route}) {
    const {community} = route.params;
    const [tsv, setTsv] = useState('');
    const [name, setName] = useState('');
    const [questions, setQuestions] = useState('');
    const [confirm, setConfirm] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const [communityInfo, setCommunityInfo] = useState(null);
    const [intake, setIntake] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setCommunityInfo);
        watchData(x, ['intake', community], setIntake);
        return () => internalReleaseWatchers();
    }, [community])

    if (!community || !communityInfo) return null;

    const textBoxStyle = {
        backgroundColor: 'white',
        padding: 8,
        borderColor: '#ddd',
        borderRadius: 8,
        borderWidth: 1,
        margin: 4,
        // flex: 1,
        marginHorizontal: 16,
        marginTop: 8
    }

    const people = parseTsv(tsv || '');
    console.log('people', people);

    async function onCreateGroupClicked() {
        setInProgress(true);
        await adminCreateGroupAsync({name, questions, people});
        setConfirm('Created group "' + name + '" with ' + people.length + ' members' + '\n' + confirm)
        setName('');
        setQuestions('');
        setTsv('');
        setInProgress(false);
    }
    
    return (
        <View>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{communityInfo.name}</Text>
            </View>

            <FormTitle title='Group Name'>
                <TextInput value={name} onChangeText={setName} style={textBoxStyle} />
            </FormTitle>
            <FormTitle title='Discussion Questions'>
                <TextInput multiline value={questions} onChangeText={setQuestions} style={[textBoxStyle, {height: 100}]} />
            </FormTitle>
            <FormTitle title='Members (TSV)'>
                <TextInput multiline placeholder='Copy/paste a table of members from Google Sheets, with Name, Email, Bio columns'  
                    onChangeText={setTsv}
                    value={tsv}
                    style={[textBoxStyle, {height: 200}]} />
                {/* <FormInput multiline placeholder='Paste a table from Google Sheets, with Name, Email, Bio columns' style={{height: 100}} /> */}
            </FormTitle>

            <FormTitle title='Parsed Members'>
                {people.map(person =>
                    <MemberPreview person={person} key={person.email} />
                )}
            </FormTitle>

            <WideButton alwaysActive onPress={onCreateGroupClicked} style={{alignSelf: 'flex-start'}} disabled={people.length == 0 || !name || inProgress}>Create Group</WideButton>
            {confirm ? 
                <Text style={{marginHorizontal: 16, marginVertical: 8, borderColor: '#666', color: '#666'}}>{confirm}</Text>
            :null}

        </View>
    )
}

function parseTsv(tsv) {
    const lines = _.filter(tsv.trim().split('\n'));
    const people = _.map(lines, line => {
        const [name, email, bio] = line.split('\t');
        return {name: name.trim(), email: email.trim(), bio: bio.trim()}
    })
    return people;
}

function MemberPreview({person}) {
    const {name, email, bio} = person;
    return (
        <View style={{marginHorizontal:16, marginVertical: 8}}>
            <Text style={{fontSize: 16}}><Text style={{fontWeight:'bold'}}>{name}</Text> <Text>({email})</Text></Text>
            <Text style={{fontSize: 14, color: '#666'}}>{bio}</Text>
        </View>
    )
    return <Text>Hello {name}</Text>
}
