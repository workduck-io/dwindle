import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  CognitoIdentityCredentials,
  fromCognitoIdentityPool as FromCognitoIdentityPool,
} from '@aws-sdk/credential-provider-cognito-identity'

import useAuthStore from './AuthStore/useAuthStore'
import { S3UploadOptions, AWSRegion, randomFileName } from './utils/helpers'

const refreshIdentityPoolCreds = async (token: string): Promise<CognitoIdentityCredentials | undefined> => {
  try {
    const iPool = useAuthStore.getState().iPool
    if (iPool && token) {
      const identityClient = new CognitoIdentityClient({
        region: AWSRegion,
      })
      const creds = FromCognitoIdentityPool({
        client: identityClient,
        identityPoolId: iPool.identityPoolID,
        logins: {
          [iPool.identityProvider]: token,
        },
      })

      const credentials = await creds()
      useAuthStore.getState().setIPoolCreds(credentials)
      return credentials
    } else {
      throw new Error('Token or iPool Not Found')
    }
  } catch (error) {
    console.error('Error while refreshing iPool creds: ', error)
    return undefined
  }
}

const S3UploadClient = async (base64string: string, options?: S3UploadOptions): Promise<string> => {
  options = {
    bucket: 'workduck-app-files',
    fileType: 'image/jpeg',
    giveCloudFrontURL: true,
    parseBase64String: false,
    ...options,
  }

  let creds = useAuthStore.getState().iPoolCreds
  if (!creds) throw new Error('Identity Pool Credentials Not Found; Could not upload')

  const t = Date.now()
  if (creds.expiration && creds.expiration?.getTime() <= t) {
    creds = await refreshIdentityPoolCreds(useAuthStore.getState().userCred?.token as string)
  }

  const s3Client = new S3Client({
    region: AWSRegion,
    credentials: creds,
    useAccelerateEndpoint: true,
  })

  const parsedImage = options.parseBase64String ? base64string.split(',')[1] : base64string
  const buffer = Buffer.from(parsedImage, 'base64')

  const filePath = `public/${randomFileName()}`

  await s3Client
    .send(
      new PutObjectCommand({
        Bucket: options.bucket,
        Key: filePath,
        Body: buffer,
        ContentType: options.fileType,
      })
    )
    .catch((error) => {
      throw new Error(`Could not upload image to S3: ${error}`)
    })

  const iPool = useAuthStore.getState().iPool

  const url =
    options.giveCloudFrontURL && iPool?.CDN_BASE_URL
      ? `${iPool.CDN_BASE_URL}/${filePath}`
      : `https://${options.bucket}.s3.amazonaws.com/${filePath}`

  return url
}

export default S3UploadClient
