import React, {Component, createFactory} from 'react';
import {forwardTo} from 'k-reducer';
import {KLogicContext} from './kLogicProvider';

const withScope = BaseComponent => {
  const factory = createFactory(BaseComponent);

  class WithScope extends Component {
    constructor() {
      super();
      this.getNewContext = this.getNewContext.bind(this);
    }

    static contextType = KLogicContext;

    getNewContext() {
      return this.props.scope
        ? {
            ...this.context,
            dispatch: forwardTo(this.context.dispatch, this.props.scope),
            state: this.context.state[this.props.scope],
            scope: [...this.context.scope, this.props.scope],
          }
        : this.context;
    }

    render() {
      return (
        <KLogicContext.Provider value={this.getNewContext()}>
          {factory(this.props)}
        </KLogicContext.Provider>
      );
    }
  }

  return WithScope;
};

export default withScope;
