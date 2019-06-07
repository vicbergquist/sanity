// eslint-disable-next-line import/no-unassigned-import
import 'symbol-observable'
import {hot} from 'react-hot-loader/root'
import React from 'react'
import ReactDOM from 'react-dom'
import Root from 'part:@sanity/base/sanity-root'

function render(rootComponent) {
  const RootComponent = hot(rootComponent)
  ReactDOM.render(<RootComponent />, document.getElementById('sanity'))
}

render(Root)

if (module.hot) {
  module.hot.accept('part:@sanity/base/sanity-root', () => {
    const nextMod = require('part:@sanity/base/sanity-root')
    const NextRoot = nextMod && nextMod.__esModule ? nextMod.default : nextMod
    render(NextRoot)
  })
}
