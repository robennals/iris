import React from 'react';
import { Platform, Text, View } from 'react-native';
import _ from 'lodash';
import * as Sentry from 'sentry-expo';
import { captureException, ErrorBoundary } from './shim';


var global_testMode = false;
export function setTestMode(mode) {
  global_testMode = mode;
}

function ErrorHolder(props) {
  return <Text>Error</Text>
}

export function Catcher({children}) {
  return <ErrorBoundary fallback={props => <ErrorHolder props={props} />}>{children}</ErrorBoundary>
}

export class OLD_Catcher extends React.Component {
  state = {hasError: false, error: null, info: null}
  componentDidCatch(error, info) {
    console.error('caught error', error);
    try{
      captureException(e);
      if (global_testMode) {
        throw error;
      }  
    } catch (e) {
      console.error('error while catching exception', e);
    }

    this.setState({hasError: true, error, info});
  }

  render() {
    const {style, children} = this.props;
    const {hasError, error, info} = this.state;
    if (hasError) {
      var props = this.props;
      var type = null;
      if (typeof(children) == 'object') {
        props = children.props;
        type = children.type;
      }
      return <ErrorHolder props={props} type={type} error={error} info={info} />
    } else {
      return <View style={style}>{children}</View>
    }
  }
}