import { CognitoUser, ICognitoUserPoolData } from 'amazon-cognito-identity-js'
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

  user: CognitoUser | undefined
  setUser: (userPool: CognitoUser) => void
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
      user: undefined,
      userCred: undefined,

      email: undefined,

      setUserPool: (userPool) => set({ userPool }),
      setUser: (user) => set({ user }),
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
          user: undefined,
          userCred: undefined,
          email: undefined,
        }),
    }),
    { name: 'auth-aws' }
  )
)

export default useAuthStore
