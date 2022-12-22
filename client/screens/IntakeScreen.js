import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, ScrollView } from 'react-native';
import { basicQuestions, email_label, FixedTouchable, FormInput, FormTitle, Link, makePhotoDataUrl, name_label, parseQuestions, parseTopics, ScreenContentScroll, textToKey, validateEmail, validateName, WideButton } from '../components/basics';
import { LinkText } from '../components/linktext';
import { CommunityPhotoIcon, getUrlForImage, PhotoPicker } from '../components/photo';
import { PopupSelector } from '../components/shimui';
import { baseColor, highlightColor } from '../data/config';
import { getCurrentUser, internalReleaseWatchers, newKey, useDatabase, watchData } from '../data/fbutil';
import { confirmSignupAsync, logIntakeAsync, requestLoginCode, signinWithLoginCode, submitCommunityFormAsync } from '../data/servercall';
import _ from 'lodash';
import { removeFocusListener, useCustomNavigation } from '../components/shim';


function ValidationWarning({children}) {
    return <Text style={{marginBottom: 8, marginHorizontal: 16, color: 'red'}}>{children}</Text>
}

function ValidateAnswer({answerType, answer}) {
    if (answerType == 'email' && answer && !validateEmail(answer)) {
        return <ValidationWarning>Invalid email address</ValidationWarning>
    } else if (answerType == 'name' && answer && !validateName(answer)) {
        return <ValidationWarning>Please enter the real name you are generally known by. It will only be shown to community admins and other members of your small discussion group.</ValidationWarning>
    }
    return null;
}

function keysToSet(keys) {
    return _.fromPairs(_.map(keys, k => [k,true]));
}

function QuestionAnswer({question, answer, onChangeAnswer, onChangeValid}) {
    const [focus, setFocus] = useState(false);
    const atype = question.answerType;
    
    function onChangeText(text){
        onChangeAnswer(text);
        var valid = true;
        if (atype == 'email') {
            valid = validateEmail(text);
        } else if (atype == 'name') {
            valid = validateName(text);
        }
        onChangeValid(valid);
    }

    if (question.answerType == 'options') {
        const items = question.options.map(option => ({label: option, id: option}));
        const itemSet = keysToSet(items.map(item => item.id));
        var shownAnswer = answer;
        var isOther = false;
        if (answer && !itemSet[answer] && answer != 'choose') {
            shownAnswer = 'other';
            isOther = true;
            // console.log('other', {answer, itemSet, items});
        }
        const value = shownAnswer || 'choose'
        // return <PopupSelector value={answer} items={[{id: 'hello', label: 'Hello'}]} />
        return (
            <View>
                <PopupSelector width={200} value={value}
                    onSelect={onChangeAnswer} color={value == 'choose' ? '#666' : 'black'}
                    items={[{id:'choose', label: 'Choose an option'},...items, {id:'other', label: 'Other (please specify)'}]} />
                {isOther ? 
                    <FormInput value={answer == 'other' ? '' : answer} onChangeText={onChangeAnswer} 
                        placeholder='Please specify'
                    />
                : null}
            </View>
        )
    } else {
        return (
            <View>
                <FormInput
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    autocomplete={atype == 'text' ? null : atype}
                    keyboardType={atype == 'email' ? 'email-address' : null}
                    textContentType={atype == 'email' ? 'emailAddress' : (atype == 'name' ? 'name' : null)}
                    value={answer || ''}
                    placeholder={atype == 'email' ? 'Enter your email address' : (atype == 'name' ? 'Enter your full name' : null)}
                    onChangeText={onChangeText} />
                {focus ? null :
                    <ValidateAnswer answerType={atype} answer={answer} />
                }                
            </View>
        )
    }
}

function Question({question, answer, onChangeAnswer, onChangeValid}) {
    return (
        <View>
            <FormTitle title={question.question}>
                <QuestionAnswer question={question} answer={answer} onChangeAnswer={onChangeAnswer} onChangeValid={onChangeValid}/>
            </FormTitle>
        </View>
    )
}


const shadowStyle = {
    shadowRadius: 4, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5, elevation: 3}

