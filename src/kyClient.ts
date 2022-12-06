import ky, { AfterResponseHook, BeforeRequestHook, KyResponse, type Options } from 'ky'
import { type KyInstance } from 'ky/distribution/types/ky'

import useAuthStore, { useFailedRequestStore } from './AuthStore/useAuthStore'
import { DEFAULT_CACHE_EXPIRY, MEX_WORKSPACE_ID } from './utils/constants'
import { fastHash } from './utils/fastHash'
import { generateRequestID } from './utils/helpers'
import refreshToken from './utils/refreshToken'

const getData = async <T>(item: KyResponse) => await item.json<T>()

class KYClient {
  private _client: KyInstance
  private _workspaceID: string
  private _urlHash: Record<string, number>

  constructor(kyOptions?: Options, kyClient?: KyInstance) {
    if (kyClient) this._client = kyClient
    else {
      this._client = ky.create({
        ...(kyOptions ?? {}),
        hooks: {
          beforeRequest: [this._attachTokenHook, this._attachWorkspaceIDHook],
          afterResponse: [this._refreshTokenHook],
        },
        retry: 0,
      })
    }
    this._urlHash = {}
  }

  setWorkspaceHeader(workspaceID: string) {
    this._workspaceID = workspaceID
  }

  async get<T = any>(url: string, config) {
    const key = `HASH_${fastHash(url)}`
    if (
      config?.cache &&
      key in this._urlHash &&
      Date.now() - this._urlHash[key] < (config.cache.expiry ?? DEFAULT_CACHE_EXPIRY)
    ) {
      return
    } else {
      const item = await this._client.get(url, config)
      if (config?.cache) {
        this._urlHash[key] = Date.now()
      }
      return await getData<T>(item)
    }
  }

  async post<T = any>(url: string, data, config?) {
    const item = await this._client.post(url, {
      ...config,
      json: data,
    })
    return await getData<T>(item)
  }

  async patch<T = any>(url: string, data?, config?) {
    const item = await this._client.patch(url, {
      ...config,
      json: data,
    })
    return await getData<T>(item)
  }

  async delete<T = any>(url: string, config?) {
    const item = await this._client.delete(url, config)
    return await getData<T>(item)
  }

  async put<T = any>(url: string, data, config?) {
    const item = await this._client.put(url, {
      ...config,
      json: data,
    })
    return await getData<T>(item)
  }

  private _attachTokenHook: BeforeRequestHook = (request) => {
    const userCred = useAuthStore.getState().userCred
    if (request && request.headers && userCred && userCred.token) {
      request.headers.set('Authorization', `Bearer ${userCred.token}`)
      request.headers.set('wd-request-id', request.headers['wd-request-id'] ?? generateRequestID())
    }
  }

  private _attachWorkspaceIDHook: BeforeRequestHook = (request) => {
    if (request && request.headers && this._workspaceID) request.headers.set(MEX_WORKSPACE_ID, this._workspaceID)
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
