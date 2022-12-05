// @ts-ignore
import React, { useEffect, useState } from 'react'

import { useAuth, client } from '@workduck-io/dwindle'

import { APIClient } from './APIClient'
import { Login, Register, CustomAttributes } from './Auth'
import { FileUploader } from './FileUploader'

const cognitoPoolID = import.meta.env.VITE_APP_COGNITO_POOL_ID
const cognitoClientID = import.meta.env.VITE_APP_COGNITO_CLIENT_ID
const identityPoolID = import.meta.env.VITE_APP_COGNITO_IDENTITY_POOL_ID
const identityProvider = import.meta.env.VITE_APP_COGNITO_IDENTITY_PROVIDER
const region = 'us-east-1'

function App() {
  const { refreshToken, userCred, initCognito, signOut } = useAuth()

  const [userDetails, setUserDetails] = useState('')

  useEffect(() => {
    // Make sure to initialize the lib rary with the respective keys
    // before calling functions to client or authentication
    initCognito(
      { UserPoolId: cognitoPoolID, ClientId: cognitoClientID },
      { identityPoolID: identityPoolID, CDN_BASE_URL: 'https://cdn.workduck.io' }
    )
    console.log('Cognito Initialized', { cognitoClientID, cognitoPoolID, identityPoolID })
  }, []) // eslint-disable-line

  const showUserDetails = (e: any) => {
    e.preventDefault()
    console.log('n', { userCred })
    setUserDetails(JSON.stringify(userCred))
  }

  const refreshT = (e: any) => {
    e.preventDefault()
    // Manually refresh the token
    refreshToken()
    setUserDetails(JSON.stringify(userCred))
  }

  const sendRequest = (e: any) => {
    e.preventDefault()
    client
      .get('https://your.aws.api/route')
      .then((d) => console.log(d))
      .catch((e) => console.log(e))
  }

  const logout = async (e: any) => {
    e.preventDefault()
    await signOut()
    console.log('Logged Out')
    setUserDetails('')
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Testing example for cognito-http</h1>
        <h1>Register User</h1>
        <Register />
        <h1>Login</h1>
        <Login />
        <br />
        <button onClick={showUserDetails}>Show user Details</button>
        <br />
        <button onClick={refreshT}> Refresh Token</button>
        <br />
        <h4>User Credentials</h4>
        <p>{userDetails}</p>
        <h4>Add Custom Attributes</h4>
        <CustomAttributes />
        <button onClick={sendRequest}>Send requests</button>
        <button onClick={logout}>Logout!</button>
        <FileUploader />
        <APIClient />
      </header>
    </div>
  )
}

export default App
