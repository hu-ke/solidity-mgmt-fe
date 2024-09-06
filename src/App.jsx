import { useEffect, useRef, useState } from 'react'
import './App.css'
import { uploadSolidityFile, askGpt } from '@/utils/http'
import { ethers } from 'ethers'
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Flex, Layout } from 'antd';
const { Content } = Layout;

const headerStyle = {
  backgroundColor: "#e0e0e0",
  color: '#333333',
  display: 'flex',
  justifyContent: 'center',
  padding: 10,
  lineHeight: 1.5
};

const contentStyle = {
  textAlign: 'center',
  minHeight: 620,
  color: '#fff',
};

const layoutStyle = {
  borderRadius: 8,
  overflow: 'hidden',
};

function App() {
  const fileInputRef = useRef(null);
  const [fileContent, setFileContent] = useState()
  const [compileResult, setCompileResult] = useState()
  const [gptResponse, setGptResponse] = useState()
  const [contractAddress, setContractAddress] = useState('')

  const handleUpload = async() => {
    // @ts-ignore
    fileInputRef?.current?.click();
  };

  const fetchFileContent = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result)
      }
      reader.readAsText(file)
    }
  }

  useEffect(() => {
    if (fileContent) {
      fetchGptReply(fileContent)
    }
  }, [fileContent])

  const handleFileChange = async(e) => {
    let formData = new FormData();
    // @ts-ignore
    let fl = e?.target?.files[0]
    fetchFileContent(fl)
    formData.append('solidity', fl)

    try {
      let res = await uploadSolidityFile(formData)
      if (res.code === 200) {
        if (typeof res.data.abi === 'string') {
          res.data.abi = JSON.parse(res.data.abi)
        }
        setCompileResult(res.data)
      }
    } catch(e) {
      console.error('error occurred:', e)
    } finally {
    }
  }
  
  const deploy = () => {
    // 检查 MetaMask 是否已经注入了以太坊对象
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // 请求 MetaMask 提供账户访问
      provider.send("eth_requestAccounts", []).then(() => {
        const signer = provider.getSigner(); // 获取签名者（MetaMask账户）

        // 合约的 ABI 和字节码
        const abi = compileResult.abi;
        const bytecode = compileResult.bytecode; // 合约的字节码

        // 创建合约工厂实例
        const factory = new ethers.ContractFactory(abi, bytecode, signer);

        // 部署合约
        factory.deploy().then((contract) => {
          setContractAddress(contract.address)
          console.log(`Contract deployed at address: ${contract.address}`);
        }).catch((error) => {
          console.error(`Deployment failed: ${error}`);
        });
      }).catch((error) => {
        console.error(`MetaMask connection failed: ${error}`);
      });
    } else {
      console.error('MetaMask is not installed or not available');
    }
  }

  const getStoredData = async() => {
    // 连接到以太坊主网（你可以选择其他网络）
    const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/46b96397d2ae4d36838227f9edbbd676');

    // 合约地址和ABI
    const contractAddress = '0x24e000f3Edf1270cb7f145E08816be595F39f118';
    const abi = [
      {
        "constant": true,
        "inputs": [],
        "name": "get",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "x",
            "type": "uint256"
          }
        ],
        "name": "set",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    try {
      const storageSlot = 0;
      const storageData = await provider.getStorageAt(contractAddress, storageSlot);
      // `storageData` is in hex format, convert it to a readable number
      const storedData = ethers.BigNumber.from(storageData).toString();
      console.log('Stored Data:', storedData);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const fetchGptReply = async(contract) => {
    const res = await askGpt({
      contract: `
${contract}
`
    })
    if (res.code === 200) {
      setGptResponse(res.data)
    }
  }

  return (
    <Flex gap="middle" wrap justify={'center'} className="main">
      <Layout style={layoutStyle}>
        <div style={headerStyle}>
          <div>
            <span style={{fontSize: '16px'}}>Deploy Solidity smart contracts with confidence, powered by clear insights.</span>
            <ul style={{margin: 5, fontStyle: 'italic'}}>
              <li>Upload and deploy Solidity smart contracts easily.</li>
              <li>Get detailed analysis and insights powered by ChatGPT.</li>
              <li>Identify issues within the contract and receive improvement suggestions.</li>
              <li>Ensure contract quality and security for both new and experienced developers.</li>
            </ul>
          </div>
        </div>
        <Content style={contentStyle}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button style={{cursor: 'pointer', marginTop: '15px'}} onClick={handleUpload}>upload your smart contract</button>
          {
            compileResult ? (
              <button onClick={deploy} style={{marginLeft: 50}}>deploy</button>
            ) : ''
          }
          {
            contractAddress ? (
              <div style={{color: '#000', marginTop: 20}}>
                Contract Address: {contractAddress}
              </div>
            ) : ''
          }
          {
            fileContent ? (
              <div style={{padding: '0 40px'}}>
                <ReactMarkdown
                  children={`
\`\`\`solidity
${fileContent}
\`\`\`        
                  `}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={solarizedlight}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                />
              </div>
            ) : ''
          }
          {
            gptResponse ? (
              <div style={{color: '#000', padding: '0 40px 20px', textAlign: 'left'}}>
                <h3>Explanation: </h3>
                <div style={{backgroundColor: 'rgb(238, 238, 238)', padding: '14px'}}>
                  <code>{gptResponse.explanation}</code>
                </div>
                <h3>Improvements:</h3>
                <div style={{backgroundColor: 'rgb(238, 238, 238)', padding: '14px'}}>
                  <code>{gptResponse.improvements}</code>
                </div>
                <h3>Vulnerabilities:</h3>
                <div style={{backgroundColor: 'rgb(238, 238, 238)', padding: '14px' }}>
                  <code>{gptResponse.vulnerabilities}</code>
                </div>
              </div>
            ) : ''
          }
        </Content>
      </Layout>
    </Flex>
  )
}

export default App
