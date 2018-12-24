import React, {useContext, useMemo} from 'react';
import {forwardTo} from 'k-reducer';
import {KLogicContext} from './kLogicProvider';

const Scope = ({scope, children}) => {
  const context = useContext(KLogicContext);
  const scopeArray = useMemo(() => scope.split('.'), [scope]);
  const newScope = useMemo(() => [...context.scope, ...scopeArray], [
    context.scope,
    scopeArray,
  ]);
  const dispatch = useMemo(() => forwardTo(context.dispatch, ...scopeArray), [
    scopeArray,
    context.dispatch,
  ]);
  const newContext = useMemo(
    () => ({
      ...context,
      scope: newScope,
      dispatch,
    }),
    [newScope, dispatch]
  );

  return (
    <KLogicContext.Provider value={newContext}>
      {children}
    </KLogicContext.Provider>
  );
};

export default Scope;
