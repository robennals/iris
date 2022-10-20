import React from 'react'
import {KeyboardAvoidingView, Platform, View, StyleSheet, Text} from 'react-native';

export class KeyboardSafeView extends React.Component {
  state = {verticalOffset:0} 

  onLayout() {
    this.view?.measure((x,y,width,height,pageX,pageY) => {
      this.setState({verticalOffset: pageY})
      // console.log('keyboard offset', pageY)
    })
  }

  render() {
    const {children, style, statusdark} = this.props;
    const {verticalOffset} = this.state;
    return (
      <View ref={r => this.view = r} style={{flex: 1}} onLayout={() => this.onLayout()} >
        {/* <Text>Offset: {verticalOffset}</Text>  */}
        <KeyboardAvoidingView
                  style={[styles.screen, style]}
                  behavior={Platform.OS == 'ios' ? 'padding' : undefined}
                  keyboardVerticalOffset={verticalOffset} >
              {children}
      </KeyboardAvoidingView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  }
})