function Topic({topic, selected, onChangeSelected}) {
    const parsedQuestions = JSON.parse(topic.questions);
    const shownQuestions = parsedQuestions.filter(q => q[0] != '>');
    return (
        <View style={{marginHorizontal: 16, marginVertical: 4}}>
            <FixedTouchable onPress={() => onChangeSelected(!selected)}>
                <View style={{flexDirection: 'row', backgroundColor: 'white', alignItems: 'center', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, padding: 8, borderRadius: 8,
                    ... selected ? shadowStyle : {}
                    }}>
                    <View style={{width: 40, height: 40,
                            alignItems: 'center', justifyContent: 'center',
                            backgroundColor: selected ? baseColor : 'white',
                            borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 20,
                            }}>
                        {selected ?
                            <Entypo name='check' size={30} style={{marginTop: 4, color: 'white'}} />
                        : null}
                    </View>
                    <View style={{marginLeft: 12, flexShrink: 1}}>
                        <Text style={{fontWeight: 'bold', marginBottom: 4}}>{topic.name}</Text>                       
                        {topic.summary ? <LinkText style={{color: '#666', marginBottom: 4}} text={topic.summary} /> : null}
                        {shownQuestions.map(question =>
                            <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                                <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                                <Text key={question} style={{color: '#666', marginBottom: 2}}>{question}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </FixedTouchable>
        </View>
    )

}

function ConfirmEmailScreen({community, intake, email, onBack}) {
    const [inProgress, setInProgress] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState(null);
    const navigation = useCustomNavigation();
    async function onConfirm() {
        setInProgress(true);
        // console.log('onConfirm', getCurrentUser());
        const result = await signinWithLoginCode({email: email.toLowerCase().trim(), code, onError: error => setError(error)}); 
        // console.log('signin result', result);
        if (result.success) {
            // console.log('confirm', community, intake);
            await confirmSignupAsync({community, intake, noHtml: true});
            // console.log('confirmed');
            navigation.reset({index: 1, routes: [{name: 'home'}, {name: 'community', params: {community}}]});        
        } else {
            setInProgress(false);
            setError(result.message);
        }
    }

    return (
        <ScreenContentScroll>
            <View style={styles.hbox}>
                <View style={[styles.contentCard,{marginTop: 32, marginHorizontal: 8, opacity: inProgress ? 0.5 : null}]}>
                    {error ? 
                        <ValidationWarning>{error}</ValidationWarning>
                    : null}
                    <View style={{paddingVertical: 10, borderBottomColor: '#ddd', borderBottomWidth: 1}}>
                        <Text style={{fontWeight: '500', fontSize: 16, textAlign: 'center'}}>Enter your 6-digit security code</Text>
                    </View>
                    <View style={{paddingVertical: 10, paddingHorizontal: 16}}>
                        <Text style={{color: '#666', textAlign: 'center'}}>
                            We just sent a 6-digit security code to {email}. Please enter it below to confirm that you
                            are the owner of this email address.
                        </Text>
                    </View>
                    <View style={styles.horizBox}>
                        <FormInput part='code' 
                            placeholder='- - - - - -' style={styles.codeBox}
                            keyboardType='number-pad'
                            value={code}
                            textAlign = 'center'
                            onChangeText={setCode}/>
                    </View>
                    <WideButton part='submit' progressText='Signing In...' 
                    onPress={onConfirm} disabled={inProgress}>
                        Confirm Sign Up
                    </WideButton>
                </View>
            </View>
            <FixedTouchable part='goback' onPress={onBack}>
                <View style={styles.hbox}>
                    <View style={{backgroundColor:'white', padding: 16, marginTop: 32, flex: 1, maxWidth: 400}}>
                        <Text>{"Didn't"} get an email or entered the wrong email?
                            <Text style={{fontWeight:'bold', color: baseColor}}> Go back</Text>
                        </Text>
                    </View>
                </View>
            </FixedTouchable>
        </ScreenContentScroll>
    )
}


function ConfirmScreen({community, email}) {
    const [info, setInfo] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setInfo);
    }, [community])

    if (!info) return null;

    return (
        <ScreenContentScroll>
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{info.name}</Text>
            </View>
            <View style={{margin: 16}}>
                {getCurrentUser() ? 
                    <View>
                        <Text style={{fontWeight: 'bold', fontSize: 24, marginBottom: 8}}>Look out for an Email Soon</Text>
                        <Text style={{color: '#666'}}>
                            We will send you an email once we have added you to a discussion group.
                        </Text>
                    </View> 
                :
                    <View>
                        <Text style={{fontWeight: 'bold', fontSize: 24, marginBottom: 8}}>Check your Email to Confirm</Text>
                        <Text style={{color: '#666'}}>We just sent a confirmation email to <Text style={{fontWeight: 'bold'}}>{email}</Text>. Click the link in that message to confirm your sign up.
                        </Text>
                    </View>
                }
            </View>

        </ScreenContentScroll>
    )
}

