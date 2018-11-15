import {createRouterReducer} from "../../../src/main";
import {createReducer, nest} from 'k-reducer';
import {compose, startsWith, prop,} from 'ramda';
//import projectsReducer from "./projects/reducer";
//import projectEditReducer from "./projectEdit/reducer";
import {action} from 'k-reducer';

const root = (type, subReducer) => (state, action) => {
    const prefix = `${type}.`;
    if (compose(startsWith(prefix), prop('type'))(action)) {
        const unwrappedAction = {
            ...action,
            type: action.type.substr(prefix.length),
        };
        return subReducer(state, unwrappedAction);
    } else {
        return state;
    }
};

const routerReducer = createRouterReducer('router');

const initialState = {
    router: {},
};

const appReducer = createReducer(initialState, [
    //nest('projects', projectsReducer),
    //nest('projectEdit', projectEditReducer),
    root('router', routerReducer),
]);

export default appReducer;
