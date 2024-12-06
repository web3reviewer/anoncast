import { Cast } from '@anonworld/sdk/types'
import { Channel, ValidateFrameResponse, UploadImageResponse } from '../types'
import { ApiClient } from './client'
import { Identity } from '@anon/api/src/services/types'

const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '')

export const api = {
  getCast: async (identifier: string) => {
    const response = await apiClient.request<Cast>(`/get-cast?identifier=${identifier}`)
    return response.data
  },
  getChannel: async (identifier: string) => {
    const response = await apiClient.request<Channel>(
      `/get-channel?identifier=${identifier}`
    )
    return response.data
  },
  validateFrame: async (data: string) => {
    const response = await apiClient.request<ValidateFrameResponse>(
      `/validate-frame?data=${data}`
    )
    return response.data
  },
  uploadImage: async (image: File) => {
    const formData = new FormData()
    formData.append('image', image)

    const response = await apiClient.request<UploadImageResponse>('/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    })

    return response
  },
  getIdentity: async (address: string) => {
    const response = await apiClient.request<Identity>(`/identity?address=${address}`)
    return response.data
  },
}
