import {KLogicProvider} from '../';
import {mount} from 'enzyme';
import jest from 'jest';

describe('init', () => {
  it('should return test', () => {
    jest.mockComponent();
    const hopla = mount(<KLogicProvider store={{}}>a</KLogicProvider>);

    expect(withScope()).toBe('test');
  });
});
