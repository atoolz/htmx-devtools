import { render } from 'preact'
import { App } from './App'
import { connect } from './connection'

connect()

render(<App />, document.getElementById('root')!)
