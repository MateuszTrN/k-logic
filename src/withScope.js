import React, {Component, createFactory} from 'react';
import {pathOr} from 'ramda';
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
      const scopeArray = this.props.scope.split('.');
      return this.props.scope
        ? {
            ...this.context,
            dispatch: forwardTo(this.context.dispatch, ...scopeArray),
            state: pathOr({}, scopeArray, this.context.state),
            scope: [...this.context.scope, ...scopeArray],
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
