import React, {createElement} from 'react';
import PropTypes from 'prop-types';
import {
  add,
  addIndex,
  assoc,
  composeP,
  curry,
  identity,
  lensPath,
  lensProp,
  map,
  over,
  pick,
  set,
  times,
} from 'ramda';
import {actionType, actionType2, createReducer} from 'k-reducer';
import {compose, withHandlers} from 'recompose';
import {call, fork, put, takeEvery} from 'redux-saga/effects';
import {withLogic, handleAsyncs} from '../../../src/main';

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

const getGists = () =>
  fetch('https://api.github.com/gists/public').then(r => r.json(), r => r);

const createSaga = ({start}) =>
  function*() {
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

const Scope = withLogic({reducer: () => createReducer({}, [])})(
  ({children}) => <div>{children}</div>
);

const Array = withLogic({reducer: () => createReducer({}, [])})(
  ({of, items, ...rest}) =>
    mapWithKey(
      (e, idx) => createElement(of, {...e, ...rest, key: idx, scope: idx}),
      items
    )
);

const Student = compose(
  withLogic({
    reducer: () =>
      createReducer(
        {
          name: '',
          surname: '',
        },
        [
          actionType('SET_NAME', assoc('name')),
          actionType('SET_SURNAME', assoc('surname')),
          handleAsyncs({
            gists: {type: PropTypes.array},
            dataConnection: {
              type: PropTypes.object,
              result: lensProp('connection'),
            },
          }),
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
    reducer: () =>
      createReducer({itemCount: 0}, [
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

const Projects = () => (
  <Scope scope="root.dupa">
    <Student scope="student" />
  </Scope>
);

export default Projects;
