import {assign, Machine} from 'xstate'

/*Machine({
    initial: 'draft',
    context: {
      email: ''
    },
    states: {
      draft: {
        type: 'parallel',
        states: {
          email: {
            initial: 'valid',
            states: {
              valid: {},
              invalid: {
                initial: 'empty',
                states: {
                  empty: {},
                  notAnEmail: {}
                }
              }
            },
            on: {
              SUBMIT: [
                {target: '.invalid.empty', cond: 'isEmailEmpty'},
                {target: '.invalid.notAnEmail', cond: 'isEmailNotEmail'}
              ],
              SET_EMAIL: {target: '.valid', action: 'setEmail'}
            }
          }
        },
        on: {
          SUBMIT: 'submit'
        }
      },
      submit: {
        on: {
          LOADING: 'loading'
        }
      },
      loading: {
        on: {
          SUCCESS: 'success'
        }
      },
      success: {}
    }
  },
  {
    actions: {
      setEmail: assign((ctx, {email}) => ({email}))
    },
    guards: {
      isEmailEmpty: (ctx, event) => !ctx.email,
      isEmailNotEmail: (ctx, event) => !ctx.email.includes('@'),
    }
  }
)*/


const toCamelCase = (strings = []) =>  {
  const toFirstLatterUppercase = string => string.charAt(0).toUpperCase() + string.slice(1)

  return strings.reduce((acc, string) => `${acc}${toFirstLatterUppercase(string)}`)
}

const camelCaseToArray = string => string.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ')

const getTransitionName = strings => {
  debugger
  const asd = strings.map(str => str.toUpperCase())
  return strings.map(str => str.toUpperCase()).join('_')
}

const getActionName = (strings) => toCamelCase(['set', ...strings])
const getCondName = (strings) => toCamelCase(['is', ...strings])


export function createFormMachine(config) {

  const generateFiledTransitions = (field) => {
    const { name, validations = []} = field
    const updateFieldValueTransition = { target: '.valid', actions: [getActionName([name]), toCamelCase(['clear', field.name, 'error']) ]}

    const submitTransitions = !validations.length ? [] : validations.reduce((acc, validation) => {

      const transition = {
        target: `.invalid.${validation.name}`,
        cond: getCondName([name, validation.name]),
        actions: getActionName([name, validation.name, 'error'])
      }

      return [...acc, transition]
    }, [])

    return {
      SUBMIT: submitTransitions,
      [getTransitionName(['SET', ...camelCaseToArray(name)])]: updateFieldValueTransition
    }
  }

  const generateFieldStates = (fields) => {
  console.log('---fields', fields)
    return fields.reduce((acc, field) => {
      console.log('---field', field)
      const {name, validations = []} = field
debugger
      if (!name) {
        throw new Error('Field must have a name')
      }

      const fieldInvalidStates = !validations.length ?
        {} :
        validations.reduce((acc, validation, index) => {
        const currentStates = acc.states
        const initial = index === 0 ? validation.name : acc.initial


        return {
          initial,
          states: {...currentStates, [validation.name]: {}}
        }
      }, {states: {}})



      const fieldMachineConfig = {
        initial: 'valid',
        states: {
          valid: {},
          invalid: fieldInvalidStates,
        },
        on: generateFiledTransitions(field),
      }

      return {...acc, [field.name]: fieldMachineConfig}
    }, {})
  }

  const generateContext = (fields) => fields.reduce((acc, field ) => ({...acc, [field.name]: {value: '', error: null}}), {})

  const generateActions = (fields) => fields.reduce((acc, field) => {
    const inputAction = assign((ctx, event) => {
      const fieldContext = ctx[field.name]
      return { [field.name]: {...fieldContext, value: event[field.name]}}
    })

    const validationActions = field.validations && field.validations.reduce((acc, validation) => {
      const setErrorAction = assign((ctx, event) => {
        const fieldContext = ctx[field.name] || {}
        const error = validation.message || `Error in ${field.name} -> ${validation.name}`

        return {[field.name]: {...fieldContext, error }}
      })

      const clearErrorAction = assign((ctx, event) => {
        const fieldContext = ctx[field.name] || {}
        return {[field.name]: {...fieldContext, error: null }}
      })

      return {
        ...acc,
        [getActionName([field.name, validation.name, 'error'])]: setErrorAction,
        [toCamelCase(['clear', field.name, 'error'])]: clearErrorAction,
      }
    }, {})

    return { ...acc, [getActionName([field.name])]: inputAction, ...validationActions}
  }, {})

  const generateGuards = (fields) => fields.reduce((acc, field) => {
debugger
    const validations = field.validations || []

    const guards = validations.reduce((col, item) => ({...col, [getCondName([field.name, item.name])]: item.fn}), {})

    return {...acc, ...guards}
  }, {})


  console.log('---', {
      initial: 'draft',
      context: generateContext(config.fields),
      states: {
        draft: {
          type: 'parallel',
          states: generateFieldStates(config.fields),
          on: {
            SUBMIT: 'submit'
          }
        },
        submit: {
          on: {
            LOADING: 'loading'
          }
        },
        loading: {
          on: {
            SUCCESS: 'success'
          }
        },
        success: {}
      }
    },
    {
      actions: generateActions(config.fields),
      guards: generateGuards(config.fields),
    })

  return Machine({
      initial: 'draft',
      context: generateContext(config.fields),
      states: {
        draft: {
          type: 'parallel',
          states: generateFieldStates(config.fields),
          on: {
            SUBMIT: 'submit'
          }
        },
        submit: {
          on: {
            LOADING: 'loading'
          }
        },
        loading: {
          on: {
            SUCCESS: 'success'
          }
        },
        success: {}
      }
    },
    {
      actions: generateActions(config.fields),
      guards: generateGuards(config.fields),
    }
  )
}
