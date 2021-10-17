import useAuth from 'cognito-http'
import React, { useEffect } from 'react'

function App() {
  const { refreshToken, userCred, signIn, initCognito, getConfig, getClient } = useAuth()

  useEffect(() => {
    initCognito({ UserPoolId: 'USER_POOL_ID', ClientId: 'CLIENT_ID' })
  }, [])

  const login = (e: any) => {
    e.preventDefault()
    signIn('test@email.com', 'emailPasswordStrong')
  }

  const refresh = (e: any) => {
    e.preventDefault()
    console.log('n', { userCred })
  }

  const refreshT = (e: any) => {
    e.preventDefault()
    refreshToken()
    console.log('n', { userCred })
  }

  const sendRequest = (e: any) => {
    e.preventDefault()
    const api = getClient()
    api
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
        <div onClick={refresh}> Refresh</div>
        <br />
        <div onClick={refreshT}> Refresh Token</div>
        <br />
        <div onClick={sendRequest}>Send requests</div>
      </header>
    </div>
  )
}

export default App
