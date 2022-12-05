import { CognitoUserPool } from 'amazon-cognito-identity-js'
import ky, { AfterResponseHook, BeforeRequestHook } from 'ky'
import { customAlphabet } from 'nanoid'

import useAuthStore, { useFailedRequestStore } from './AuthStore/useAuthStore'
import { processQueue } from './utils/queue'

const nolookalikes = '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz'
const nanoid = customAlphabet(nolookalikes, 21)
const generateRequestID = () => `REQUEST_${nanoid()}`

const refreshToken = async () => {
  const { userCred, userPool: uPool } = useAuthStore.getState()
  if (userCred) {
    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      const nuser = userPool.getCurrentUser()
      if (!nuser) throw new Error('Session non existant')
      // All aws cognito user pool methods are async, so we need to use await
      return new Promise((resolve, reject) => {
        useFailedRequestStore.setState({
          isRefreshing: false,
        })
        nuser.getSession((err: any, session: any) => {
          if (err) reject(err)
          const token = session.getIdToken().getJwtToken()
          const payload = session.getIdToken().payload
          const expiry = session.getIdToken().getExpiration()
          useAuthStore.setState({
            userCred: {
              email: userCred.email,
              username: userCred.username,
              url: userCred.url,
              token,
              expiry,
              userId: payload.sub,
            },
          })
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
          resolve(session)
        })
      })
    }
  } else {
    throw new Error('No userCred Found')
  }
}

const attachTokenHook: BeforeRequestHook = (request) => {
  const userCred = useAuthStore.getState().userCred
  if (request && request.headers && userCred && userCred.token) {
    request.headers.set('Authorization', `Bearer ${userCred.token}`)
    request.headers.set('wd-request-id', request.headers['wd-request-id'] ?? generateRequestID())
  }
}

const refreshTokenHook: AfterResponseHook = async (request, _, response) => {
  if (response && response.status === 401) {
    if (useFailedRequestStore.getState().isRefreshing) {
      try {
        await new Promise((resolve, reject) => {
          useFailedRequestStore.getState().addFailedRequest({ resolve, reject })
        })
        return kyClient(request)
      } catch (error) {
        throw new Error(error)
      }
    }
    try {
      useFailedRequestStore.getState().setIsRefreshing(true)
      await refreshToken()
      return kyClient(request)
    } catch (error) {
      throw new Error(error)
    }
  }
  return
}

const kyClient = ky.create({
  hooks: {
    beforeRequest: [attachTokenHook],
    afterResponse: [refreshTokenHook],
  },
  retry: 0,
})

export default kyClient
