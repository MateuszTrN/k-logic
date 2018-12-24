import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {assocPath, dissocPath, path} from 'ramda';
import {fromTree} from 'k-reducer';

const defaultContextValue = {
  scope: [],
  assocReducer: () => {},
  dissocReducer: () => {},
  dispatch: () => {},
  runSaga: () => {},
  getState: () => {},
  subscribe: () => {},
};

const KLogicContext = createContext(defaultContextValue);

function KLogicProvider({store, runSaga, children}) {
  const [context, setContext] = useState(defaultContextValue);
  const reducersTree = useRef({});

  const assocReducer = useCallback(
    (rPath, reducer) => {
      if (path(rPath, reducersTree.current)) {
        console.error('additional scope is required for: ', rPath);
      } else {
        const newTree = assocPath(rPath, reducer, reducersTree.current);
        reducersTree.current = newTree;
        store.replaceReducer(fromTree(newTree));
        //setState(store.getState());
      }
    },
    [store]
  );

  const dissocReducer = useCallback(
    rPath => {
      if (!path(rPath, reducersTree.current)) {
        console.warning('additional scope is required for: ', rPath);
      } else {
        const newTree = dissocPath(rPath, reducersTree.current);
        reducersTree.current = newTree;
        store.replaceReducer(fromTree(newTree));
        setContext({...context, state: store.getState()});
      }
    },
    [store]
  );

  const contextValue = useMemo(
    () => ({
      ...context,
      assocReducer,
      dissocReducer,
      dispatch: store.dispatch,
      getState: store.getState,
      subscribe: store.subscribe,
      runSaga,
    }),
    [runSaga, assocReducer, dissocReducer]
  );

  return (
    <KLogicContext.Provider value={contextValue}>
      {children}
    </KLogicContext.Provider>
  );
}

export {KLogicContext, KLogicProvider};
