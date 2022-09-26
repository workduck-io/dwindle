import { CognitoUserPool } from 'amazon-cognito-identity-js'
import axios from 'axios'
import { customAlphabet } from 'nanoid'

import useAuthStore from './AuthStore/useAuthStore'

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
  console.log('INTERCEPTOR', { userCred, uPool })
  if (userCred) {
    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      const nuser = userPool.getCurrentUser()!
      if (!nuser) throw new Error('Session non existant')
      // All aws cognito user pool methods are async, so we need to use await
      await new Promise((resolve, reject) => {
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
      try {
        await refreshToken()
      } catch (authError) {
        // refreshing has failed, but report the original error, i.e. 401
        return Promise.reject(error)
      }

      // retry the original request
      error.config.__isRetryRequest = true
      return client(error.config)
    }
  }

  return Promise.reject(error)
})

export default client
