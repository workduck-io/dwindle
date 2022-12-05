import { CognitoUserPool } from 'amazon-cognito-identity-js'
import ky, { AfterResponseHook, BeforeRequestHook } from 'ky'
import { type KyInstance } from 'ky/distribution/types/ky'

import useAuthStore, { useFailedRequestStore } from './AuthStore/useAuthStore'
import { generateRequestID } from './utils/helpers'
import { processQueue } from './utils/queue'

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

let KYClientInstance: KYClient

interface KYClientOptions {
  workspaceID: string
}

class KYClient {
  private _client: KyInstance
  private _options: KYClientOptions

  constructor() {
    if (KYClientInstance) {
      throw new Error('New instance cannot be created!!')
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    KYClientInstance = this
  }

  init(options: KYClientOptions) {
    this._client = ky.create({
      hooks: {
        beforeRequest: [this._attachTokenHook, this._attachWorkspaceIDHook],
        afterResponse: [this._refreshTokenHook],
      },
      retry: 0,
    })

    if (options) this._options = options
    return this._client
  }

  setWorkspaceHeader(workspaceID: string) {
    this._options.workspaceID = workspaceID
  }

  private _attachTokenHook: BeforeRequestHook = (request) => {
    const userCred = useAuthStore.getState().userCred
    if (request && request.headers && userCred && userCred.token) {
      request.headers.set('Authorization', `Bearer ${userCred.token}`)
      request.headers.set('wd-request-id', request.headers['wd-request-id'] ?? generateRequestID())
    }
  }

  private _attachWorkspaceIDHook: BeforeRequestHook = (request) => {
    if (request && request.headers && KYClientInstance._options.workspaceID)
      request.headers.set('mex-workspace-id', this._options.workspaceID)
  }

  private _refreshTokenHook: AfterResponseHook = async (request, _, response) => {
    if (response && response.status === 401) {
      if (useFailedRequestStore.getState().isRefreshing) {
        try {
          await new Promise((resolve, reject) => {
            useFailedRequestStore.getState().addFailedRequest({ resolve, reject })
          })
          return this._client(request)
        } catch (error) {
          throw new Error(error)
        }
      }
      try {
        useFailedRequestStore.getState().setIsRefreshing(true)
        await refreshToken()
        return this._client(request)
      } catch (error) {
        throw new Error(error)
      }
    }
    return
  }
}

export default KYClient
