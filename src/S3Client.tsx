import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  CognitoIdentityCredentials,
  fromCognitoIdentityPool as FromCognitoIdentityPool,
} from '@aws-sdk/credential-provider-cognito-identity'

import useAuthStore from './AuthStore/useAuthStore'
import { AWSRegion, S3DownloadOptions, S3UploadOptions, randomFileName } from './utils/helpers'

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
  if (creds.expiration) {
    const expiryTime =
      typeof creds.expiration === 'object'
        ? creds.expiration.getTime()
        : Date.parse(creds.expiration as unknown as string)
    if (expiryTime <= t) creds = await refreshIdentityPoolCreds(useAuthStore.getState().userCred?.token as string)
  } else {
    throw new Error('Identity Pool Credentials Not Found; Could not upload')
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

const S3FileUploadClient = async (base64string: string, options?: S3UploadOptions): Promise<string> => {
  options = {
    bucket: 'mex-app-files',
    fileType: 'plain/text',
    giveCloudFrontURL: false,
    parseBase64String: false,
    ...options,
  }

  let creds = useAuthStore.getState().iPoolCreds
  if (!creds) throw new Error('Identity Pool Credentials Not Found; Could not upload')

  const t = Date.now()
  if (creds.expiration) {
    const expiryTime =
      typeof creds.expiration === 'object'
        ? creds.expiration.getTime()
        : Date.parse(creds.expiration as unknown as string)
    if (expiryTime <= t) creds = await refreshIdentityPoolCreds(useAuthStore.getState().userCred?.token as string)
  } else {
    throw new Error('Identity Pool Credentials Not Found; Could not upload')
  }

  const s3Client = new S3Client({
    region: AWSRegion,
    credentials: creds,
    useAccelerateEndpoint: true,
  })

  const parsedImage = options.parseBase64String ? base64string.split(',')[1] : base64string

  const filePath = `private/${useAuthStore.getState().userCred?.userId}/${options.fileName ?? randomFileName()}`

  await s3Client
    .send(
      new PutObjectCommand({
        Bucket: options.bucket,
        Key: filePath,
        Body: parsedImage,
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

const S3FileDownloadClient = async (options: S3DownloadOptions): Promise<GetObjectCommandOutput['Body']> => {
  options = { bucket: 'mex-app-files', ...options }
  let creds = useAuthStore.getState().iPoolCreds
  if (!creds) throw new Error('Identity Pool Credentials Not Found; Could not upload')

  const t = Date.now()
  if (creds.expiration) {
    const expiryTime =
      typeof creds.expiration === 'object'
        ? creds.expiration.getTime()
        : Date.parse(creds.expiration as unknown as string)
    if (expiryTime <= t) creds = await refreshIdentityPoolCreds(useAuthStore.getState().userCred?.token as string)
  } else {
    throw new Error('Identity Pool Credentials Not Found; Could not upload')
  }

  const s3Client = new S3Client({
    region: AWSRegion,
    credentials: creds,
    useAccelerateEndpoint: true,
  })

  const filePath = `private/${useAuthStore.getState().userCred?.userId}/${options.fileName}`
  const result = await s3Client
    .send(
      new GetObjectCommand({
        Bucket: options.bucket,
        Key: filePath,
      })
    )
    .catch((error) => {
      console.error(error)
      throw new Error(`Could not upload file to S3: ${error}`)
    })

  return result.Body
}

export { S3UploadClient, S3FileUploadClient, S3FileDownloadClient }
