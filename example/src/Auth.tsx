import React, { useState } from 'react'

import { useForm, useFieldArray } from 'react-hook-form'

import { useAuth } from '@workduck-io/dwindle'

interface LoginFormDetails {
  email: string
  password: string
}

export const Login = () => {
  const [loginMessage, setLoginMessage] = useState('')
  const { register, handleSubmit } = useForm<LoginFormDetails>()

  const { signIn } = useAuth()

  const onSubmit = async (data: LoginFormDetails) => {
    console.log('Login Form Data is: ', data)

    await signIn(data.email, data.password)
      .then((s: any) => {
        setLoginMessage(`Success: ${s.email}`)
      })
      .catch((err: any) => {
        console.error(err)
        setLoginMessage(err)
      })

    setLoginMessage(JSON.stringify(data))
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input placeholder="email" {...register('email')} />
        <input type="password" {...register('password')} />

        <input type="submit" />
      </form>
      <p>{loginMessage}</p>
    </>
  )
}

interface RegisterFormDetails {
  email: string
  password: string
}

interface VerifyFormDetails {
  code: string
}

export const Register = () => {
  const [registered, setRegistered] = useState(false)
  const [registerMessage, setRegisterMessage] = useState('')
  const { register, handleSubmit } = useForm<RegisterFormDetails>()
  const { signUp, verifySignUp } = useAuth()

  const onSubmit = (data: RegisterFormDetails) => {
    const customAttributes = [{ name: 'user_type', value: 'dwindle_test' }]
    signUp(data.email, data.password, customAttributes)
      .then(() => {
        setRegistered(true)
        setRegisterMessage('Registered Successfully enter verification')
      })
      .catch((e: any) => {
        if (e.name === 'UsernameExistsException') {
          setRegistered(true)
        }
      })
    setRegistered(true)
  }

  const [verificationMessage, setVerificationMessage] = useState('')
  const { register: vRegister, handleSubmit: vHandleSubmit } = useForm<VerifyFormDetails>()

  const onVSubmit = async (data: VerifyFormDetails) => {
    const metadata = { tag: 'MEX' }
    try {
      await verifySignUp(data.code, metadata)
    } catch (err) {
      console.log('Error verifying code: ', err)
    }
    setVerificationMessage(JSON.stringify(data))
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input placeholder="email" {...register('email')} />
        <input type="password" {...register('password')} />

        <input type="submit" />
      </form>
      <p>{registerMessage}</p>

      {registered && (
        <>
          <h4>Verification Code</h4>
          <form onSubmit={vHandleSubmit(onVSubmit)}>
            <input placeholder="Verification Code" {...vRegister('code')} />
            <input type="submit" />
          </form>
          <p>{verificationMessage}</p>
        </>
      )}
    </>
  )
}

interface CustomAttributeFormDetails {
  attr: {
    Name: string
    Value: string
  }[]
}

export const CustomAttributes = () => {
  const { updateUserAttributes, userAddWorkspace } = useAuth()

  const { register, control, handleSubmit } = useForm<CustomAttributeFormDetails>()
  const { fields, append, remove } = useFieldArray({
    name: 'attr',
    control,
  })

  const onSubmit = async (data: CustomAttributeFormDetails) => {
    const res = await updateUserAttributes(data.attr)
    // const res = await userAddWorkspace(data.attr[0].Value)
    console.log('Res: ', res)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => {
        return (
          <div key={field.id}>
            <section className={'section'} key={field.id}>
              <input placeholder="Attribute Name" {...register(`attr.${index}.Name` as const)} />
              <input placeholder="Attribute Value" {...register(`attr.${index}.Value`)} />

              <button type="button" onClick={() => remove(index)}>
                Remove Attribute
              </button>
            </section>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() =>
          append({
            Name: '',
            Value: '',
          })
        }
      >
        Add Attribute
      </button>
      <input type="submit" />
    </form>
  )
}
