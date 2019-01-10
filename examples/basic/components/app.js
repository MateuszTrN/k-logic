import React, {Children} from 'react';
import {add, addIndex, assoc, lensProp, map, over, take} from 'ramda';
import {actionType, actionType2, createReducer} from 'k-reducer';
import {delay} from 'redux-saga';
import {put, takeEvery} from 'redux-saga/effects';
import {
  handleAsyncs,
  Scope,
  useAsync,
  useKReducer,
  useSaga,
  withScope,
} from '../../../src/main';

const mapWithKey = addIndex(map);

const getGists = () =>
  fetch('https://api.github.com/gists/public')
    .then(r => r.json(), r => r)
    .then(take(5));

const studentReducer = createReducer(
  {
    name: '',
    surname: '',
  },
  [
    actionType('SET_NAME', assoc('name')),
    actionType('SET_SURNAME', assoc('surname')),
  ]
);

const studentActions = {
  setName: e => ({type: 'SET_NAME', payload: e.target.value}),
  setSurname: e => ({type: 'SET_SURNAME', payload: e.target.value}),
};

const Student = withScope(() => {
  const {name, setName, surname, setSurname} = useKReducer(
    studentReducer,
    studentActions
  );

  return (
    <div>
      <input value={name} onChange={setName} />
      <input value={surname} onChange={setSurname} />
    </div>
  );
});

const counterReducer = createReducer({counter: 0}, [
  actionType2('INC', over(lensProp('counter'), add(1))),
  actionType2('DEC', over(lensProp('counter'), add(-1))),
]);

const counterActions = {
  inc: () => ({type: 'INC'}),
  dec: () => ({type: 'DEC'}),
};

const Counter = withScope(() => {
  const {inc, dec, counter} = useKReducer(counterReducer, counterActions);
  return (
    <div>
      <button onClick={dec}>dec</button>
      {counter}
      <button onClick={inc}>inc</button>
    </div>
  );
});

const ScopeList = ({scope, children}) => {
  return (
    <Scope scope={scope}>
      {Children.map(children, (e, idx) => ({
        ...e,
        props: {...e.props, scope: e.props.scope ? e.props.scope : '' + idx},
      }))}
    </Scope>
  );
};

const gistsReducer = createReducer({}, [
  handleAsyncs({
    gists: {},
  }),
]);

const gistsSaga = function*() {
  yield takeEvery('ping', function*() {
    for (let i = 0; i < 5; i++) {
      yield delay(1000);
      yield put({type: 'pong', payload: i});
    }
  });
};

const gistsActions = {
  ping: () => ({type: 'ping'}),
};

const Gists = withScope(() => {
  const {data, ping} = useKReducer(gistsReducer, gistsActions);
  const loadGists = useAsync(getGists, 'gists');
  useSaga(gistsSaga);
  /*useEffect(() => {
    loadGists();
  }, []);*/

  return (
    <div>
      <button onClick={loadGists}>Load</button>
      <button onClick={ping}>Ping</button>
      {mapWithKey(
        (g, idx) => (
          <div key={idx}>
            <a href={g.url}>{g.url}</a>
          </div>
        ),
        data.gists.result || []
      )}
    </div>
  );
});

const Projects4 = () => (
  <Scope scope="root">
    <ScopeList scope="counters">
      <Counter />
      <Counter />
      <Counter />
    </ScopeList>
    <Gists scope="gists" />
    <Scope scope="students">
      <Student scope="s1" />
      <Student scope="s2" />
    </Scope>
  </Scope>
);

export default Projects4;
