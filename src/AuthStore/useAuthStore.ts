import {
  // CognitoUser,
  ICognitoUserPoolData,
} from 'amazon-cognito-identity-js'
import create from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserCred {
  email: string
  userId: string
  token: string
  expiry: number
  url: string
  username: string
}

export interface AuthStoreState {
  userPool: ICognitoUserPoolData | undefined
  setUserPool: (userPool: ICognitoUserPoolData) => void

  email: string | undefined

  // Removed `user` state because of all stores being copied inside of it
  // See: https://linear.app/workduck-io/issue/WD-1427/[bug]-dwindle-fills-up-localstorage-on-incomplete-register
  // user: CognitoUser | undefined
  // setUser: (userPool: CognitoUser) => void
  userCred: UserCred | undefined
  getUserCred: () => UserCred | undefined
  setUserCred: (userCred: UserCred) => void
  setEmail: (email: string) => void

  clearStore: () => void
}

const useAuthStore = create<AuthStoreState>(
  persist(
    (set, get) => ({
      userPool: undefined,
      // user: undefined,
      userCred: undefined,

      email: undefined,

      setUserPool: (userPool) => set({ userPool }),
      // setUser: (user) => set({ user }),
      setEmail: (email) => set({ email }),
      getUserCred: () => {
        const uCred = get().userCred
        return uCred
      },
      setUserCred: (userCred) => {
        set({ userCred })
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

export default useAuthStore
