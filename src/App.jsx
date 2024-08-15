import { useEffect, useRef, useState } from 'react'
import './App.css'
import { test, uploadSolidityFile } from '@/utils/http'

function App() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState();
  const [compileResult, setCompileResult] = useState()

  const fn = async() => {
    await test()
  }
  useEffect(() => {
    fn()
  }, [])

  const handleUpload = async() => {
    // @ts-ignore
    fileInputRef?.current?.click();
  };

  const handleFileChange = async(e) => {
    let formData = new FormData();
    // @ts-ignore
    let fl = e?.target?.files[0]
    setFile(fl)
    formData.append('solidity', fl)

    try {
      let res = await uploadSolidityFile(formData)
      if (res.code === 200) {
        setCompileResult(res.data)
      }
    } catch(e) {
      console.error('error occurred:', e)
    } finally {
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button onClick={handleUpload}>upload</button>
    </>
  )
}

export default App
