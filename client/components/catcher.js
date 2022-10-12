import React from 'react';
import { Platform, Text, View } from 'react-native';
import _ from 'lodash';
import { captureException, ErrorBoundary, setContext } from './shim';
import { logErrorAsync } from '../data/servercall';


var global_testMode = false;
export function setTestMode(mode) {
  global_testMode = mode;
}

function ErrorHolder(props) {
  return <Text>Error</Text>
}

export function BAD_Catcher({context, children}) {
  return (
    <ErrorBoundary 
      fallback={props => <ErrorHolder props={props} 
      beforeCapture={scope => {
        console.log('before context');
        if (context) {
          console.log('context', context);
          scope.setContext(context);
          setContext(context);
        }
      }}
    />}>
      {children}
    </ErrorBoundary>
  )
}

export class Catcher extends React.PureComponent {
  state = {hasError: false, error: null, info: null}
  componentDidCatch(error, info) {
    console.error('caught error', error);
    try {
      const componentError = new Error(error.message);
      componentError.name = `React ErrorBoundary ${componentError.name}`;
      componentError.stack = info.componentStack;
    
      error.cause = componentError;      
      console.log('Catcher Data', this.props.context);

      if (this.props.context) {
        console.log('set Context', this.props.context);
        // setContext(this.props.context);
        _.forEach(_.keys(this.props.context), k => {
          console.log(k + ': ' + this.props.context[k]);
        })
      }
      try {
        console.log('logError', {error: error.message, stack: info.componentStack, context: this.props.context});
        logErrorAsync({error: error.message, stack: info.componentStack, context: this.props.context});
      } catch(e) {
        console.log('error logging error', e);
      }
      captureException(error);
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

/* eslint-disable react/display-name */
export const screenProtector = component => params => {
  return (
    <Catcher style={{flex: 1}}>
      {React.createElement(component, params)}
    </Catcher>
  )  
}

export function headerProtector(component, params, children) {
  return (
    <Catcher>
      {React.createElement(component, params, children)}
    </Catcher>
  )
}
