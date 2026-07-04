import axios from 'axios'

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api/cat-dien',
})

// Mã đơn vị điện lực phụ trách Đại Lộc — cấu hình lại cho đúng khu vực
export const DON_VI = 'PC05HH'