function LoggedOutHeader() {
    if (getCurrentUser()) return null;
    return (
        <View style={{borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 12}}>
            <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                <Image source={{uri: 'https://iris-talk.com/logo.png'}} style={{height: 32, width: 32}}/>
                <Text style={{fontSize: 20, marginLeft: 4, marginTop: 2}}>Iris</Text>
            </View>
        </View>
    )
}

function LoggedOutFooter() {
    if (getCurrentUser()) return null;
    return (
        <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center'}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{color: '#666'}}>
                    <Link style={{color: '#666'}} url='https://iris-talk.com/privacy.html'>Privacy</Link>   <Link style={{color: '#666'}} url='https://iris-talk.com/license.html'>License</Link>
                </Text>
            </View>
        </View>
    )
}


function IrisIntro({communityName}) {
    return (
        <View style={{margin: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 16}}>
            {getCurrentUser() ? 
                <Text style={{color: '#666', marginVertical: 4}}>
                    Fill out the form below to join this community and 
                    get matched into small group conversations with other members.
                </Text>        
            :
            <View>
                <Text style={{fontWeight: 'bold'}}>{communityName} is on Iris</Text>

                    <Text style={{color: '#666', marginVertical: 4}}>
                        Fill out the form below to get matched into private small-group conversations with 
                        other {communityName} members about topics of mutual interest.
                    </Text>
            </View>
            }
        </View>
    )
}

function IrisHelp() {
    return (
        <View style={{margin: 16, paddingHorizontal: 16, paddingVertical: 10, marginVertical: 32, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 16}}>
            <Text style={{fontWeight: 'bold'}}>Need Help?</Text>
            <Text style={{color: '#666', marginVertical: 4}}>
                Please email us at <Link url='mailto:contact@iris-talk.com'>contact@iris-talk.com</Link> if you need any help, or 
                if you have any suggestions for improving Iris. We read and reply to every email.
            </Text>
        </View>
    )
}


