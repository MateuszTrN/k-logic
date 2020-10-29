import React, {Children, useCallback} from 'react';
import {add, addIndex, assoc, lensProp, map, over, take, always} from 'ramda';
import {actionType, actionType2, createReducer} from 'k-reducer';
import {delay} from 'redux-saga';
import {put, select, takeEvery} from 'redux-saga/effects';
import {
  handleAsyncs,
  Scope,
  useAsync,
  useKReducer,
  useKState,
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

const gistsReducer = createReducer({name: 'John'}, [
  handleAsyncs({
    gists: {},
  }),
]);

const gistsSaga = function*() {
  const name = yield select(m => m.name);
  console.log('name', name);

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

const LeftMenu = withScope(() => {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(e => (
        <div key={e}>Item</div>
      ))}
    </div>
  );
});

const inputActions = {
  setField: e => ({type: 'SetField', payload: e.target.value}),
};

const inputReducer = createReducer('Jan', [(state, action) => state]);

const Input = withScope(() => {
  const {value, setField} = useKReducer(inputReducer, inputActions);
  return <input value={value} onChange={setField} />;
});

const NestedComponent = withScope(() => {
  const [option, setOption] = useKState('option', 3);
  const [someText, setSomeText] = useKState('go go power rangers');
  const handleSetOption = useCallback(e => setOption(e.target.value), []);
  const handleSetSomeText = useCallback(e => setSomeText(e.target.value), []);
  return (
    <table>
      <tbody>
        <tr>
          <td>Only initValue provided in nested scope</td>
          <td>
            <input value={someText} onChange={handleSetSomeText} />
          </td>
        </tr>
        <tr>
          <td>Only initValue provided in nested scope</td>
          <td>
            <select value={option} onChange={handleSetOption}>
              <option value={1}>One</option>
              <option value={2}>Two</option>
              <option value={3}>Three</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  );
});

const TestComponent = withScope(() => {
  const [first, setFirst] = useKState('firstState', 'some text');
  const [second, setSecond] = useKState('secondState', 'other text');
  const [third, setThird] = useKState('other');
  const [fourth, setFourth] = useKState('fourth');
  const [value, setField] = useKState('value');
  //const {value, setField} = useKReducer(inputReducer, inputActions);

  const handleFirst = useCallback(e => setFirst(e.target.value), []);
  const handleSecond = useCallback(e => setSecond(e.target.value), []);
  const handleThird = useCallback(e => setThird(e.target.value), []);
  const handleFourth = useCallback(e => setFourth(e.target.value), []);

  return (
    <div>
      <h3>useKState Examples</h3>
      <table>
        <tbody>
          <tr>
            <td> key and init value provided:</td>
            <td>
              <input value={first} onChange={handleFirst} />{' '}
            </td>
          </tr>
          <tr>
            <td>key and init value provided:</td>
            <td>
              <input value={second} onChange={handleSecond} />
            </td>
          </tr>
          <tr>
            <td>only init value provided:</td>
            <td>
              <input value={third} onChange={handleThird} />
            </td>
          </tr>

          <tr>
            <td>only init value provided:</td>
            <td>
              <input value={fourth} onChange={handleFourth} />
            </td>
          </tr>
          <tr>
            <td>A regular useKReducer usages: </td>
            <td>
              <input value={value} onChange={setField} />
            </td>
          </tr>
        </tbody>
      </table>
      <NestedComponent scope="netedState" />
    </div>
  );
});

const SingleStateComponent = withScope(() => {
  const [value, setValue] = useKState('simple');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
});

const Projects4 = () => (
  <Scope scope="root">
    <div style={{display: 'flex'}}>
      <div style={{display: 'flex', width: '250px'}}>
        <LeftMenu scope="leftMenu" />
      </div>
      <div style={{display: 'flex', flex: 1, flexDirection: 'column'}}>
        <div>Header</div>
        <div>content</div>
      </div>
    </div>
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
    <Scope scope="fields">
      <Input scope="name" />
    </Scope>
    <Scope scope={'kStateExample'}>
      <SingleStateComponent scope={'singleStateExample'} />
      <TestComponent scope={'multipleStateExample'} />
    </Scope>
  </Scope>
);

export default Projects4;
