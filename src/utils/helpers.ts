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
  public?: boolean
}

export interface S3DeleteOptions {
  bucket?: string
  fileName?: string
  public?: boolean
}

export interface S3DownloadOptions {
  fileName: string
  bucket?: string
  public?: boolean
}

export interface AWSAttribute {
  Name: string
  Value: string
}

export interface InitCognitoExtraOptions {
  identityPoolID?: string
  CDN_BASE_URL?: string
  publicS3LambdaUrl?: string
  zustandPersistOptions?: PersistOptions<AuthStoreState>
}
