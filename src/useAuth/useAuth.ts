import {
  CognitoUserPool,
  CognitoUserAttribute,
  //CognitoUser,
  ICognitoUserPoolData,
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
  ClientMetadata,
} from 'amazon-cognito-identity-js'
import useAuthStore, { UserCred } from '../AuthStore/useAuthStore'
import { useEffect } from 'react'
import jwtDecode from 'jwt-decode'
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
    if (userCred) {
      return userCred.email
    }
    return
  }

  // Handles refreshing of the token on every update of UserCred
  // client also refreshes the token if a request returns 401
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000)
    if (userCred) {
      if (userCred.expiry < now) refreshToken()
    }
  }, [userCred])

  const googleSignIn = (idToken: string, accessToken: string) => {
    return new Promise((resolve, reject) => {
      try {
        const decodedIdToken: any = jwtDecode(idToken)

        const nUCred = {
          email: decodedIdToken.email,
          userId: decodedIdToken.sub,
          expiry: decodedIdToken.exp,
          token: accessToken,
          url: decodedIdToken.iss,
        }
        setUserCred(nUCred)
        resolve(nUCred)
      } catch (error) {
        reject(error.message || JSON.stringify(error))
      }
    })
  }

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
            const idToken = result.getIdToken().getJwtToken()
            // const accessToken = result.getAccessToken().getJwtToken()
            const payload = result.getIdToken().payload
            const expiry = result.getIdToken().getExpiration()

            const nUCred = {
              email: email,
              userId: payload.sub,
              expiry,
              token: idToken,
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
              nuser.refreshSession(refreshToken, (err, session: CognitoUserSession) => {
                if (err) {
                  console.log(err)
                } else {
                  const token = session.getIdToken().getJwtToken()
                  const payload = session.getIdToken().payload
                  const expiry = session.getIdToken().getExpiration()
                  setUserCred({ email: userCred.email, url: userCred.url, token, expiry, userId: payload.sub })
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

  const signUp = (email: string, password: string, customAttributes?: any[]): Promise<string | { email: string }> => {
    return new Promise((resolve, reject) => {
      const attributeEmail = new CognitoUserAttribute({ Name: 'email', Value: email })
      const attributeList = [attributeEmail]

      if (customAttributes !== undefined && customAttributes.length > 0) {
        customAttributes.forEach((item: any) => {
          const name = `custom:${item.name}`
          const value = item.value
          const t = new CognitoUserAttribute({
            Name: name,
            Value: value,
          })
          attributeList.push(t)
        })
      }

      console.log('Attribute List: ', attributeList)

      if (uPool) {
        const userPool = new CognitoUserPool(uPool)
        userPool.signUp(email, password, attributeList, [], (err, result) => {
          if (err) {
            if (err.name === 'UsernameExistsException') {
              setEmail(email)
            }
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

  const verifySignUp = (code: string, metadata?: ClientMetadata): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (email) {
        if (uPool) {
          const userPool = new CognitoUserPool(uPool)

          const nuser = new CognitoUser({ Username: email, Pool: userPool })
          nuser.confirmRegistration(
            code,
            true,
            (err, result) => {
              if (err) {
                reject('VerifySignUp Failed')
              }
              if (result) {
                resolve({ result })
              }
            },
            metadata
          )
        }
      }
    })
  }

  const resendCode = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (email) {
        if (uPool) {
          const userPool = new CognitoUserPool(uPool)

          const nuser = new CognitoUser({ Username: email, Pool: userPool })
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

  const getUserDetails = (): { email: string } | undefined => {
    if (userCred) {
      return { email: userCred.email }
    }
    return
  }

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
    googleSignIn,
  }
}

export default useAuth
