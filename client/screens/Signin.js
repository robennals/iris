import React from 'react';
import {Platform, View, Text, Image, StyleSheet, Linking, TextInput, ScrollView} from 'react-native';
import { Link, FormInput, FixedTouchable, ScreenContentScroll, WideButton, LogoHeader, validateEmail } from '../components/basics';
import { requestLoginCode, signinWithLoginCode } from '../data/servercall';
import { appName, appDomain, baseColor } from '../data/config';
import { track } from '../components/shim';



function ErrorMessage({errorMessage}) {
  if (errorMessage) {
    return (
      <View style={styles.error}>
        <Text>{errorMessage}</Text>
      </View>
    )
  } else {
    return null;
  }
}

export class SignInScreen extends React.Component {
  state = {email: null, code: null, name: null, mode: null, signingIn: false, errorMessage: null, inProgress: false};

  async sendLoginCode(email){
    track('Enter Login Email', {email});
    console.log('sendLoginCode', email);
    if (!email) {
      this.setState({errorMessage: 'You must provide an email address to log in'})
    } else if (!validateEmail(email)) {
      this.setState({errorMessage: "'"+email+"' is not a valid email address"});
    } else {
      this.setState({inProgress: true});
      const data = await requestLoginCode({email: email.toLowerCase().trim()});
      this.setState({inProgress: false});
      if (data.success != true) {
        // console.error('error requesting login code', data.message);
        this.setState({errorMessage: data.message});
      } else {
        this.setState({mode:'code'});
      }
    }
  }
  
  // TODO: code should be in POST rather than GET
  async loginWithCode(code) {
    track('Enter Login Code');
    this.setState({signingIn: true});

    const email = this.state.email || this.props.email;
    signinWithLoginCode({email: email.toLowerCase().trim(), code, 
      onError: errorMessage => this.setState({errorMessage, signingIn: false})
    })
  }

  render() {
    const {signingIn, errorMessage, inProgress} = this.state;
    const email = this.state.email || this.props.email;
    const code = this.state.code || this.props.code;
    const mode = this.state.mode || (this.props.code ? 'code' : 'start');
    const isWeb = Platform.OS == 'web'

    switch (mode) {
      case 'start':
        return (
          <ScreenContentScroll>
            <ErrorMessage errorMessage={errorMessage} />
            <View style={styles.hbox}>
              <View style={[styles.contentCard,{marginTop: 32, marginHorizontal: 8}]}>
                <LogoHeader />

                <View style={{marginTop: 16}}>
                  <View style={styles.horizBox}>
                    <FormInput part='email' 
                        placeholder='Enter your Email Address' style={styles.textBox}
                        textContentType='emailAddress'
                        keyboardType='email-address'
                        autoCompleteType='email'
                        defaultValue = {email}
                        onSubmitEditing = {() => this.sendLoginCode(email)}
                        onChangeText={email => this.setState({email, mode: 'start'})}/>
                  </View>
                </View>
                <WideButton part='submit' onPress={() => this.sendLoginCode(email)} alwaysActive disabled={inProgress} progressText='Sending Login Email...'>
                  Log In
                </WideButton>

                {/* <View style={{margin: 16}}>
                    <Text style={{color: '#666'}}>To use {appName} you must if you have been invited to a group conversation by a community.
                    </Text>
                </View> */}

                <View style={{margin: 16}}>
                    <Text style={{color: '#666'}}>
                      {appName} is a product of Talkful, Inc. By signing up, you agree to our <Link title='License' url={appDomain + '/license.html'}>license
                      </Link>,  <Link title='Community Standards' url={appDomain + '/standards.html'}>community standards
                      </Link>, and <Link title='Privacy Policy' url={appDomain + '/privacy.html'}>privacy policy</Link>.
                    </Text>
                  </View>

              </View>
            </View>
          </ScreenContentScroll>
        )
      case 'code': 
        return (
          <ScreenContentScroll>
            <ErrorMessage errorMessage={errorMessage} />
            <View style={styles.hbox}>
              <View style={[styles.contentCard,{marginTop: 32, marginHorizontal: 8, opacity: signingIn ? 0.5 : null}]}>
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
                    defaultValue={code}
                    textAlign = 'center'
                    onChangeText={code => this.setState({code})}/>
                </View>
                <WideButton part='submit' progressText='Signing In...' 
                  onPress={() => this.loginWithCode(code)} disabled={signingIn}>
                    Log In / Sign Up
                </WideButton>
              </View>
            </View>
            <FixedTouchable part='goback' onPress={()=>this.setState({mode:'start', signingIn: false})}>
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
      default: 
        return null
    }
  }
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