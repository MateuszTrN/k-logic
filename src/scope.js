import React, {useContext, useMemo} from 'react';
import {forwardTo} from 'k-reducer';
import {pathOr} from 'ramda';
import {KLogicContext} from './kLogicProvider';

const Scope = ({scope, children}) => {
  const context = useContext(KLogicContext);
  const scopeArray = useMemo(() => scope.split('.'), [scope]);
  const newScope = [...context.scope, ...scopeArray];
  const newContext = {
    ...context,
    scope: newScope,
    dispatch: forwardTo(context.dispatch, ...scopeArray),
    state: pathOr({}, ...scopeArray, context.state),
  };

  return (
    <KLogicContext.Provider value={newContext}>
      {children}
    </KLogicContext.Provider>
  );
};

export default Scope;
