# Form machine generator

Helper for creating forms using [XState machine](https://xstate.js.org/docs/guides/machines.html)

- [Описание реализованнго функцианала](#описание-реализованнго-функцианала)
- [Недостатки и ограничения подхода](#недостатки-и-ограничения-подхода)
- [Почему было выбрано именно такое внешнее API](#Почему-было-выбрано-именно-такое-внешнее-API)
- [Альтернативные варианты реализации](#Альтернативные-варианты-реализации)
- [Example](#example)
- [API](#api)
- [Config description](#config-description)
  - [Config](#config)
  - [Field config](#field-config)
  - [Field validations](#field-validations)
  - [Validation](#validations)


## Описание реализованнго функцианала

  В предоставленном генераторе XState машины реализован следующий функционал:
  - синхронная валидация одного поля выполняющаяся при вводе данных в поле.
  - синхронная валидация всей формы, ошибка присваивается конкретному полю. 
    Валидация происходит полсе нажатия на кнопку submit.
  - асинхронная валидация всей формы, ошибка присваивается конкретному полю.

## Недостатки и ограничения подхода

  - Нельзя расширить конфиг стейт машины
  - Нет возможности управлять состоянием машины напрямую.

## Почему было выбрано именно такое внешнее API
  
  API содержит всего один метод, что очень легко для восприятия.
  Декларативное описание конфига позволяет удобно пистать, читать и рефакторить его в дальнейшем.
  На выходе мы получаем все нужные функции для работы с формой связанной с XState машиной, скрывая сложность.

## Альтернативные варианты реализации

  Рассматривался вариант конструирования конфига с помощю API. Сам конфиг находится в пользовтельском файле, 
  и создается вручную, путем вызова вспомогательных функций. 

  Данный подход позволил бы более гибко описывать конфигурцию XState машины, но и привнес бы большую сложность.

## Example

```js
    import {createFormMachine} from './machines/createFormMachine'
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
    }
    
    // create machine
    const { machine, submit, email } = createFormMachine(config)

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
  ```

## API

### `createFormMachine(config)`

Function that return the machine and support methods for fields and form.

**Arguments**

- `config` - is an object which describe the `fields` and the form behavior

  ```js
    // describe config
    const emailConfig = {
      name: 'email',
      validations: {}
    }
    
    const config = {
      formName: 'test',
      fields: [emailConfig],
      submit: async (ctx, event) => {},
      prepareAsyncErrors: (ctx, event) => event.data.messages,
      debug: true,
    }
    
    // create machine
    const { machine, submit, email } = createFormMachine(config)
  ```

**Returns** an object `{ machine, submit, email //additional fields...}`:

- `machine` - An [XState machine](https://xstate.js.org/docs/guides/machines.html).
- `submit` - A function that create event for form sending.
- `email` - The `field` API. The name will be the same as name in config.
  - `onInput` - A function that create event for field input. The function has two arguments:
    
    `send` - is function which sends events to the running machine
    
    `event` - is the input event.
    ```js
    // react example
    <input type="text" onInput={event => email.onInput(send, event)}/>
    ```
## Config description

### `Config`

Config is a simple object where you describe your form behavior. The config includes:

- `formName` - Name of the form.
- `fields` - Array of form field configs.
- `submit` - Function for submit request. You can extend `machine` with `submit` service instead. Receives the machine `context` and `event` as arguments.
- `prepareAsyncErrors` - Function that prepare submit error for `machine`. Receives the machine `context` and `event` as arguments.
- `debug` - If ```true``` write `machine` config to the console.

### `Field config`

Field config is a simple object where you describe your field behavior. The config includes:

- `name` - Name of the field.
- `validations` - Array of `validations`.

### `Field validations`

Validations describe how to validate form fields.
You can describe two types of validations `onInput`, `onSubmit`.

- `onInput` - Runs on each input for a specific field.
- `onSubmit` - Runs synchronously for each field after clicking submit button.

  ```js
    {
      //...,
      validations: {
        onInput: [
          {name: 'isNotEmail', fn: (ctx, event) => !ctx.email.value.includes('@'), message: 'It is not an email'}
        ],
        onSubmit: [
          {name: 'empty', fn: (ctx, event) => !ctx.email.value, message: 'Email should be filled'},
        ]
      }
    }
  ```

### `Validation`

Validation is a function that describe how to validate the value of the field.

- `name` - Validation name.
- `fn` - Function for validation. The Function receives the machine `context` and `event` as arguments.
- `message` - Error message if validation failed.

