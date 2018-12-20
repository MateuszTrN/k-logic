import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
} from 'react';
import sagaMiddleware from './sagaMiddleware';
import bindActionCreators from './bindActionCreators';
import Scope from './scope';
import withScope from './withScope';
import {KLogicContext, KLogicProvider} from './kLogicProvider';
import {
  addIndex,
  compose,
  curry,
  keys,
  lensPath,
  lensProp,
  map,
  mapObjIndexed,
  merge,
  reduce,
  set,
} from 'ramda';
import {call, put, takeEvery} from 'redux-saga/effects';

const mapWithKey = addIndex(map);

const asyncActionTypeName = curry(
  (stage, baseType) => `Async/${baseType}/${stage}`
);
const succeedAsyncActionName = asyncActionTypeName('Succeeded');
const failedAsyncActionName = asyncActionTypeName('Failed');
const requestedAsyncActionName = asyncActionTypeName('Request');

const createAsyncAction = stage => (baseType, payload) => ({
  type: asyncActionTypeName(stage, baseType),
  payload,
});

const requestAction = createAsyncAction('Request');
const succeededAction = createAsyncAction('Succeeded');
const failedAction = createAsyncAction('Failed');

const asyncActionRegexp = new RegExp(`^Async/(.+)/(.+)$`);

function* asyncAction({baseType, fn, args}) {
  try {
    yield put(requestAction(baseType));
    const result = yield call(fn, ...(args || []));
    yield put(succeededAction(baseType, result));
    return result;
  } catch (e) {
    yield put(failedAction(baseType, e));
  }
}

const getStageLens = (modelDef, resource, stage, dataProp) => {
  const defaultLens = compose(
    lensProp(dataProp),
    lensPath([resource, stage])
  );
  return modelDef[resource] && modelDef[resource][stage]
    ? modelDef[resource][stage]
    : defaultLens;
};

const buildModelLenses = (modelDef, options) => {
  const dataProp = options.dataProp || 'data';
  return mapObjIndexed(
    (def, resource) => ({
      pending: getStageLens(modelDef, resource, 'pending', dataProp),
      result: getStageLens(modelDef, resource, 'result', dataProp),
      error: getStageLens(modelDef, resource, 'error', dataProp),
    }),
    modelDef
  );
};

const initModelField = (fieldLens, target) =>
  compose(
    set(fieldLens.result, null),
    set(fieldLens.pending, false),
    set(fieldLens.error, null)
  )(target);

const initModel = (modelDef, modelLenses, target) =>
  reduce(
    (a, c) => merge(a, initModelField(modelLenses[c], a)),
    target,
    keys(modelDef)
  );

const handleAsyncs = (modelDef, options = {}) => {
  const modelLenses = buildModelLenses(modelDef, options);

  return (model, {type, payload}) => {
    if (type === '@@INIT') {
      return initModel(modelDef, modelLenses, model);
    }

    const match = type.match(asyncActionRegexp);
    if (match) {
      const resource = match[1];
      const stage = match[2];
      if (stage === 'Request') {
        return set(modelLenses[resource].pending, true, model);
      } else if (stage === 'Succeeded') {
        const m1 = set(modelLenses[resource].pending, false, model);
        return set(modelLenses[resource].result, payload, m1);
      } else if (stage === 'Failed') {
        const m1 = set(modelLenses[resource].pending, false, model);
        return set(modelLenses[resource].error, payload, m1);
      }
    }

    return model;
  };
};

const fetchOnEvery = ({actions, resourceKey, fn, argsSelector}) =>
  function*() {
    yield takeEvery(actions, function*() {
      yield* asyncAction({
        baseType: resourceKey,
        fn,
        args: [],
      });
    });
  };

const useKReducer = (reducer, actions) => {
  const context = useContext(KLogicContext);

  useLayoutEffect(() => {
    const reducerPath = [...context.scope, '.'];
    context.assocReducer(reducerPath, reducer);
    return () => {
      context.dissocReducer(reducerPath);
    };
  }, []);

  //TODO: performance
  const initialState = reducer(undefined, {type: '@@INIT'});

  return {
    ...bindActionCreators(actions, context.dispatch),
    ...initialState,
    ...context.state,
  };
};

const asyncAction2 = async (fn, key, dispatch) => {
  try {
    dispatch(requestAction(key));
    const result = await fn();
    dispatch(succeededAction(key, result));
    return result;
  } catch (e) {
    dispatch(failedAction(key, e));
  }
};

const useAsync = (fn, key) => {
  const context = useContext(KLogicContext);

  return useCallback(() => {
    asyncAction2(fn, key, context.dispatch).then();
  }, []);
};

const useSaga = saga => {
  const context = useContext(KLogicContext);

  return useEffect(() => {
    context.runSaga(context.scope.join('.'), saga);
  }, []);
};

export {
  handleAsyncs,
  asyncAction,
  fetchOnEvery,
  sagaMiddleware,
  KLogicProvider,
  KLogicContext,
  useKReducer,
  useAsync,
  Scope,
  withScope,
  useSaga,
};
