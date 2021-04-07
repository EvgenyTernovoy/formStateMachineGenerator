import './App.css'
import {createFormMachine} from './machines/createFormMachine'
import {useMachine} from "@xstate/react"


const email = {
  name: 'email',
  validations: [
    {name: 'empty', fn: (ctx, event) => !ctx.email.value, message: 'Email should be filled'},
    {name: 'isNotEmail', fn: (ctx, event) => !ctx.email.value.includes('@'), message: 'It is not an email'}
  ]
}

const password = {
  name: 'password',
  validations: [
    {name: 'tooShort', fn: (ctx, event) => ctx.password.value.length < 6, message: 'Password too short'},
  ]
}

const repeatPassword = {
  name: 'repeatPassword',
  validations: [
    {name: 'passwordMismatch', fn: (ctx, event) => ctx.password.value !== ctx.repeatPassword.value, message: 'Password mismatch'},
  ]
}

const config = {
  formName: 'test',
  fields: [email, password, repeatPassword],
}

const machine = createFormMachine(config)

function App() {
  const [formState, send] = useMachine(machine)

  const {context} = formState

  const onInput = (e) => {
    send({type: "SET_EMAIL", email: e.target.value})
  }

  const onInputPassword = (e) => {
    send({type: "SET_PASSWORD", password: e.target.value})
  }

  const onInputRepeatPassword = (e) => {
    send({type: "SET_REPEAT_PASSWORD", repeatPassword: e.target.value})
  }

  const onSubmit = (e) => {
    e.preventDefault()
    send('SUBMIT')
  }

  console.log('---formState', formState)

  return (
    <div className="App">
      <header className="App-header">
        <form className="form">
          <label>
            Email:
            <input type="text" value={context.email.value} onInput={onInput}/>
          </label>
          {context.email.error &&
            <div className="error">
              {context.email.error}
            </div>
          }
          <label>
            Password:
            <input type="text" value={context.password.value} onInput={onInputPassword}/>
          </label>
          {context.password.error &&
          <div className="error">
            {context.password.error}
          </div>
          }
          <label>
            Repeat password:
            <input type="text" value={context.repeatPassword.value} onInput={onInputRepeatPassword}/>
          </label>
          {context.repeatPassword.error &&
          <div className="error">
            {context.repeatPassword.error}
          </div>
          }
          <button onClick={onSubmit}>Submit</button>
        </form>
      </header>
    </div>
  )
}

export default App
