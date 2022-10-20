import React, { useState } from 'react'

import { useForm, useFieldArray } from 'react-hook-form'

import { useAuth } from '@workduck-io/dwindle'

interface ImageUploadFormDetails {
  image: FileList
}

export const FileUploader = () => {
  const { register, handleSubmit } = useForm<ImageUploadFormDetails>()
  const { uploadImageToS3 } = useAuth()

  const onSubmit = (data: ImageUploadFormDetails) => {
    const image = data.image[0]
    const fr = new FileReader()
    fr.onload = async (r) => {
      console.log('OnSubmit', { image, data, imageBase64: r.target.result })
      const uploadedImage = await uploadImageToS3(r.target.result as string, { fileType: image.type })
    }
    fr.readAsDataURL(image)
  }

  return (
    <>
      <h1>Upload Files</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="file" name="image" {...register('image')} />
        <button>Submit</button>
      </form>
    </>
  )
}
