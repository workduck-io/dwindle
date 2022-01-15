import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@workduck-io/dwindle'

interface LoginFormDetails {
  email: string
  password: string
}

export const Login = () => {
  const [loginMessage, setLoginMessage] = useState('')
  const { register, handleSubmit } = useForm<LoginFormDetails>()

  const { signIn, signOut } = useAuth()

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
