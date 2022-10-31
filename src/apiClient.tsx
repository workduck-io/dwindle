import { CognitoUserPool } from 'amazon-cognito-identity-js'
import axios from 'axios'
import { customAlphabet } from 'nanoid'

import useAuthStore, { useFailedRequestStore } from './AuthStore/useAuthStore'
import { processQueue } from './utils/queue'

const client = axios.create()

const nolookalikes = '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz'
const nanoid = customAlphabet(nolookalikes, 21)
const generateRequestID = () => `REQUEST_${nanoid()}`

client.interceptors.request.use((request) => {
  const userCred = useAuthStore.getState().userCred
  if (request && request.headers && userCred && userCred.token) {
    request.headers['Authorization'] = `Bearer ${userCred.token}`
    request.headers['wd-request-id'] = request.headers['wd-request-id'] ?? generateRequestID()
  }

  return request
})

const refreshToken = async () => {
  const { userCred, userPool: uPool } = useAuthStore.getState()
  if (userCred) {
    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      const nuser = userPool.getCurrentUser()
      if (!nuser) throw new Error('Session non existant')
      // All aws cognito user pool methods are async, so we need to use await
      return new Promise((resolve, reject) => {
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
  }
}

client.interceptors.response.use(undefined, async (error) => {
  const response = error.response

  if (response) {
    if (response.status === 401 && error.config && !error.config.__isRetryRequest) {
      // checking isRefreshTokenInProgress to prevent multiple refresh token calls
      if (useFailedRequestStore.getState().isRefreshing) {
        try {
          await new Promise((resolve, reject) => {
            useFailedRequestStore.getState().addFailedRequest({ resolve, reject })
          })
          return client(error.config)
        } catch (error) {
          console.error('REFRESH TOKEN ERROR', error)
        }
      }

      useFailedRequestStore.getState().setIsRefreshing(true)
      await refreshToken()
      error.config.__isRetryRequest = true
      return client(error.config)
    }
  }

  return Promise.reject(error)
})

export default client
