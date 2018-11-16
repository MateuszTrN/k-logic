import {createReducer} from 'k-reducer';
const initialState = {
    router: {},
};

const appReducer = createReducer(initialState, []);

export default appReducer;
