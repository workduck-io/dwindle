import { CognitoUser, ICognitoUserPoolData } from 'amazon-cognito-identity-js'
import create from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserCred {
  email: string
  token: string
  expiry: number
  url: string
}

export interface AuthStoreState {
  userPool: ICognitoUserPoolData | undefined
  setUserPool: (userPool: ICognitoUserPoolData) => void

  user: CognitoUser | undefined
  setUser: (userPool: CognitoUser) => void
  userCred: UserCred | undefined
  setUserCred: (userCred: UserCred) => void
}

const useAuthStore = create<AuthStoreState>(
  persist(
    (set) => ({
      userPool: undefined,
      user: undefined,
      userCred: undefined,

      setUserPool: (userPool) => set({ userPool }),
      setUser: (user) => set({ user }),
      setUserCred: (userCred) => set({ userCred }),
    }),
    { name: 'auth-aws' }
  )
)

export default useAuthStore
