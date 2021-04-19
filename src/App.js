import './App.css'
import {createFormMachine} from './formMachineGenerator/index'
import {useMachine} from "@xstate/react"


const emailConfig = {
  name: 'email',
  validations: {
    onInput: [
      {name: 'isNotEmail', fn: (ctx, event) => !ctx.email.value.includes('@'), message: 'It is not an email'}
    ],
    onSubmit: [
      {name: 'empty', fn: (ctx, event) => !ctx.email.value, message: 'Email should be filled'},
    ]
  }
}

const passwordConfig = {
  name: 'password',
  validations: {
    onInput: [
      {name: 'tooShort', fn: (ctx, event) => ctx.password.value.length < 6, message: 'Password too short'},
    ],
    onSubmit: [
      {name: 'empty', fn: (ctx, event) => !ctx.password.value, message: 'Password should be filled'},
    ]
  }
}

const repeatPasswordConfig = {
  name: 'repeatPassword',
  validations: {
    onSubmit: [
      {
        name: 'passwordMismatch',
        fn: (ctx, event) => ctx.password.value !== ctx.repeatPassword.value,
        message: 'Password mismatch'
      }
    ]
  }
}

const config = {
  formName: 'test',
  fields: [emailConfig, passwordConfig, repeatPasswordConfig],
  submit: async (ctx, event) => new Promise((resolve, reject) => {
    if (ctx.email.value === 'test@test.com') {
      reject({ status: 'error', messages: { email: 'User already exist'} })
    }

    resolve({ status: 'success'})
  }),
  prepareAsyncErrors: (ctx, event) => event.data.messages,
  debug: true,
}

const { machine, email, password, repeatPassword, submit } = createFormMachine(config)

function App() {

  const [formState, send] = useMachine(machine)

  const {context} = formState

  const onSubmit = e => submit(send, e)

  return (
    <div className="App">
      <header className="App-header">
        <form className="form">
          <label className="input-label">
            Email:
            <input className="input" type="text" value={context.email.value} onInput={e => email.onInput(send, e)}/>
          </label>
          {context.email.error &&
          <div className="error">
            {context.email.error}
          </div>
          }
          <label className="input-label">
            Password:
            <input className="input" type="text" value={context.password.value} onInput={e => password.onInput(send, e)}/>
          </label>
          {context.password.error &&
          <div className="error">
            {context.password.error}
          </div>
          }
          <label className="input-label">
            Repeat password:
            <input className="input" type="text" value={context.repeatPassword.value} onInput={e => repeatPassword.onInput(send, e)}/>
          </label>
          {context.repeatPassword.error &&
          <div className="error">
            {context.repeatPassword.error}
          </div>
          }
          <button onClick={onSubmit}>Submit</button>
        </form>
        {formState.matches('success') &&
        <div className="success">
          Success
        </div>
        }
      </header>
    </div>
  )
}

export default App
