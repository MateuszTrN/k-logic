import React, {createContext, useEffect, useRef, useState} from 'react';
import {assocPath, dissocPath, path} from 'ramda';
import {fromTree} from 'k-reducer';

const defaultContextValue = {
  scope: [],
  assocReducer: () => {},
  dissocReducer: () => {},
  dispatch: () => {},
  runSaga: () => {},
  state: {},
};

const KLogicContext = createContext(defaultContextValue);

function KLogicProvider({store, runSaga, children}) {
  const [context, setContext] = useState(defaultContextValue);
  const reducersTree = useRef({});

  useEffect(() => {
    store.subscribe(() => {
      setContext({
        ...context,
        state: store.getState(),
      });
    });
  }, []);

  const assocReducer = (rPath, reducer) => {
    if (path(rPath, reducersTree.current)) {
      console.error('additional scope is required for: ', rPath);
    } else {
      const newTree = assocPath(rPath, reducer, reducersTree.current);
      reducersTree.current = newTree;
      store.replaceReducer(fromTree(newTree));
      setContext({...context, state: store.getState()});
    }
  };

  const dissocReducer = rPath => {
    if (!path(rPath, reducersTree.current)) {
      console.warning('additional scope is required for: ', rPath);
    } else {
      const newTree = dissocPath(rPath, reducersTree.current);
      reducersTree.current = newTree;
      store.replaceReducer(fromTree(newTree));
      setContext({...context, state: store.getState()});
    }
  };

  const state = store.getState();

  return (
    <KLogicContext.Provider
      value={{
        ...context,
        assocReducer,
        dissocReducer,
        dispatch: store.dispatch,
        state,
        runSaga,
      }}
    >
      {children}
    </KLogicContext.Provider>
  );
}

export {KLogicContext, KLogicProvider};
