import { useFailedRequestStore } from '../AuthStore/useAuthStore'

export const processQueue = async (error: any, userCred: any) => {
  useFailedRequestStore.getState().failedRequests.forEach((prom: any) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(userCred)
    }
  })
  useFailedRequestStore.setState({
    failedRequests: [],
  })
}
