import {createReducer} from 'k-reducer';
import {assocPath, propOr, prop, not} from 'ramda';
import useKReducer from './useKReducer';
import {useLayoutEffect, useEffect} from 'react';

const actions = {
  setState: (name, value) => ({
    type: 'setState',
    payload: {name, value},
  }),
};

const reducer = createReducer({state: {}}, [
  (state, {type, payload}) =>
    type === 'setState'
      ? assocPath(['state', payload.name], payload.value, state)
      : state,
]);

let idx = 0;

const useKState = (key, initValue) => {
  let finalKey = key;
  let finalInitValue = initValue;

  if (!initValue) {
    console.warn(
      'useKState requires two parameters - "key" - name of the state prop and initial value'
    );
    finalKey = 'unnamed_' + idx++;
    finalInitValue = key;
  }

  const {setState, state} = useKReducer(reducer, actions);

  useEffect(() => {
    if (!prop(finalKey, state)) {
      setState(finalKey, finalInitValue);
    }
  }, []);

  useLayoutEffect(() => {
    idx = 0;
  });

  return [
    propOr(finalInitValue, finalKey, state),
    value => setState(finalKey, value),
  ];
};

export default useKState;
