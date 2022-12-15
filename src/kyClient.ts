import ky, { AfterResponseHook, BeforeRequestHook, KyResponse, type Options } from 'ky'
import { type KyInstance } from 'ky/distribution/types/ky'

import useAuthStore, { useFailedRequestStore } from './AuthStore/useAuthStore'
import { DEFAULT_CACHE_EXPIRY, MEX_WORKSPACE_ID } from './utils/constants'
import { fastHash } from './utils/fastHash'
import { generateRequestID } from './utils/helpers'
import refreshToken from './utils/refreshToken'

const getData = async <T>(item: KyResponse) => await item.json<T>()

export interface CacheConfig {
  enabled: boolean
  expiry: number
}

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
          beforeRequest: [this._attachTokenAndRequestIDHook, this._attachWorkspaceIDHook],
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

  async get<T = any>(url: string, cacheConfig?: CacheConfig, options?: Options) {
    const key = `HASH_${fastHash(url)}`
    if (
      cacheConfig?.enabled &&
      key in this._urlHash &&
      Date.now() - this._urlHash[key] < (cacheConfig.expiry ?? DEFAULT_CACHE_EXPIRY)
    ) {
      return
    } else {
      const item = await this._client.get(url, options)
      if (cacheConfig?.enabled) {
        this._urlHash[key] = Date.now()
      }
      return await getData<T>(item)
    }
  }

  async post<T = any>(url: string, data?: any, options?: Options) {
    const item = await this._client.post(url, {
      ...options,
      json: data,
    })
    if (item.status === 204) return
    return await getData<T>(item)
  }

  async patch<T = any>(url: string, data?: any, options?: Options) {
    const item = await this._client.patch(url, {
      ...options,
      json: data,
    })
    if (item.status === 204) return
    return await getData<T>(item)
  }

  async delete<T = any>(url: string, data?: any, options?: Options) {
    const item = await this._client.delete(url, {
      ...options,
      json: data,
    })
    if (item.status === 204) return
    return await getData<T>(item)
  }

  async put<T = any>(url: string, data?: any, options?: Options) {
    const item = await this._client.put(url, {
      ...options,
      json: data,
    })
    if (item.status === 204) return
    return await getData<T>(item)
  }

  private _attachTokenAndRequestIDHook: BeforeRequestHook = (request) => {
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
      console.log('Inside refresh token hook', {
        isRefreshing: useFailedRequestStore.getState().isRefreshing,
        failedRequests: useFailedRequestStore.getState().failedRequests,
      })

      if (useFailedRequestStore.getState().isRefreshing) {
        try {
          useFailedRequestStore.getState().addFailedRequest(request)
          return response
        } catch (error) {
          throw new Error(error)
        }
      }
      try {
        useFailedRequestStore.getState().setIsRefreshing(true)
        await refreshToken()
        useFailedRequestStore.getState().setIsRefreshing(false)
        useFailedRequestStore.getState().retryFailedRequests(this._client)
        return this._client(request)
      } catch (error) {
        throw new Error(error)
      }
    }
    return
  }
}

export default KYClient
