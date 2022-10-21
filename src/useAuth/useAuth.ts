import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool as FromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'
import {
  AuthenticationDetails,
  ClientMetadata,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession, //CognitoUser,
  ICognitoUserPoolData,
} from 'amazon-cognito-identity-js'
import axios, { AxiosRequestConfig } from 'axios'
import { Buffer } from 'buffer/'
import jwtDecode from 'jwt-decode'
import { customAlphabet } from 'nanoid'
import qs from 'qs'
import { PersistOptions } from 'zustand/middleware'

import useAuthStore, {
  AuthStoreState,
  IdentityPoolData,
  useFailedRequestStore,
  UserCred,
} from '../AuthStore/useAuthStore'
import { processQueue } from '../utils/queue'

const nolookalikes = '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz'
const nanoid = customAlphabet(nolookalikes, 20)

const randomFileName = () => {
  const s = nanoid()
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12)
}

const AWSRegion = 'us-east-1'
const WorkspaceIDsAttrName = 'custom:mex_workspace_ids'
export interface AWSAttribute {
  Name: string
  Value: string
}

interface InitCognitoExtraOptions {
  identityPoolID?: string
  CDN_BASE_URL?: string
  zustandPersistOptions?: PersistOptions<AuthStoreState>
}

interface S3UploadOptions {
  bucket?: string
  fileType?: string
  giveCloudFrontURL?: boolean
}

export function wrapErr<T>(f: (result: T) => void) {
  return (err: any, result: T) => {
    if (err) {
      return
    } else f(result)
  }
}

