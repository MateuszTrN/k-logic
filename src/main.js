import React, {createFactory, Component, createElement} from 'react';
import {connect} from 'react-redux';
import sagaMiddleware from './sagaMiddleware';
import PropTypes from 'prop-types';
import {
    assocPath,
    assoc,
    over,
    lensProp,
    add,
    lensPath,
    view,
    identity,
    times,
    addIndex,
    map,
    curry,
    set,
    pick,
    composeP,
} from 'ramda';
import {
    actionType,
    wrapAction,
    fromTree,
    actionType2,
    createReducer,
} from 'k-reducer';
import {
    compose,
    withProps,
    withHandlers,
    setDisplayName,
    wrapDisplayName,
    setPropTypes,
    onlyUpdateForPropTypes,
} from 'recompose';
import {put, fork, call, takeEvery} from 'redux-saga/effects';
import {delay} from 'redux-saga';

const mapWithKey = addIndex(map);

const withLogic = ({reducer, saga}) => BaseComponent => {
    const factory = createFactory(BaseComponent);

    class WithReducer extends Component {
        constructor(props, context) {
            super();
            if (!context.kScope) {
                this.reducersTree = {};
            }
        }

        static contextTypes = {
            store: PropTypes.object,
            kScope: PropTypes.object,
        };

        static childContextTypes = {
            kScope: PropTypes.object,
        };

        componentWillMount() {
            if (reducer) {
                this.assocReducer(this.getCurrentScope(), reducer(this.props));
            }
            if (saga) {
                console.log('saga');
                sagaMiddleware.run(this.getCurrentScope().join('.'), saga);
            }
        }

        assocReducer(path, reducer) {
            if (this.context.kScope) {
                return this.context.kScope.assocReducer(path, reducer);
            } else {
                this.reducersTree = assocPath(
                    [...path, '.'],
                    reducer,
                    this.reducersTree
                );

                this.context.store.replaceReducer(fromTree(this.reducersTree));
            }
        }

        getCurrentScope() {
            return [
                ...(this.context.kScope ? this.context.kScope.scope : []),
                this.props.scope != null
                    ? '' + this.props.scope
                    : 'defaultScope',
            ];
        }

        getCurrentReducersTree() {
            return this.context.kScope
                ? this.context.kScope.reducersTree
                : this.reducersTree;
        }

        getChildContext() {
            return {
                kScope: {
                    scope: this.getCurrentScope(),
                    reducersTree: this.getCurrentReducersTree(),
                    assocReducer: this.assocReducer.bind(this),
                },
            };
        }

        dispatch = action =>
            this.context.store.dispatch(
                wrapAction(action, ...this.getCurrentScope())
            );

        render() {
            const state = view(
                lensPath(this.getCurrentScope()),
                this.context.store.getState()
            );

            return factory({
                ...this.props,
                dispatch: this.dispatch,
                ...state,
            });
        }
    }

    if (process.env.NODE_ENV !== 'production') {
        return setDisplayName(wrapDisplayName(BaseComponent, 'withReducer'))(
            WithReducer
        );
    }
    return WithReducer;
};

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

const handleAsyncs = ({dataProp} = {dataProp: 'data'}) => (
    model,
    {type, payload}
) => {
    const match = type.match(asyncActionRegexp);
    if (match) {
        const resource = match[1];
        const stage = match[2];
        if (stage === 'Request') {
            return set(lensPath([dataProp, resource, 'pending']), true, model);
        } else if (stage === 'Succeeded') {
            const m1 = set(
                lensPath([dataProp, resource, 'pending']),
                false,
                model
            );
            return set(lensPath([dataProp, resource, 'result']), payload, m1);
        } else if (stage === 'Failed') {
            const m1 = set(
                lensPath([dataProp, resource, 'pending']),
                false,
                model
            );
            return set(lensPath([dataProp, resource, 'error']), payload, m1);
        }
    }

    return model;
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

export {withLogic, handleAsyncs, asyncAction, fetchOnEvery, sagaMiddleware};
