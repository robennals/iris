import React from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import { Catcher } from './catcher';
import Modal from 'react-native-modal';
import { FixedTouchable } from './basics';
import _ from 'lodash';


export function popupConfirm({title, text, onConfirm}) {
  Alert.alert(title, text, [
    {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel"
      },
      { text: "OK", onPress: onConfirm}
  ]);
}

export function ModalMenu({items, onSelect, onClose}) {
    return (
      <Modal style={{justifyContent: 'flex-end'}} 
          isVisible onBackdropPress={onClose} >
        <FixedTouchable onPress={onClose}> 
          <ScrollView>        
            {items.map(i => 
              <FixedTouchable key={i.id} onPress={() => {
                onSelect(i.id);
                // onClose()
              }}>
                <View style={{backgroundColor: '#fff', borderRadius: 16, padding: 8, alignItems: 'center', margin: 4}}>
                  <Text style={{fontSize: 20}}>{i.label}</Text>
                </View>
              </FixedTouchable>
            )}
          </ScrollView>
        </FixedTouchable>
      </Modal>
    )
  }
  
  function findCurrentLabel(items, id) {
    const item = _.find(items, i => i.id == id);
    return _.get(item,'label', '');
  }
  
  export class PopupSelector extends React.Component {
    state = {}
    render() {
      const {value, items, style, placeholder, onSelect, color} = this.props;
      const currentLabel = findCurrentLabel(items, value) || placeholder;
      return (
        <View style={{marginHorizontal: 16, marginVertical: 4}}>
          <PopupMenu items={items} onSelect={onSelect} >
            <View style={{borderColor: '#ddd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, ...style}}>
              <Text style={{fontSize: 20, color: color || 'black'}}>
                {currentLabel}
              </Text>
            </View>
          </PopupMenu>
        </View>
      )
    }
  }
  
  export class PopupMenu extends React.Component {
    state = {shown: false}
    render() {
      const {children, items, onSelect} = this.props;
      const {shown} = this.state;
      return (
        <View>
          <TouchableOpacity onPress={() => this.setState({shown: true})}>
            {children}
          </TouchableOpacity>
          {shown ?  
            <ModalMenu items={items} onClose={()=>this.setState({shown: false})}
                  onSelect={id => {onSelect(id); this.setState({shown: false})}} />
          : null }
        </View>
      )
    }
  }
  