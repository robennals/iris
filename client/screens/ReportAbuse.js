
import React, { useEffect, useState } from 'react'
import { FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { Picker, Text, View } from 'react-native';
import { reportAbuseAsync } from '../data/servercall';
import _ from 'lodash';
import { track } from '../components/shim';

export function ReportAbuseScreen({navigation, route}){
    const {group, community, member} = route.params;
    const [abuseType, setAbuseType] = useState('');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [members, setMembers] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers)
        return () => internalReleaseWatchers(x)
    }, [group, member]);

    useEffect(() => {
        const memberX = _.get(members, member);
        if (memberX) {
            navigation.setOptions({title: memberX.name + ' - Report Abuse'})
        }
    }, [members, member])

    async function submit() {
        track('Report Abuse', {group, member, abuseType});
        await reportAbuseAsync({group, community, member, abuseType, details});        
        navigation.goBack();
    }

    if (submitted) {
        return (
            <ScreenContentScroll>
                <View style={{margin: 16}}>
                    <Text>Thank you for your report. We will look at it within 24 hours and get back to you if we need any more information.</Text>            
                </View>
            </ScreenContentScroll>
        )
    }

    return (
        <ScreenContentScroll>
                {/* <FormTitle title='Type of Abuse'>
                    <Picker
                        selectedValue={abuseType}
                        style={{ margin: 4, paddingHorizontal: 8, height: 35, width: 150, borderColor: '#ddd', borderRadius: 8 }}
                        onValueChange={(itemValue, itemIndex) => setAbuseType(itemValue)}
                    >
                        <Picker.Item label="Impersonation" value="impersonation" />
                        <Picker.Item label="Illegal Activity" value="illegal" />
                        <Picker.Item label="Harassment" value="harassment" />
                        <Picker.Item label="Obscenity" value="obscene" />
                        <Picker.Item label="Other" value="obscene" />
                    </Picker>
                </FormTitle> */}
                <FormTitle title='Details'>
                    <FormInput placeholder='Tell us what was bad' 
                        value={details} onChangeText={setDetails}
                    />
                </FormTitle>
                <WideButton onPress={() => submit()} progressText='Submitting...'
                        style={{alignSelf: 'center'}}>
                    Submit
                </WideButton>
        </ScreenContentScroll>
    )

}