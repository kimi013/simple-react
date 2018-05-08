import { diff } from './diff'

/**
 * 渲染虚拟DOM
 * @param vnode
 * @param container
 * @param dom
 * @returns {HTMLElement}
 */
function render( vnode, container, dom ) {
    return diff( dom, vnode, container );
}

export default render;
