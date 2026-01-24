// Daytona SDK wrapper
import { Daytona } from '@daytonaio/sdk'

export const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,
})
