import {
  CognitoUserPool,
  CognitoUserAttribute,
  //CognitoUser,
  ICognitoUserPoolData,
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'
import useAuthStore from '../AuthStore/useAuthStore'
import { useEffect } from 'react'
import axios from 'axios'

const AWSRegion = 'us-east-1'

function wrapErr<T>(f: (result: T) => void) {
  return (err: any, result: T) => {
    if (err) {
      console.error({ error: JSON.stringify(err) })
      return
    } else f(result)
  }
}

const useAuth = () => {
  const uPool = useAuthStore((store) => store.userPool)
  const setUserPool = useAuthStore((store) => store.setUserPool)

  const setUser = useAuthStore((store) => store.setUser)
  // Needs to handle automatic refreshSession
  const setUserCred = useAuthStore((store) => store.setUserCred)
  const userCred = useAuthStore((store) => store.userCred)

  const initCognito = (poolData: ICognitoUserPoolData) => {
    setUserPool(poolData)
    // init with pool
    // fetch user from localStorage
    // refresh login token if necessary
  }

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000)
    if (userCred) {
      if (userCred.expiry < now) refreshToken()
    }
  }, [userCred])

  const signIn = (email: string, password: string) => {
    const authData = {
      Username: email,
      Password: password,
    }
    const authDetails = new AuthenticationDetails(authData)

    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      const user = new CognitoUser({ Username: email, Pool: userPool })
      user.authenticateUser(authDetails, {
        onSuccess: function (result) {
          const accessToken = result.getAccessToken().getJwtToken()
          const expiry = result.getAccessToken().getExpiration()

          //POTENTIAL: Region needs to be set if not already set previously elsewhere.
          //AWS.config.region = '<region>'
          //
          setUserCred({
            email: email,
            expiry,
            token: accessToken,
            url: `cognito-idp.${AWSRegion}.amazonaws.com/${userPool.getUserPoolId()}`,
          })

          /* AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: '...', // your identity pool id here
            Logins: {
              // Change the key below according to the specific region your user pool is in.
              'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>': result.getIdToken().getJwtToken(),
            },
          }) */
        },

        onFailure: function (err) {
          alert(err.message || JSON.stringify(err))
        },
      })
    }
  }

  const getClient = () => {
    const API = axios.create()

    API.interceptors.request.use((request) => {
      if (request && request.headers && userCred && userCred.token) {
        request.headers['Authorization'] = `Bearer ${userCred.token}`
      }

      return request
    })

    API.interceptors.response.use(undefined, async (error) => {
      const response = error.response

      if (response) {
        if (response.status === 401 && error.config && !error.config.__isRetryRequest) {
          try {
            refreshToken()
          } catch (authError) {
            // refreshing has failed, but report the original error, i.e. 401
            return Promise.reject(error)
          }

          // retry the original request
          error.config.__isRetryRequest = true
          return API(error.config)
        }
      }

      return Promise.reject(error)
    })
    return API
  }

  const refreshToken = () => {
    if (userCred) {
      if (uPool) {
        const userPool = new CognitoUserPool(uPool)
        const nuser = new CognitoUser({ Username: userCred.email, Pool: userPool })
        nuser.getSession(
          wrapErr((sess: CognitoUserSession) => {
            if (sess) {
              const refreshToken = sess.getRefreshToken()
              nuser.refreshSession(refreshToken, (err, session) => {
                if (err) {
                  console.log(err)
                } else {
                  const token = session.getAccessToken().getJwtToken()
                  const expiry = session.getAccessToken().getExpiration()
                  setUserCred({ email: userCred.email, url: userCred.url, token, expiry })
                }
              })
            }
          })
        )
      }
    }
  }

  const getConfig = () => {
    if (userCred) {
      return {
        headers: { Authorization: `Bearer ${userCred.token}` },
      }
    }
    return undefined
  }

  const signUp = (email: string, password: string) => {
    const attributeEmail = new CognitoUserAttribute({ Name: 'email', Value: email })
    const attributeList = [attributeEmail]
    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      userPool.signUp(
        email,
        password,
        attributeList,
        [],
        wrapErr((result) => {
          if (result) {
            const cognitoUser = result.user
            setUser(cognitoUser)
          }
        })
      )
    }
  }

  const verifySignUp = () => {
    /* if (user) {
      user.confirmRegistration(
        code,
        true,
        wrapErr((result) => {
          if (result) {
            console.log({ result })
          }
        })
      )
    } */
  }

  const resendCode = () => {
    //if (user) user.resendConfirmationCode(wrapErr((result) => console.log({ result })))
  }

  const forgotPassword = () => {}
  const verifyForgotPassword = () => {}
  const getUserDetails = () => {}

  const changePassword = () => {
    /*if (user)
      user.changePassword(
        oldPassword,
        newPassword,
        wrapErr((result) => console.log({ result }))
      ) */
  }

  const signOut = () => {}

  return {
    initCognito,
    signIn,
    signUp,
    verifySignUp,
    resendCode,
    forgotPassword,
    verifyForgotPassword,
    getUserDetails,
    changePassword,
    signOut,
    refreshToken,
    userCred,
    getConfig,
    getClient,
  }
}

export default useAuth
