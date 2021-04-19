import {assign, Machine} from 'xstate'

const toCamelCase = (strings = []) => {
  const toFirstLatterUppercase = string => string.charAt(0).toUpperCase() + string.slice(1)
  return strings.reduce((acc, string) => `${acc}${toFirstLatterUppercase(string)}`)
}

const camelCaseToArray = string => string.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ')

const getTransitionName = strings => strings.map(str => str.toUpperCase()).join('_')

const getActionName = (strings) => toCamelCase(['set', ...strings])

const getCondName = (strings) => toCamelCase(['is', ...strings])


export function createFormMachine(config) {

  const generateFiledTransitions = (field) => {
    const {name: fieldName, validations} = field

    const submitValidationsExist = validations && validations.onSubmit

    const updateFieldValueTransition = {
      [getTransitionName(['SET', ...camelCaseToArray(fieldName)])]: [
        {
          target: '.validate',
          actions: [getActionName([fieldName])]
        }
      ]
    }

    const submitTransitions = submitValidationsExist ? validations.onSubmit.reduce((acc, validation) => {
      const transition = {
        target: `.invalid.submit.${validation.name}`,
        cond: getCondName([fieldName, 'onSubmit', validation.name]),
        actions: getActionName([fieldName, 'onSubmit', validation.name, 'error'])
      }

      return [...acc, transition]
    }, []) : []

    return {
      SUBMIT: submitTransitions,
      ...updateFieldValueTransition,
    }
  }

  const generateInputValidateTransitions = (fieldName, validations = []) => {
    const invalidTransitions = validations.reduce((acc, validation) => {
      return [...acc, {
        target: `invalid.input.${validation.name}`,
        cond: getCondName([fieldName, 'onInput', validation.name]),
        actions: getActionName([fieldName, 'onInput', validation.name, 'error'])
      }]
    }, [])

    return [
      ...invalidTransitions,
      {
        target: `valid`,
        actions: toCamelCase(['clear', fieldName, 'error'])
      }
    ]
  }

  const generateAsyncValidateTransitions = (fieldName) => ([
    {
      target: `invalid.async`,
      cond: (ctx, event) => !!ctx.asyncErrors[fieldName],
      actions: getActionName([fieldName, 'error'])
    },
    {
      target: `valid`,
      actions: toCamelCase(['clear', fieldName, 'error'])
    }
  ])

  const generateAsyncErrorTransitions = fields => fields.map(field => `#draft.${field.name}.validate_async`)

  const generateFieldStates = (fields) => {
    return fields.reduce((acc, field) => {
      const {name: fieldName, validations = []} = field

      if (!fieldName) {
        throw new Error('Field must have a name')
      }

      const getInvalidStates = (validations = []) => validations.reduce((acc, validation, index) => {
        const currentStates = acc.states
        const initial = index === 0 ? validation.name : acc.initial

        return {
          initial,
          states: {...currentStates, [validation.name]: {}}
        }
      }, {states: {}})

      const fieldInputInvalidStates = getInvalidStates(validations.onInput)
      const fieldSubmitInvalidStates = getInvalidStates(validations.onSubmit)

      const fieldMachineConfig = {
        initial: 'valid',
        states: {
          valid: {},
          invalid: {
            initial: 'input',
            states: {
              input: fieldInputInvalidStates,
              submit: fieldSubmitInvalidStates,
              async: {}
            }
          },
          validate: {
            always: generateInputValidateTransitions(fieldName, validations.onInput),
          },
          validate_async: {
            always: generateAsyncValidateTransitions(fieldName),
          },
        },
        on: generateFiledTransitions(field),
      }

      return {...acc, [field.name]: fieldMachineConfig}
    }, {})
  }

  const generateContext = (fields) => fields.reduce((acc, field) => ({
    ...acc,
    [field.name]: {value: '', error: null}
  }), {})

  const generateActions = (fields) => fields.reduce((acc, field) => {
    const inputAction = assign((ctx, event) => {
      const fieldContext = ctx[field.name]
      return {[field.name]: {...fieldContext, value: event[field.name]}}
    })

    const createValidationActions = (validations = [], type) => validations.reduce((acc, validation) => {
      const setErrorAction = assign((ctx, event) => {
        const fieldContext = ctx[field.name] || {}
        const error = validation.message || `Error in ${field.name} -> ${validation.name}`

        return {[field.name]: {...fieldContext, error}}
      })

      return {
        ...acc,
        [getActionName([field.name, type, validation.name, 'error'])]: setErrorAction,
      }
    }, {})

    const inputValidationActions = createValidationActions(field.validations.onInput, 'onInput')
    const submitValidationActions = createValidationActions(field.validations.onSubmit, 'onSubmit')

    const asyncErrorAction = {
      [getActionName([field.name, 'error'])]: assign((ctx, event) => {
        const fieldContext = ctx[field.name] || {}
        const error = ctx.asyncErrors[field.name]

        return {[field.name]: {...fieldContext, error}}
      })
    }

    const clearErrorAction = assign((ctx, event) => {
      const fieldContext = ctx[field.name] || {}
      return {[field.name]: {...fieldContext, error: null}}
    })

    const asyncValidationErrorAction = {
      setAsyncErrors: assign((ctx, event) => ({
        asyncErrors: typeof config.prepareAsyncErrors === 'function' ?
          config.prepareAsyncErrors(ctx, event) :
          (event.data.errors || {})
      }))
    }

    return {
      ...acc,
      [getActionName([field.name])]: inputAction,
      [toCamelCase(['clear', field.name, 'error'])]: clearErrorAction,
      ...asyncErrorAction,
      ...inputValidationActions,
      ...submitValidationActions,
      ...asyncValidationErrorAction,
    }
  }, {})

  const generateGuards = (fields) => fields.reduce((acc, {validations, name: fieldName}) => {

    const createGuards = (validations = [], type) => validations.reduce((col, item) => ({
      ...col,
      [getCondName([fieldName, type, item.name])]: item.fn
    }), {})

    const inputGuards = createGuards(validations.onInput,  'onInput')
    const submitGuards = createGuards(validations.onSubmit,  'onSubmit')

    return {...acc, ...inputGuards, ...submitGuards }
  }, {})

  const generateExternalAPI = (fields = []) => {
    const onInputEvents = fields.reduce((acc, field) => {
      const transition = (send, e) => send({type: `SET_${getTransitionName(camelCaseToArray(field.name))}`, [field.name]: e.target.value})
      return {...acc, [field.name]: { onInput: transition}}
    }, {})

    const onSubmitEvent = (send, e) => {
      e.preventDefault()
      send('SUBMIT')
    }

    return {...onInputEvents, submit: onSubmitEvent}

  }

  const machineConfig = {
    initial: 'draft',
    context: generateContext(config.fields),
    states: {
      draft: {
        id: 'draft',
        type: 'parallel',
        states: generateFieldStates(config.fields),
        on: {
          SUBMIT: 'submit',
        }
      },
      submit: {
        invoke: {
          src: 'submit',
          onDone: {
            target: '#success',
          },
          onError: {
            target: generateAsyncErrorTransitions(config.fields),
            actions: 'setAsyncErrors',
          }
        }
      },
      success: {
        id: 'success',
        type: 'final'
      },
    }
  }

  const machineOptions = {
    services: {
      submit: config.submit,
    },
    actions: generateActions(config.fields),
    guards: generateGuards(config.fields),
  }

  if (config.debug) {
    console.log('---machine', machineConfig, machineOptions)
  }

  return {
    ...generateExternalAPI(config.fields),
    machine: Machine(machineConfig, machineOptions)
  }
}
