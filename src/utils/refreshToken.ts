import { CognitoUserPool } from 'amazon-cognito-identity-js'

import useAuthStore, { useFailedRequestStore } from '../AuthStore/useAuthStore'
import { processQueue } from './queue'

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

export default refreshToken
