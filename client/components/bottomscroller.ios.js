import React from 'react';
import {View, FlatList} from 'react-native';
import { Catcher } from './catcher';
import _ from 'lodash';

function basicRenderItem ({item: {key, item, value}}) {
    return <Catcher>{item || value()}</Catcher>;
  }
  
  export class BottomFlatScroller extends React.PureComponent {
    state = {}
    safariScrollToEnd() {}
    render() {
      const {data, renderItem, style} = this.props;
      return (
        <View style={{flex: 1, justifyContent: 'flex-start', flexDirection: 'column'}}>
          <FlatList inverted initialNumToRender={20}
            style={{flex: 1, /* maxHeight: height */}}
            keyboardDismissMode='on-drag'
            // estimatedItemSize={78}
            data={data.slice().reverse()}
            renderItem={renderItem || basicRenderItem}
          />
        </View>
      )
    }
  }

