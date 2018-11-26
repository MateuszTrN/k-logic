import React, {Component, createFactory} from 'react';
import sagaMiddleware from './sagaMiddleware';
import PropTypes from 'prop-types';
import {addIndex, assocPath, curry, lensPath, map, set, view} from 'ramda';
import {fromTree, wrapAction} from 'k-reducer';
import {setDisplayName, wrapDisplayName} from 'recompose';
import {call, put, takeEvery} from 'redux-saga/effects';

const mapWithKey = addIndex(map);

class ScopedComponent extends Component {
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

    getCurrentScopePart() {
        return this.props.scope != null
            ? ('' + this.props.scope).split('.')
            : ['defaultScope'];
    }

    getCurrentScope(currentPart) {
        return [
            ...(this.context.kScope ? this.context.kScope.scope : []),
            ...(currentPart ? currentPart : this.getCurrentScopePart()),
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

    getScopedState() {
        return view(
            lensPath(this.getCurrentScope()),
            this.context.store.getState()
        );
    }

    render() {
        return this.props.children;
    }
}

const withLogic = ({reducer, saga}) => BaseComponent => {
    const factory = createFactory(BaseComponent);

    class WithReducer extends ScopedComponent {
        constructor(props, context) {
            super(props, context);
        }

        componentWillMount() {
            if (reducer) {
                this.assocReducer(this.getCurrentScope(), reducer(this.props));
            }
            if (saga) {
                this.context.store.runSaga(
                    this.getCurrentScope().join('.'),
                    saga
                );
            }
        }

        render() {
            return factory({
                ...this.props,
                dispatch: this.dispatch,
                ...this.getScopedState(),
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

export {
    withLogic,
    handleAsyncs,
    asyncAction,
    fetchOnEvery,
    sagaMiddleware,
    ScopedComponent,
};
