import {Componet} from '../react'
import {setAttribute} from './dom'

/**
 * diff
 * @param {HTMLElement} dom 真实DOM
 * @param {vnode} vnode 虚拟DOM
 * @param {HTMLElement} container 容器
 * @returns {HTMLElement} 更新后的DOM
 */
export function diff(dom, vnode, container) {

    const ret = diffNode(dom, vnode);

    if (container && ret.parentNode !== container) {
        container.appendChild(ret);
    }

    return ret;

}


/**
 * 对比
 * @param dom
 * @param vnode
 * @returns {*}
 */
function diffNode(dom, vnode) {

    let out = dom;

    if (vnode === undefined || vnode === null || typeof vnode === 'boolean') {
        vnode = '';    // 转化成字符串
    }

    if (typeof vnode === 'number') {
        vnode = String(vnode);    // 转化成字符串
    }

    // 1.1 对比文本节点
    if (typeof vnode === 'string') {

        // 如果当前的DOM就是文本节点，则直接更新内容
        if (dom && dom.nodeType === 3) {    // nodeType: https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeType
            if (dom.textContent !== vnode) {
                dom.textContent = vnode;
            }
            // 如果DOM不是文本节点，则新建一个文本节点DOM，并移除掉原来的
        } else {
            out = document.createTextNode(vnode);
            if (dom && dom.parentNode) {
                dom.parentNode.replaceChild(out, dom);
            }
        }

        return out;
    }

    // 1.2 对比组件
    if (typeof vnode.tag === 'function') {
        return diffComponent(dom, vnode);
    }

    // 1.3 对比DOM
    if (!dom || !isSameNodeType(dom, vnode)) {
        out = document.createElement(vnode.tag);

        if (dom) {
            [...dom.childNodes].map(out.appendChild);    // 将原来的子节点移到新节点下

            if (dom.parentNode) {
                dom.parentNode.replaceChild(out, dom);    // 移除掉原来的DOM对象
            }
        }
    }

    // 2. 对比children
    if (vnode.children && vnode.children.length > 0 || ( out.childNodes && out.childNodes.length > 0 )) {
        diffChildren(out, vnode.children);
    }

    // 3. 对比属性
    diffAttributes(out, vnode);

    return out;

}


/**
 * 对比children
 * @param dom
 * @param vchildren
 */
function diffChildren(dom, vchildren) {

    const domChildren = dom.childNodes;
    const children = [];

    const keyed = {};

    if (domChildren.length > 0) {
        for (let i = 0; i < domChildren.length; i++) {
            const child = domChildren[i];
            const key = child.key;

            // 把有key的和无key的分开
            if (key) {
                keyed[key] = child;
            } else {
                children.push(child);
            }
        }
    }

    if (vchildren && vchildren.length > 0) {

        let min = 0;
        let childrenLen = children.length;

        for (let i = 0; i < vchildren.length; i++) {

            const vchild = vchildren[i];
            const key = vchild.key;
            let child;

            if (key) {

                if (keyed[key]) {
                    child = keyed[key];      // 找到，有key
                    keyed[key] = undefined;  // 空出位置
                }

            } else if (min < childrenLen) {

                for (let j = min; j < childrenLen; j++) {

                    let c = children[j];

                    if (c && isSameNodeType(c, vchild)) {

                        child = c;                          // 找到，无key
                        children[j] = undefined;            // 空出位置

                        if (j === childrenLen - 1) {        // 如果是最后一个
                            childrenLen--;                  // 以后不用遍历该项
                        }

                        if (j === min) {                    // 如果是第一个
                            min++;                          // 以后不用遍历该项
                        }

                        break;
                    }
                }
            }

            child = diffNode(child, vchild);                // 更新后的DOM

            const f = domChildren[i];                       // 找到对应的位置

            if (child && child !== dom && child !== f) {
                if (!f) {
                    dom.appendChild(child);
                } else if (child === f.nextSibling) {
                    removeNode(f);
                } else {
                    dom.insertBefore(child, f);
                }
            }

        }
    }

}


/**
 * 对比组件
 * @param dom
 * @param vnode
 * @returns {*}
 */
function diffComponent(dom, vnode) {

    let c = dom && dom._component;
    let oldDom = dom;

    // 如果组件类型没有变化，则重新set props
    if (c && c.constructor === vnode.tag) {
        setComponentProps(c, vnode.attrs);
        dom = c.base;
        // 如果组件类型变化，则移除掉原来组件，并渲染新的组件
    } else {

        if (c) {
            unmountComponent(c);
            oldDom = null;
        }

        c = createComponent(vnode.tag, vnode.attrs);

        setComponentProps(c, vnode.attrs);
        dom = c.base;

        if (oldDom && dom !== oldDom) {
            oldDom._component = null;
            removeNode(oldDom);
        }

    }

    return dom;

}

/**
 * 对比属性
 * @param dom
 * @param vnode
 */
function diffAttributes(dom, vnode) {

    const old = {};    // 当前DOM的属性
    const attrs = vnode.attrs;     // 虚拟DOM的属性

    for (let i = 0; i < dom.attributes.length; i++) {
        const attr = dom.attributes[i];
        old[attr.name] = attr.value;
    }

    // 如果原来的属性不在新的属性当中，则将其移除掉（属性值设为undefined）
    for (let name in old) {

        if (!( name in attrs )) {
            setAttribute(dom, name, undefined);
        }

    }

    // 更新新的属性值
    for (let name in attrs) {
        if (old[name] !== attrs[name]) {
            setAttribute(dom, name, attrs[name]);
        }
    }
}

/**
 * 设置props
 * @param component
 * @param props
 */
function setComponentProps(component, props) {

    if (!component.base) {
        if (component.componentWillMount) {
            component.componentWillMount();
        }
    } else if (component.componentWillReceiveProps) {
        component.componentWillReceiveProps(props);
    }

    component.props = props;

    renderComponent(component);
}


/**
 *
 * @param component
 */
export function renderComponent(component) {

    let base;

    const renderer = component.render();

    if (component.base && component.componentWillUpdate) {
        component.componentWillUpdate();
    }

    base = diffNode(component.base, renderer);

    if (component.base) {
        if (component.componentDidUpdate) component.componentDidUpdate();
    } else if (component.componentDidMount) {
        component.componentDidMount();
    }

    component.base = base;
    base._component = component;

}


/**
 * 创建一个组件
 * @param component
 * @param props
 * @returns {*}
 */
function createComponent(component, props) {

    let inst;

    if (component.prototype && component.prototype.render) {   // component是类（构造函数）
        inst = new component(props);
    } else {                                                   // component是普通函数
        inst = new Component(props);
        inst.constructor = component;
        inst.render = function () {
            return this.constructor(props);
        }
    }

    return inst;

}

/**
 * 移除组件以及对应的DOM
 * @param component
 */
function unmountComponent(component) {
    if (component.componentWillUnmount) {
        component.componentWillUnmount();
    }
    removeNode(component.base);
}


/**
 * 同一类节点 - 都是文本节点，或tag相同
 * @param dom
 * @param vnode
 * @returns {*}
 */
function isSameNodeType(dom, vnode) {
    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return dom.nodeType === 3;
    }

    if (typeof vnode.tag === 'string') {
        return dom.nodeName.toLowerCase() === vnode.tag.toLowerCase();
    }

    return dom && dom._component && dom._component.constructor === vnode.tag;
}

/**
 * 移除DOM
 * @param dom
 */
function removeNode(dom) {

    if (dom && dom.parentNode) {
        dom.parentNode.removeChild(dom);
    }

}
