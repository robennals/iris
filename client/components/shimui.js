import React from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { Catcher } from './catcher';
import Modal from 'react-native-modal';
import { FixedTouchable } from './basics';
import _ from 'lodash';


function basicRenderItem ({item: {key, item, value}}) {
    return <Catcher>{item || value()}</Catcher>;
  }
  
  export class BottomFlatScroller extends React.PureComponent {
    state = {}
    safariScrollToEnd() {}
    render() {
      const {data, renderItem, style} = this.props;
      const {height} = this.state;    
      return (
        <View style={{flex: 1, justifyContent: 'flex-start', flexDirection: 'column'}}>
          <FlatList inverted initialNumToRender={20}
            style={{flex: 1, /* maxHeight: height */}}
            keyboardDismissMode='on-drag'
            // estimatedItemSize={78}
            data={data.slice().reverse()}
            renderItem={renderItem || basicRenderItem}
            onContentSizeChange={(width, height) => this.setState({height})}
          />
        </View>
      )
    }
  }


export function ModalMenu({items, onSelect, onClose}) {
    return (
      <Modal style={{justifyContent: 'flex-end'}} 
          isVisible onBackdropPress={onClose} >
        <FixedTouchable onPress={onClose} style={{flex: 1}}>
          <BottomFlatScroller data={items.map(i => 
            ({key: i.id, item: 
              <FixedTouchable key={i.id} onPress={() => {
                onSelect(i.id)
              }}>
                <View style={{backgroundColor: '#fff', borderRadius: 16, padding: 8, alignItems: 'center', margin: 4}}>
                  <Text style={{fontSize: 20}}>{i.label}</Text>
                </View>
              </FixedTouchable>
            })
          )} 
          />
          </FixedTouchable>
        {/* <ScrollView>        
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
        </ScrollView> */}
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
  