const useAuth = () => {
  const uPool = useAuthStore((store) => store.userPool)
  const iPool = useAuthStore((store) => store.iPool)
  const iPoolCreds = useAuthStore((store) => store.iPoolCreds)
  const email = useAuthStore((store) => store.email)
  const setUserPool = useAuthStore((store) => store.setUserPool)
  const setIPool = useAuthStore((store) => store.setIPool)
  const setIPoolCreds = useAuthStore((store) => store.setIPoolCreds)
  // const setUser = useAuthStore((store) => store.setUser)
  const setEmail = useAuthStore((store) => store.setEmail)
  // Needs to handle automatic refreshSession
  const setUserCred = useAuthStore((store) => store.setUserCred)
  const userCred = useAuthStore((store) => store.userCred)
  const getUserCred = useAuthStore((store) => store.getUserCred)
  const clearStore = useAuthStore((store) => store.clearStore)

  const initCognito = (poolData: ICognitoUserPoolData, extraOptions?: InitCognitoExtraOptions) => {
    setUserPool(poolData)
    if (userCred) {
      return userCred.email
    }

    if (extraOptions?.identityPoolID) {
      const iPoolData: IdentityPoolData = {
        identityPoolID: extraOptions.identityPoolID,
        identityProvider: `cognito-idp.${AWSRegion}.amazonaws.com/${poolData.UserPoolId}`,
      }
      if (extraOptions?.CDN_BASE_URL) iPoolData['CDN_BASE_URL'] = extraOptions.CDN_BASE_URL

      setIPool(iPoolData)
    }

    if (extraOptions?.zustandPersistOptions) {
      useAuthStore.persist.setOptions(extraOptions.zustandPersistOptions)
    }

    return
  }

  const googleSignIn = (code: string, clientId: string, redirectURI: string) => {
    return new Promise((resolve, reject) => {
      try {
        const dataPayload = qs.stringify({
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectURI,
          code,
        })
        const config: AxiosRequestConfig<any> = {
          method: 'post',
          url: 'https://workduck.auth.us-east-1.amazoncognito.com/oauth2/token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: 'XSRF-TOKEN=c393745c-a0fa-4858-9777-897c3aff4fbc',
          },
          data: dataPayload,
        }

        axios(config)
          .then(function (response) {
            const tripletTokens: any = response.data
            const decodedIdToken: any = jwtDecode(tripletTokens?.id_token)

            const nUCred = {
              email: decodedIdToken.email,
              userId: decodedIdToken.sub,
              expiry: decodedIdToken.exp,
              token: tripletTokens?.id_token,
              username: decodedIdToken['cognito:username'],
              url: decodedIdToken.iss,
            }

            if (uPool) {
              const userPool = new CognitoUserPool(uPool)
              const nuser = new CognitoUser({ Username: nUCred.username, Pool: userPool })
              const uSession = new CognitoUserSession({
                AccessToken: new CognitoAccessToken({ AccessToken: tripletTokens.access_token }),
                IdToken: new CognitoIdToken({ IdToken: tripletTokens.id_token }),
                RefreshToken: new CognitoRefreshToken({ RefreshToken: tripletTokens.refresh_token }),
              })

              nuser.setSignInUserSession(uSession)
            }

            setUserCred(nUCred)
            refreshIdentityPoolCreds(nUCred.token)

            resolve({
              userCred: nUCred,
              tokens: tripletTokens,
            })
          })
          .catch(function (error) {
            reject(error.message || JSON.stringify(error))
          })
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
              username: email,
              userId: payload.sub,
              expiry,
              token: idToken,
              url: `cognito-idp.${AWSRegion}.amazonaws.com/${userPool.getUserPoolId()}`,
            }

            setUserCred(nUCred)
            refreshIdentityPoolCreds(nUCred.token)
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
    return new Promise<any>((resolve, reject) => {
      const userCred = getUserCred()
      const uPool = useAuthStore.getState().userPool
      if (userCred) {
        if (uPool) {
          const userPool = new CognitoUserPool(uPool)
          const nuser = userPool.getCurrentUser()!
          if (!nuser) reject('User session does not exist')

          nuser.getSession(async (err: any, session: any) => {
            if (err) reject(err)
            const refreshToken_ = session.getRefreshToken()
            await new Promise((resolve, reject) => {
              nuser.refreshSession(refreshToken_, (err: any, session: any) => {
                if (err) reject(err)
                const token = session.getIdToken().getJwtToken()
                const payload = session.getIdToken().payload
                const expiry = session.getIdToken().getExpiration()

                const nUCred = {
                  email: userCred.email,
                  username: userCred.username,
                  url: userCred.url,
                  token,
                  expiry,
                  userId: payload.sub,
                }
                useFailedRequestStore.setState({
                  isRefreshing: false,
                })
                processQueue(null, {
                  userCred: {
                    email: userCred.email,
                    username: userCred.username,
                    url: userCred.url,
                    token,
                    expiry,
                    userId: payload.sub,
                  },
                })
                setUserCred(nUCred)
                refreshIdentityPoolCreds(nUCred.token)
                resolve(nUCred)
              })
            })

            resolve(session)
          })
        } else reject('Not in user pool')
      } else reject(`Could not refresh. uCred: ${userCred} | uPool: ${uPool}`)
    })
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
            // const cognitoUser = result.user
            setEmail(email)
            // setUser(cognitoUser)
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
              resolve('sent successfully')
            }
          })
        }
      }
    })
  }

  const forgotPassword = (email: string) => {
    return new Promise((resolve, reject) => {
      if (uPool) {
        setEmail(email)
        const cognitoUser = new CognitoUser({
          Username: email,
          Pool: new CognitoUserPool(uPool),
        })

        // call forgotPassword on cognitoUser
        cognitoUser.forgotPassword({
          onSuccess: function (result) {
            resolve(result)
          },
          onFailure: function (err) {
            reject(err)
          },
        })
      }
    })
  }

  const verifyForgotPassword = (verificationCode: string, newPassword: string) => {
    return new Promise((resolve, reject) => {
      if (email) {
        if (uPool) {
          const cognitoUser = new CognitoUser({
            Username: email,
            Pool: new CognitoUserPool(uPool),
          })
          cognitoUser.confirmPassword(verificationCode, newPassword, {
            onFailure(err) {
              reject(err)
            },
            onSuccess(res) {
              resolve(res)
            },
          })
        }
      }
    })
  }

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
          const nuser = new CognitoUser({ Username: userCred.username, Pool: userPool })
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

  const updateUserAttributes = (attributes: AWSAttribute[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        if (userCred) {
          if (uPool) {
            const userPool = new CognitoUserPool(uPool)
            const nuser = new CognitoUser({ Username: userCred.username, Pool: userPool })
            nuser.getSession(
              wrapErr((sess: CognitoUserSession) => {
                const attrs = attributes.map((attribute) => {
                  if (!attribute.Name.startsWith('custom:')) attribute.Name = `custom:${attribute.Name}`

                  if (attribute.Name === WorkspaceIDsAttrName)
                    reject('To update workspace Id, use the userAddWorkspace method ')

                  return new CognitoUserAttribute(attribute)
                })

                if (sess) {
                  nuser.updateAttributes(attrs, (err, result) => {
                    if (err) throw new Error(err.message)
                    resolve(result)
                  })
                }
              })
            )
          }
        }
        resolve(attributes)
      } catch (error) {
        reject(error)
      }
    })
  }

  const userAddWorkspace = (workspaceId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        if (userCred) {
          if (uPool) {
            const userPool = new CognitoUserPool(uPool)
            const nuser = new CognitoUser({ Username: userCred.username, Pool: userPool })
            nuser.getSession(
              wrapErr((sess: CognitoUserSession) => {
                nuser.getUserAttributes((err, result) => {
                  if (err) reject(`Error: ${err.message}`)

                  result?.forEach((attr) => {
                    if (attr.Name === WorkspaceIDsAttrName) {
                      const newWorkspaceIDs = `${attr.Value}#${workspaceId}`
                      const t = new CognitoUserAttribute({
                        Name: WorkspaceIDsAttrName,
                        Value: newWorkspaceIDs,
                      })
                      nuser.updateAttributes([t], (err, result) => {
                        if (err) reject(`Error: ${err.message}`)
                        resolve('WorkspaceID Added Successfully')
                      })
                    }
                  })
                })
              })
            )
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  const refreshIdentityPoolCreds = async (token: string): Promise<void> => {
    try {
      if (iPool && token) {
        const identityClient = new CognitoIdentityClient({
          region: AWSRegion,
        })
        const creds = FromCognitoIdentityPool({
          client: identityClient,
          identityPoolId: iPool.identityPoolID,
          logins: {
            [iPool.identityProvider]: token,
          },
        })

        const credentials = await creds()
        setIPoolCreds(credentials)
      }
    } catch (error) {
      console.log('Error while refreshing iPool creds: ', error)
    }
  }

  const uploadImageToS3 = async (base64string: string, options?: S3UploadOptions): Promise<string> => {
    options = { bucket: 'workduck-app-files', fileType: 'image/jpeg', giveCloudFrontURL: true, ...options }
    const creds = useAuthStore.getState().iPoolCreds
    const s3Client = new S3Client({
      region: AWSRegion,
      credentials: creds,
    })
    const parsedImage = base64string.split(',')[1]
    const buffer = Buffer.from(parsedImage, 'base64')

    const filePath = `public/${randomFileName()}`
    await s3Client
      .send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: filePath,
          Body: buffer,
          ContentType: options.fileType,
        })
      )
      .catch((error) => {
        throw new Error(`Could not upload image to S3: ${error}`)
      })

    const url =
      options.giveCloudFrontURL && iPool?.CDN_BASE_URL
        ? `${iPool.CDN_BASE_URL}/${filePath}`
        : `https://${options.bucket}.s3.amazonaws.com/${filePath}`

    return url
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
    updateUserAttributes,
    userAddWorkspace,
    refreshIdentityPoolCreds,
    uploadImageToS3,
  }
}

export default useAuth
