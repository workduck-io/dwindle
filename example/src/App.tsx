import { useAuth, client } from 'cognito-http'
import React, { useEffect } from 'react'

function App() {
  const { refreshToken, userCred, signIn, initCognito } = useAuth()

  useEffect(() => {
    // Make sure to initialize the library with the respective keys
    // before calling functions to client or authentication
    initCognito({ UserPoolId: 'USER_POOL_ID', ClientId: 'CLIENT_ID' })
  }, [])

  const login = (e: any) => {
    e.preventDefault()
    // Simply call the function with email and password
    signIn('test@email.com', 'emailPasswordStrong')
  }

  const showUserDetails = (e: any) => {
    e.preventDefault()
    console.log('n', { userCred })
  }

  const refreshT = (e: any) => {
    e.preventDefault()
    // Manually refresh the token
    refreshToken()
    console.log('n', { userCred })
  }

  const sendRequest = (e: any) => {
    e.preventDefault()
    // Make sure to init Cognito and have the user logged in before calling a protected route
    // The library refreshes the tokens automatically on 401.
    client
      .get('https://your.aws.api/route')
      .then((d) => console.log(d))
      .catch((e) => console.log(e))
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Testing example for cognito-http</h1>
        <div onClick={login}> Login</div>
        <br />
        <div onClick={showUserDetails}>Show user Details</div>
        <br />
        <div onClick={refreshT}> Refresh Token</div>
        <br />
        <div onClick={sendRequest}>Send requests</div>
      </header>
    </div>
  )
}

export default App
