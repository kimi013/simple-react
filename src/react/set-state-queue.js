import {renderComponent} from '../react-dom/diff'

// 放置stateChange与对应组件的数组
const setStateQueue = [];
// 放置有关组件的数组
const renderQueue = [];


/**
 * 异步执行
 * @param fn
 * @returns {Promise.<TResult>}
 */
function defer(fn) {
    return Promise.resolve().then(fn);
}


/**
 * 将stateChange于相关组件放入任务队列，异步执行flush
 * @param stateChange
 * @param component
 */
export function enqueueSetState(stateChange, component) {

    if (setStateQueue.length === 0) {
        defer(flush);
    }

    setStateQueue.push({
        stateChange,
        component
    });

    if (!renderQueue.some(item => item === component)) {
        renderQueue.push(component);
    }
}


/**
 * 清空setStateQueue, 改变各state
 * 清空renderQueue, 渲染个组件
 */
function flush() {
    let item, component;
    while (item = setStateQueue.shift()) {

        const {stateChange, component} = item;

        // 如果没有prevState，则将当前的state作为初始的prevState
        if (!component.prevState) {
            component.prevState = Object.assign({}, component.state);
        }

        // 如果stateChange是一个方法，也就是setState的第二种形式
        if (typeof stateChange === 'function') {
            Object.assign(component.state, stateChange(component.prevState, component.props));
        } else {
            // 如果stateChange是一个对象，则直接合并到setState中
            Object.assign(component.state, stateChange);
        }

        component.prevState = component.state;

    }

    while (component = renderQueue.shift()) {
        renderComponent(component);
    }

}
