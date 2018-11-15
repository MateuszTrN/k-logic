import React, {createFactory, Component, createElement} from 'react';
import {connect} from 'react-redux';
import sagaMiddleware from '../sagaMiddleware';
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
import {Router, Route, Link} from '../../../src/main';
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

const getGists = () =>
    fetch('https://api.github.com/gists/public').then(r => r.json(), r => r);

const createSaga = ({start}) =>
    function*() {
        console.log('createSaga');
        yield fork(start);
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

const InputTest = compose(
    withLogic(
        createReducer({text: 'Jaśko', text2: 'Dupa'}, [
            actionType('SET_TEXT', assoc('text')),
            actionType('SET_TEXT2', assoc('text2')),
        ])
    ),
    withHandlers({
        onChange: props => e =>
            props.dispatch({type: 'SET_TEXT', payload: e.target.value}),
        onChange2: props => e =>
            props.dispatch({type: 'SET_TEXT2', payload: e.target.value}),
    })
)(({children, text, text2, onChange, onChange2}) => (
    <div>
        <div>Test:</div>
        <div>
            <input value={text} onChange={onChange} />
            XXX:
            <input value={text2} onChange={onChange2} />
        </div>
        {children}
    </div>
));

const Test = compose(
    withLogic(
        createReducer({counter: 0}, [
            actionType2('INC', over(lensProp('counter'), add(1))),
        ])
    ),
    withHandlers({
        onClick: props => e => props.dispatch({type: 'INC', payload: 'hops'}),
    })
)(({children, counter, onClick}) => (
    <div>
        <div>Test:</div>
        <div>
            <button onClick={onClick} type="button">
                {`Go ${counter}`}
            </button>
            <InputTest scope="input" />
        </div>
        {children}
    </div>
));

const Scope = withLogic({reducer: createReducer({}, [])})(({children}) => (
    <div>{children}</div>
));

const Button = compose(
    withLogic(
        createReducer({counter: 0}, [
            actionType2('INC', over(lensProp('counter'), add(1))),
        ])
    ),
    withHandlers({
        onClick: props => e => props.dispatch({type: 'INC', payload: 'hops'}),
    })
)(({children, counter, onClick}) => (
    <button onClick={onClick} type="button">
        {`Hopla ${counter}`}
    </button>
));

const Array = withLogic({reducer: createReducer({}, [])})(
    ({of, items, ...rest}) =>
        mapWithKey(
            (e, idx) =>
                createElement(of, {...e, ...rest, key: idx, scope: idx}),
            items
        )
);

const Student = compose(
    withLogic({
        reducer: createReducer(
            {
                name: '',
                surname: '',
                data: {gists: {result: [], pending: false}},
            },
            [
                actionType('SET_NAME', assoc('name')),
                actionType('SET_SURNAME', assoc('surname')),
                handleAsyncs(),
            ]
        ),
        saga: createSaga({
            start: fetchOnEvery({
                actions: ['SET_NAME'],
                fn: composeP(
                    map(pick(['description', 'url'])),
                    getGists
                ),
                resourceKey: 'gists',
            }),
        }),
    }),
    withHandlers({
        onNameChange: props => e =>
            props.dispatch({type: 'SET_NAME', payload: e.target.value}),
        onSurnameChange: props => e =>
            props.dispatch({type: 'SET_SURNAME', payload: e.target.value}),
    })
)(({name, onNameChange, surname, onSurnameChange, data}) => (
    <div>
        <input value={name} onChange={onNameChange} />
        <input value={surname} onChange={onSurnameChange} />
        <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
));

const StudentList = compose(
    withLogic({
        reducer: createReducer({itemCount: 0}, [
            actionType2('INC', over(lensProp('itemCount'), add(1))),
        ]),
    }),
    withHandlers({
        onAddStudentClick: props => e => props.dispatch({type: 'INC'}),
    })
)(({children, itemCount, onAddStudentClick}) => (
    <div>
        <Array scope="items" of={Student} items={times(identity, itemCount)} />
        <button onClick={onAddStudentClick} type="button">
            Add
        </button>
    </div>
));

const Layout = ({children}) => <div>{children}</div>;

const Projects = () => (
    <Scope scope="root">
        <Student scope="student" />
    </Scope>
);

const ProjectEdit = () => (
    <div>
        Project Edit
        <Link name="root.projects" content="Go to projects" />
    </div>
);
/*
const App0 = ({model, dispatch}) => (
    <Router>
        <Route name="root" path="/" component={Layout}>
            <Route
                name="projects"
                path="projects"
                modelPath="projects"
                component={Projects}
            />
            <Route
                name="projectEdit"
                path="projects/:projectId"
                modelPath="projectEdit"
                component={ProjectEdit}
            />
        </Route>
    </Router>
);*/

const App = Projects;

export default App;
