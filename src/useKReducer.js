import {useContext, useLayoutEffect, useRef, useState, useMemo} from 'react';
import {KLogicContext} from './kLogicProvider';
import {mergeDeepRight, pathOr} from 'ramda';
import bindActionCreators from './bindActionCreators';

const emptyObject = {};

const useKReducer = (reducer, actions) => {
  const context = useContext(KLogicContext);

  const [state, setState] = useState(
    pathOr({}, context.scope, context.getState())
  );

  const stateRef = useRef(state);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    const reducerPath = [...context.scope, '.'];
    context.assocReducer(reducerPath, reducer);
    const tryUpdateState = () => {
      const newState = pathOr(emptyObject, context.scope, context.getState());
      if (newState !== stateRef.current) {
        setState(newState);
        stateRef.current = newState;
      }
    };
    const unsubscribe = context.subscribe(tryUpdateState);
    return () => {
      context.dissocReducer(reducerPath);
      unsubscribe();
    };
  }, []);

  const actionCreators = useMemo(
    () => bindActionCreators(actions, context.dispatch),
    [actions, context.dispatch]
  );

  const finalState = mergeDeepRight(
    reducer(undefined, {type: '@@INIT'}),
    state
  );

  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  return {
    ...actionCreators,
    ...finalState,
  };
};

export default useKReducer;