export function IntakeScreen({community:paramCommunity, route}) {
    const community = paramCommunity || route?.params?.community;
    const [info, setInfo] = useState(null);
    const [answers, setAnswers] = useState({});
    const [valid, setValid] = useState({});
    const [topics, setTopics] = useState(null);
    const [selectedTopics, setSelectedTopics] = useState({});
    const [photoData, setPhotoData] = useState(null);
    const [thumbData, setThumbData] = useState(null);
    const [inProgress, setInProgress] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState(false);
    const [logKey, setLogKey] = useState(null);
    const [error, setError] = useState(null);
    const [intake, setIntake] = useState(null);
    const photoKey = useDatabase([getCurrentUser()], ['userPrivate', getCurrentUser(), 'photo']);
    const navigation = useCustomNavigation();
    const confirmed = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community, 'confirmed'], null);

    useEffect(() => {
        if (confirmed) {
            navigation.replace('community', {community});
        }
    }, [confirmed])

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setInfo);
        watchData(x, ['topic', community], setTopics);
        const k = newKey();
        setLogKey(k);
        logIntakeAsync({logKey: k, community, stage:'visit', data: null});
        return () => internalReleaseWatchers(x);
    }, [community])

    const filledFields = Object.keys(answers);
    const filledFieldCount = Object.keys(answers).length;

    useEffect(() => {
        if (filledFieldCount > 0) {
            logIntakeAsync({logKey, community, stage: 'answer', data: filledFields});
        }
    }, [filledFieldCount])

    const hasPhoto = photoData != null;
    useEffect(() => {
        if (hasPhoto) {
            logIntakeAsync({logKey, community, stage: 'photo'});
        }
    }, [hasPhoto])

    const topicCount = Object.keys(selectedTopics).filter(t => selectedTopics[t]).length;
    useEffect(() => {
        if (topicCount > 0) {
            logIntakeAsync({logKey, community, stage: 'topic', data: selectedTopics});
        }
    }, [topicCount])

    // console.log('intake', info, community);

    if (!info || !topics) return null;

    const sortedTopicKeys = _.sortBy(_.keys(topics), k => topics[k].time).reverse();
    const [pinnedTopics, normalTopics] = _.partition(sortedTopicKeys, k => topics[k].pinned);
    const shownTopicKeys = [...pinnedTopics, ...normalTopics].slice(0,10);

    // const shownTopicKeys = sortedTopicKeys.slice(0, 10);
    // const shownTopicKeys = sortedTopicKeys;

    var questions = parseQuestions(info.questions);
    if (!getCurrentUser()) {
        questions = [...basicQuestions, ...questions];
    }
    // const topics = parseTopics(info.topics);
    // console.log('questions', questions);
    // console.log('answers', answers);
    // console.log('topics', topics, selectedTopics);

    async function onSubmit() {
        const name = answers[name_label];
        const email = answers[email_label]?.toLowerCase()?.trim();
        setInProgress(true);
        logIntakeAsync({community, logKey, stage:'submit'});
        const yesTopics = _.mapValues(selectedTopics, v => 'yes');
        const {intakeKey} = await submitCommunityFormAsync({community, sendEmail: false, logKey, photoData, photoKey, thumbData, name, email, answers, topics:yesTopics});
        setIntake(intakeKey);
        logIntakeAsync({community, logKey, stage:'received'});
        if (getCurrentUser()) {
            navigation.replace('community', {community});
        } else {
            const data = await requestLoginCode({email});
            if (data.success != true) {
                setError(data.message);
                setInProgress(false);
            } else {
                setConfirmEmail(true);
                setInProgress(false);
            }
        }
    }

    // console.log('stuff', answers, answers.email, answers.name, photoData);

    // return <ConfirmScreen community={community} email='hello@world.com' />

    if (confirmEmail) {
        return <ConfirmEmailScreen community={community} intake={intake} 
                    email={answers[email_label]} onBack={() => setConfirmEmail(false)}/>
    }

    const validEmail = valid[email_label] || getCurrentUser();
    const validName = valid[name_label] || getCurrentUser();
    const infoLines = info.info.split('\n');

    return (
        <ScreenContentScroll wideHeader={<LoggedOutHeader/>} wideFooter={<LoggedOutFooter />}>
            <IrisIntro communityName={info.name} />
            <View style={{margin: 16, alignItems: 'center', flexDirection: 'row'}}>
                <CommunityPhotoIcon photoKey={info.photoKey} photoUser={info.photoUser} thumb={false} size={64} />
                <Text style={{fontSize: 24, marginLeft: 16, fontWeight: 'bold'}}>{info.name}</Text>
            </View>
            <View style={{margin: 16}}>
                {infoLines?.map(line => 
                    <LinkText key={line} style={{color: '#666', marginBottom: 4}} text={line} />
                )}
                {/* <Text style={{color: '#666'}}>{info.info}</Text> */}
            </View>
            <View style={{borderTopColor: '#ddd', marginVertical: 16, borderTopWidth: StyleSheet.hairlineWidth}} />
            <View style={{margin: 16}}>
                <Text style={{fontSize: 18, marginBottom: 4, fontWeight: 'bold'}}>About You</Text>
                <Text style={{color: '#666'}}>This information is used to help match you with people to talk with. It will only be shared with community admins and members of your chat groups.</Text>
            </View>
            {/* {photoKey ? null :
                <View style={{margin: 16, alignSelf: 'center'}}>
                    <PhotoPicker required photoData={photoData} onChoosePhoto={({photoData, thumbData}) => {setPhotoData(photoData); setThumbData(thumbData)}} />
                </View>
            }    */}
            {questions.map(q =>
                <Question key={q.question} question={q} 
                    answer={answers[textToKey(q.question)]} 
                    onChangeValid={isValid => setValid({...valid, [textToKey(q.question)]: isValid})}
                    onChangeAnswer={answer => setAnswers({...answers, [textToKey(q.question)]: answer})} 
                />
            )}
            {/* <View style={{borderTopColor: '#ddd', marginHorizontal: 0, marginBottom: 16, marginTop: 32, borderTopWidth: StyleSheet.hairlineWidth}} />
            <View style={{margin: 16}}>
                <Text style={{fontSize: 18, marginBottom: 4, fontWeight: 'bold'}}>What Topics would you like to Discuss?</Text>
                <Text style={{color: '#666'}}>Choosing more topics increases the chance of a good match.</Text>
            </View>
            {shownTopicKeys.map(topicKey =>
                <Topic key={topicKey} topic={topics[topicKey]}
                    selected={selectedTopics[topicKey]}
                    onChangeSelected={selected => setSelectedTopics({...selectedTopics, [topicKey]: selected})}
                />
            )} */}
            <View style={{borderTopColor: '#ddd', marginHorizontal: 0, marginBottom: 16, marginTop: 32, borderTopWidth: StyleSheet.hairlineWidth}} />
            <WideButton style={{alignSelf: 'flex-start'}} alwaysActive onPress={onSubmit} disabled={!validEmail || !validName || inProgress}>
                {inProgress ? 'Submitting...' : 'Submit'}
            </WideButton>
            {validEmail ? null : 
                <ValidationWarning>Valid email required</ValidationWarning>
            }
            {validName ? null : 
                <ValidationWarning>Valid name required</ValidationWarning>
            }
            {error ? 
                <ValidationWarning>{error}</ValidationWarning>
            : null}
            {/* {thumbData || photoKey ? null :
                <ValidationWarning>Profile photo required</ValidationWarning>                
            } */}
            {/* {topicCount >= 1 ? null :
                <ValidationWarning>You must select at least one topic</ValidationWarning>                
            } */}
            <IrisHelp/>


        </ScreenContentScroll>
    )
}


