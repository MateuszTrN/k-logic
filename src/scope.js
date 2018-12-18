import React, {useContext} from 'react';
import {forwardTo} from 'k-reducer';
import {propOr} from 'ramda';
import {KLogicContext} from './kLogicProvider';

const Scope = ({scope, children}) => {
  const context = useContext(KLogicContext);
  const newScope = [...context.scope, scope];
  const newContext = {
    ...context,
    scope: newScope,
    dispatch: forwardTo(context.dispatch, scope),
    state: propOr({}, scope, context.state),
  };

  return (
    <KLogicContext.Provider value={newContext}>
      {children}
    </KLogicContext.Provider>
  );
};

export default Scope;
