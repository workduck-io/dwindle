import {
  CognitoUserPool,
  CognitoUserAttribute,
  //CognitoUser,
  ICognitoUserPoolData,
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'
import useAuthStore, { UserCred } from '../AuthStore/useAuthStore'
import { useEffect } from 'react'

const AWSRegion = 'us-east-1'

export function wrapErr<T>(f: (result: T) => void) {
  return (err: any, result: T) => {
    if (err) {
      console.error({ error: JSON.stringify(err) })
      return
    } else f(result)
  }
}

const useAuth = () => {
  const uPool = useAuthStore((store) => store.userPool)
  const email = useAuthStore((store) => store.email)
  const setUserPool = useAuthStore((store) => store.setUserPool)

  const setUser = useAuthStore((store) => store.setUser)
  const setEmail = useAuthStore((store) => store.setEmail)
  // Needs to handle automatic refreshSession
  const setUserCred = useAuthStore((store) => store.setUserCred)
  const userCred = useAuthStore((store) => store.userCred)
  const clearStore = useAuthStore((store) => store.clearStore)

  const initCognito = (poolData: ICognitoUserPoolData) => {
    setUserPool(poolData)
  }

  // Handles refreshing of the token on every update of UserCred
  // client also refreshes the token if a request returns 401
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000)
    if (userCred) {
      if (userCred.expiry < now) refreshToken()
    }
  }, [userCred])

  const signIn = (email: string, password: string): Promise<UserCred> => {
    return new Promise((resolve, reject) => {
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

            const nUCred = {
              email: email,
              expiry,
              token: accessToken,
              url: `cognito-idp.${AWSRegion}.amazonaws.com/${userPool.getUserPoolId()}`,
            }

            setUserCred(nUCred)
            resolve(nUCred)
          },

          onFailure: function (err) {
            reject(err.message || JSON.stringify(err))
          },
        })
      }
    })
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

  const signUp = (email: string, password: string): Promise<{ email: string }> => {
    return new Promise((resolve, reject) => {
      const attributeEmail = new CognitoUserAttribute({ Name: 'email', Value: email })
      const attributeList = [attributeEmail]
      if (uPool) {
        const userPool = new CognitoUserPool(uPool)
        userPool.signUp(email, password, attributeList, [], (err, result) => {
          if (err) {
            reject(err)
          }
          if (result) {
            const cognitoUser = result.user
            setEmail(email)
            setUser(cognitoUser)
            resolve({ email })
          }
        })
      }
    })
  }

  const verifySignUp = (code: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (email) {
        if (uPool) {
          const userPool = new CognitoUserPool(uPool)

          const nuser = new CognitoUser({ Username: email, Pool: userPool })
          nuser.confirmRegistration(code, true, (err, result) => {
            if (err) reject('VerifySignUp Failed')
            if (result) {
              console.log({ result })
              resolve(result)
            }
          })
        }
      }
    })
  }

  const resendCode = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (email) {
        if (uPool && userCred) {
          const userPool = new CognitoUserPool(uPool)

          const nuser = new CognitoUser({ Username: userCred.email, Pool: userPool })
          nuser.resendConfirmationCode((err, result) => {
            if (err) reject(err)
            if (result) {
              console.log({ result })
              resolve('sent successfully')
            }
          })
        }
      }
    })
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

  const signOut = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        if (uPool && userCred) {
          const userPool = new CognitoUserPool(uPool)
          const nuser = new CognitoUser({ Username: userCred.email, Pool: userPool })
          nuser.signOut(() => {
            clearStore()
            resolve('Signout Successful')
          })
        }
      } catch {
        reject('Signout Failed')
      }
    })
  }

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
  }
}

export default useAuth
