import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import useAuthStore from './AuthStore/useAuthStore'
import { S3UploadOptions, AWSRegion, randomFileName } from './utils/helpers'

const S3UploadClient = async (base64string: string, options?: S3UploadOptions): Promise<string> => {
  options = {
    bucket: 'workduck-app-files',
    fileType: 'image/jpeg',
    giveCloudFrontURL: true,
    parseBase64String: false,
    ...options,
  }

  const creds = useAuthStore.getState().iPoolCreds
  const s3Client = new S3Client({
    region: AWSRegion,
    credentials: creds,
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
