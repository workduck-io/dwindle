import { customAlphabet } from 'nanoid'
import { PersistOptions } from 'zustand/middleware'

import { AuthStoreState } from '../AuthStore/useAuthStore'

const nolookalikes = '346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz'
export const nanoid = customAlphabet(nolookalikes)

export const randomFileName = () => {
  const s = nanoid(20)
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12)
}

export const generateRequestID = () => {
  return `REQUEST_${nanoid(21)}`
}

export const AWSRegion = 'us-east-1'
export const WorkspaceIDsAttrName = 'custom:mex_workspace_ids'

export interface S3UploadOptions {
  bucket?: string
  fileType?: string
  giveCloudFrontURL?: boolean
  parseBase64String?: boolean
  fileName?: string
}

export interface S3DownloadOptions {
  bucket?: string
  fileName: string
}

export interface AWSAttribute {
  Name: string
  Value: string
}

export interface InitCognitoExtraOptions {
  identityPoolID?: string
  CDN_BASE_URL?: string
  zustandPersistOptions?: PersistOptions<AuthStoreState>
}
