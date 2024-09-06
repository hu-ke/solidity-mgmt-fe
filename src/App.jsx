import { useEffect, useRef, useState } from 'react'
import './App.css'
import { test, uploadSolidityFile, askGpt } from '@/utils/http'
import { ethers } from 'ethers'
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Flex, Layout } from 'antd';
const { Content } = Layout;

// const contract = `
// //SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.19;

// import "@openzeppelin/contracts/utils/Counters.sol";
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// contract MyNFT is ERC721URIStorage {
//     using Counters for Counters.Counter;
//     Counters.Counter private _tokenIds;

//     struct NFT {
//         uint256 price;
//         bool forSale;
//     }

//     mapping(uint256 => NFT) public nfts;
//     mapping(string => uint256) private _tokenIdsByURI;
//     mapping(address => uint256[]) private _ownedTokens;
//     mapping(uint256 => uint256) private _ownedTokensIndex;

//     constructor() ERC721("MyNFT", "MNFT") {}

//     function setForSale(uint256 tokenId, uint256 price) internal {
//         require(ownerOf(tokenId) == msg.sender, "You are not the owner");
//         nfts[tokenId] = NFT(price, true);
//     }

//     function mint(string memory tokenURI, uint256 price) public returns (uint256) {
//         _tokenIds.increment();

//         uint256 newItemId = _tokenIds.current();
//         // _mint 方法通常用于创建新的代币并将其分配给指定的账户。这个方法在各种代币标准（如 ERC-20 和 ERC-721）中都有广泛的应用。
//         _mint(msg.sender, newItemId);
//         _setTokenURI(newItemId, tokenURI);
//         _tokenIdsByURI[tokenURI] = newItemId;
//         _addTokenToOwnerEnumeration(msg.sender, newItemId);
//         setForSale(newItemId, price);

//         return newItemId;
//     }

//     function buyNFT(uint256 tokenId) external payable {
//         NFT storage nft = nfts[tokenId];
//         require(nft.forSale, "NFT is not for sale");
//         require(msg.value == nft.price, "Incorrect value sent");

//         address seller = ownerOf(tokenId);

//         // Transfer the NFT to the buyer
//         _transfer(seller, msg.sender, tokenId);

//         // Transfer the ETH to the seller
//         payable(seller).transfer(msg.value);

//         // Update the NFT status
//         nft.forSale = false;
//     }

//     function getTokenIdByTokenURI(string memory tokenURI) public view returns (uint256) {
//         require(_tokenIdsByURI[tokenURI] != 0, "Token URI does not exist");
//         return _tokenIdsByURI[tokenURI];
//     }

//     function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
//         _ownedTokensIndex[tokenId] = _ownedTokens[to].length;
//         _ownedTokens[to].push(tokenId);
//     }

//     function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
//         uint256 lastTokenIndex = _ownedTokens[from].length - 1;
//         uint256 tokenIndex = _ownedTokensIndex[tokenId];

//         if (tokenIndex != lastTokenIndex) {
//             uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];
//             _ownedTokens[from][tokenIndex] = lastTokenId;
//             _ownedTokensIndex[lastTokenId] = tokenIndex;
//         }

//         _ownedTokens[from].pop();
//         delete _ownedTokensIndex[tokenId];
//     }

//     function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
//         super._beforeTokenTransfer(from, to, tokenId, batchSize);

//         if (from != address(0)) {
//             _removeTokenFromOwnerEnumeration(from, tokenId);
//         }
//         if (to != address(0)) {
//             _addTokenToOwnerEnumeration(to, tokenId);
//         }
//     }

//     function getTokensOfOwner(address owner) public view returns (uint256[] memory) {
//         return _ownedTokens[owner];
//     }

//     function totalSupply() public view returns (uint256) {
//         return _tokenIds.current();
//     }
// }
// `

const contract = `
// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.4.16 <0.9.0;

contract SimpleStorage {
    uint storedData;

    function set(uint x) public {
        storedData = x;
    }
}
`

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
  // width: 'calc(50% - 8px)',
  // maxWidth: 'calc(50% - 8px)',
};

function App() {
  const fileInputRef = useRef(null);
  const [fileContent, setFileContent] = useState();
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

  const fetchFileContent = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result)
      }
      reader.readAsText(file)
    }
  }

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
          // 0x24e000f3Edf1270cb7f145E08816be595F39f118
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

  const fetchGptReply = async() => {
    const res = await askGpt({
      contract
    })
    console.log('res', res)
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
          {/* <button onClick={deploy}>deploy</button>
          <button onClick={getStoredData}>get stored data</button>
          <button onClick={fetchGptReply}>fetch gpt reply</button> */}
        </Content>
      </Layout>
    </Flex>
  )
}

export default App