const styles = StyleSheet.create({
    loadingMessage: {
      fontSize: 16,
    },
    loggingInScreen: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-around',
      flex: 1
    },
    horizBox: {
      flexDirection: 'row',
      justifyContent: 'space-around'
    },
    codeInput: {
      padding: 8,
      margin: 8,
      fontSize: 30,
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: 'gray',
      borderRadius: 24,
      flex: 1
    },
    textInput: {
      padding: 8,
      margin: 8,
      backgroundColor: 'white',
      borderWidth: 1,
      borderColor: 'gray',
      borderRadius: 12,
      flex: 1
    },
  
    codeBox: {
      backgroundColor: 'white',
      padding: 8,
      width: 150,
      borderColor: '#ddd',
      borderRadius: 8,
      borderWidth: 1,
      margin: 4,
      textAlign: 'center',
      // flex: 1,
      marginHorizontal: 16,
      fontSize: 30
    },
  
    textBox: {
      backgroundColor: 'white',
      padding: 8,
      borderColor: '#ddd',
      borderRadius: 8,
      borderWidth: 1,
      margin: 4,
      flex: 1,
      marginHorizontal: 16
    },
  
    error: {
      backgroundColor: 'hsl(60,100%,90%)',
      padding: 16,
      marginTop: 32
    },
  
    screen: {
      flex: 1,
      backgroundColor: 'rgb(230, 236, 240)',
    },
    hbox: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    switchCard: {
      marginTop: 32,
    },
    contentCard: {
      maxWidth: 400,
      backgroundColor: 'white',
      borderColor: '#eee',
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 10,
      flex: 1,
      // padding: 16,
      // alignItems: 'center'
    },
    productLogo: {
      // width: 36,
      // height: 32,
      width: 54,
      height: 48,
      marginRight: 10,
      marginLeft: 8,
    },
    productLogoSmall: {
      // width: 36,
      // height: 32,
      width: 54,
      height: 48,
      marginRight: 10,
      marginLeft: 8,
    },
  
    googleButton: {
      width: 191,
      height: 46,
      marginRight: 8,
      marginLeft: 8,
    }
  })