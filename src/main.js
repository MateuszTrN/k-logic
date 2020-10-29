import React, {useCallback, useContext, useEffect} from 'react';
import sagaMiddleware from './sagaMiddleware';
import bindActionCreators from './bindActionCreators';
import Scope from './scope';
import withScope from './withScope';
import withDebug from './withDebug';
import shallowEqual from './shallowEqual';
import useKReducer from './useKReducer';
import useKState from './useKState';
import handleAsyncs from './handleAsyncs';
import useSagaRunner from './useSagaRunner';
import {KLogicContext, KLogicProvider} from './kLogicProvider';
import {curry, unless, is, objOf} from 'ramda';
import {call, put, takeEvery} from 'redux-saga/effects';

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

const useSaga = (saga, args = [], dependencies = []) => {
  const context = useContext(KLogicContext);

  return useEffect(() => {
    context.runSaga(context.scope.join('.'), saga, ...args);
  }, dependencies);
};

export {
  handleAsyncs,
  asyncAction,
  fetchOnEvery,
  sagaMiddleware,
  KLogicProvider,
  KLogicContext,
  useKReducer,
  useKState,
  useAsync,
  Scope,
  withScope,
  withDebug,
  useSaga,
  shallowEqual,
  bindActionCreators,
  useSagaRunner,
};
