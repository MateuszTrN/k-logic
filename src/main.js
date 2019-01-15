import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
} from 'react';
import sagaMiddleware from './sagaMiddleware';
import bindActionCreators from './bindActionCreators';
import Scope from './scope';
import withScope from './withScope';
import withDebug from './withDebug';
import shallowEqual from './shallowEqual';
import useKReducer from './useKReducer';
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
  mergeRight,
  identity,
  reduce,
  set,
  unless,
  is,
  objOf,
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

const initModelField = (fieldLens, defaultValue, target) =>
  compose(
    set(fieldLens.result, defaultValue),
    set(fieldLens.pending, false),
    set(fieldLens.error, null)
  )(target);

const initModel = (modelDef, modelLenses, target) =>
  reduce(
    (a, c) =>
      mergeRight(
        a,
        initModelField(modelLenses[c], modelDef[c].defaultValue || null, a)
      ),
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

      const resultTransform = modelDef[resource].resultTransform || identity;
      const errorTransform = modelDef[resource].errorTransform || identity;

      if (stage === 'Request') {
        return set(modelLenses[resource].pending, true, model);
      } else if (stage === 'Succeeded') {
        const m1 = set(modelLenses[resource].pending, false, model);
        return set(modelLenses[resource].result, resultTransform(payload), m1);
      } else if (stage === 'Failed') {
        const m1 = set(modelLenses[resource].pending, false, model);
        return set(modelLenses[resource].error, errorTransform(payload), m1);
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

const ensureObject = unless(is(Object), objOf('value'));

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
  withDebug,
  useSaga,
  shallowEqual,
  bindActionCreators,
};
