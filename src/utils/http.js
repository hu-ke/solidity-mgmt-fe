import axios from "axios";

const baseUrl =  import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080'

export const uploadSolidityFile = async(params, onUploadProgress) => {
    let { data } = await axios.post(`${baseUrl}/api/upload`, params, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress
    })
    return data
}

export const test = async() => {
    let { data } = await axios.get(`${baseUrl}/api`)
    return data
}
