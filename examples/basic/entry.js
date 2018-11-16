import React from 'react';
import {render} from 'react-dom';
import {createStore, compose, applyMiddleware} from 'redux';
import {Provider, connect} from 'react-redux';
import sagaMiddleware from './sagaMiddleware';
import App from './components/app';
import appReducer from './components/appReducer';

const composeEnhancers =
    typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
        ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
              // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
          })
        : compose;

const store = createStore(
    appReducer,
    composeEnhancers(applyMiddleware(sagaMiddleware))
);

store.runSaga = sagaMiddleware.run;

sagaMiddleware.run('dupa', function*() {
    console.log('hopla');
});

const run = (containerDomId, View) => {
    const ConnectedView = connect(appState => ({
        model: appState,
    }))(View);

    render(
        <Provider store={store}>
            <ConnectedView />
        </Provider>,
        document.getElementById(containerDomId)
    );
};

run('root', App);

if (module.hot) {
    module.hot.accept('./components/app', () => {
        const NextApp = require('./components/app').default;
        run('root', NextApp);
    });
}
