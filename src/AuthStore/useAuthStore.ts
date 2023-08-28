import { CognitoIdentityCredentials } from '@aws-sdk/credential-provider-cognito-identity'
import { ICognitoUserPoolData } from 'amazon-cognito-identity-js'
import { type KyInstance } from 'ky/distribution/types/ky'
import create, { GetState, SetState } from 'zustand'
import { StoreApiWithPersist, persist } from 'zustand/middleware'

export interface UserCred {
  email: string
  userId: string
  token: string
  expiry: number
  url: string
  username: string
  refresh_token: string
}

export interface IdentityPoolData {
  identityPoolID: string
  identityProvider: string
  CDN_BASE_URL?: string
}

export interface AuthStoreState {
  userPool: ICognitoUserPoolData | undefined
  iPool: IdentityPoolData | undefined
  iPoolCreds: CognitoIdentityCredentials | undefined
  setUserPool: (userPool: ICognitoUserPoolData) => void
  setIPool: (iPoolData: IdentityPoolData) => void
  setIPoolCreds: (iPoolCreds: CognitoIdentityCredentials) => void
  email: string | undefined
  publicS3LambdaUrl?: string

  // Removed `user` state because of all stores being copied inside of it
  // See: https://linear.app/workduck-io/issue/WD-1427/[bug]-dwindle-fills-up-localstorage-on-incomplete-register
  // user: CognitoUser | undefined
  // setUser: (userPool: CognitoUser) => void
  userCred: UserCred | undefined
  getUserCred: () => UserCred | undefined
  setUserCred: (userCred: UserCred) => void
  setPublicS3LambdaUrl: (publicS3LambdaUrl: string) => void
  setEmail: (email: string) => void

  clearStore: () => void
}

export interface FailedRequestState {
  // Handling failed requests
  failedRequests: Array<any>
  setFailedRequests: (failedRequests: Array<any>) => void
  addFailedRequest: (failedRequest: any) => void
  retryFailedRequests: (client: KyInstance) => void
  isRefreshing: boolean
  setIsRefreshing: (isRefreshing: boolean) => void
  clearStore: () => void
}

const useAuthStore = create<
  AuthStoreState,
  SetState<AuthStoreState>,
  GetState<AuthStoreState>,
  StoreApiWithPersist<AuthStoreState>
>(
  persist(
    (set, get) => ({
      userPool: undefined,
      iPool: undefined,
      iPoolCreds: undefined,
      // user: undefined,
      userCred: undefined,

      email: undefined,
      publicS3LambdaUrl: undefined,

      setUserPool: (userPool) => set({ userPool }),
      setPublicS3LambdaUrl: (publicS3LambdaUrl) => set({ publicS3LambdaUrl }),
      setIPool: (iPool) => set({ iPool }),
      // setUser: (user) => set({ user }),
      setEmail: (email) => set({ email }),
      getUserCred: () => {
        const uCred = get().userCred
        return uCred
      },
      setUserCred: (userCred) => {
        set({ userCred })
      },
      setIPoolCreds: (iPoolCreds) => {
        set({ iPoolCreds })
      },
      clearStore: () =>
        set({
          // user: undefined,
          userCred: undefined,
          email: undefined,
        }),
    }),
    { name: 'auth-aws' }
  )
)

export const useFailedRequestStore = create<FailedRequestState>((set, get) => ({
  // failed requests handling
  failedRequests: [],
  isRefreshing: false,
  setFailedRequests: (failedRequests: Array<any>) => set({ failedRequests }),
  addFailedRequest: (failedRequest: any) =>
    set((state) => ({
      failedRequests: [...state.failedRequests, failedRequest],
    })),
  setIsRefreshing: (isRefreshing: boolean) => set({ isRefreshing }),
  retryFailedRequests: (client: KyInstance) => {
    get().failedRequests.forEach((requestConfig) => {
      client(requestConfig)
    })
    set((state) => ({
      failedRequests: [],
    }))
  },
  clearStore: () => {
    set({ failedRequests: [], isRefreshing: false })
  },
}))

export default useAuthStore
