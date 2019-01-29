import {useCallback, useContext} from 'react';
import {KLogicContext} from './kLogicProvider';

const useSagaRunner = () => {
  const context = useContext(KLogicContext);

  const runSaga = useCallback(
    (saga, ...args) => {
      context.runSaga(context.scope.join('.'), saga, ...args);
    },
    [context.scope]
  );

  return runSaga;
};

export default useSagaRunner;
