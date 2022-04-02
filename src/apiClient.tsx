import { CognitoUser, CognitoUserPool, CognitoUserSession } from 'amazon-cognito-identity-js'
import axios from 'axios'
import useAuthStore from './AuthStore/useAuthStore'
import { wrapErr } from './useAuth/useAuth'

const client = axios.create()

client.interceptors.request.use((request) => {
  const userCred = useAuthStore.getState().userCred
  if (request && request.headers && userCred && userCred.token) {
    request.headers['Authorization'] = `Bearer ${userCred.token}`
  }

  return request
})

const refreshToken = () => {
  const { userCred, userPool: uPool } = useAuthStore.getState()
  if (userCred) {
    if (uPool) {
      const userPool = new CognitoUserPool(uPool)
      const nuser = new CognitoUser({ Username: userCred.username, Pool: userPool })

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
              }
            })
          }
        })
      )
    }
  }
}

client.interceptors.response.use(undefined, async (error) => {
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
      return client(error.config)
    }
  }

  return Promise.reject(error)
})

export default client
