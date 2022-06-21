# པ་ཀྲ་ཧེ་། Bazahei: The first ICP-XRP cross-chain NFT
#### Building for Dfinity Supernova Hackthon in 2022

Explore demo on [HERE](https://aack7-jaaaa-aaaai-acl6a-cai.ic0.app/)

Refer full documentation on [Devpot](https://supernova.devpost.com/) 

## Introduction

The Internet Computer Protocol (ICP) is the fastest and most scalable general-purpose blockchain. It extends the Internet with computation: ICP allows Dapps to run 100% on-chain as it can serve web contents directly on browsers. Compared to Ethereum, the ICP is cheaper, faster, upgradable and fall-stack development friendly. Since the ICP community has established one of the strongest GameFi&SocialFi ecologies in the world, the NFT digital assets based on ICP are rising due to the straight path to the ecology. In 2022, the NFT projects launched on ICP are exponentially growing, but the value of the total assets is suppressed by the bear market of ICP native tokens. 

XRP, one of the OG blockchain networks since 2012 (older than Etherum), focusing on cross-border payments and central bank digital currency solutions, just launched NFT R&D and in 2021 to leverage the success from fungible token to non-fungible. According to the [Utility-Based NFTs: Solving Real-World Problems in Media & Entertainment” by Ripple labs](https://ripple.com/insights/utility-based-nfts-solving-real-world-problems-in-media-entertainment/), the NFT development will focus on utility-based NFT to solve the real problems in Media & Entertainment such as licensing and ownership, which align the Itoka team vision to disrupt the traditional music industry by decentralization.  If the XRP establishes the NFT ecosystem in the near future, this multi-billion dollar crypto market will be active since NFT will be the only assets for XRP current holders to invest within its ecosystem.  
	
It would be very interesting and impactful to bring ICP and XRP together to talk about NFT.  If we can bring the ICP NFT value to the Tuhao (meaning financially independent in Chinese) XRP community who cannot enjoy smart contracts and NFT yet, the infrastructure development would be greatly appreciated by both communities and end up with a win-win for everyone. Therefore, Itoka team build the cross-chain framework to approach it by issuing a collection of image NFTs called Ba-Za-Hei(པ་ཀྲ་ཧེ་།, 巴扎嘿) to prove the concept, along with our ICP-XRP bridge canister implemented by motoko. Bazahei NFTs is the first NFT collection that can freely migrate between ICP and XRP. It is in honor of nomad singers from the Tibetan area in Sichuan, China. It revitalizes the long-forgotten art through decentralized web and symbolizes the beginning of amalgamation of two once insulated communities.

## Background

Tibet remains isolated and untouched for decades. This virgin land of Buddhism has delivered its spiritual and mysterious impression to people around the world, yet few truly understand the culture there. 

Luckily, Itoka team members had a chance to go deep into the Tibetan plateau and spend days with local tribes. We were warmly welcomed and presented a Hadag, a silk-made white scarf as a symbol of Buddha's blessing. During our stay, we surprisingly discovered the rarely known talent of people there: music and art. Tibetan people are born to be musicians and dancers. Every single one of them can dance and sing, even for small kids. They sing and dance for grazing, for ritual events, for celebrations, or just for normal daily matters. After years their euphonious voice, rhythmic body movements, and genuine smiles are still vivid in our heads. Our Itoka team would like to take this chance in supernova to connect Tibetan culture with everyone beyond the Himalaya using Web3 technology. We hope to break the isolation barrier of all great art and music in the world. 

Thus, we present our “པ་ཀྲ་ཧེ་། Bazahei” NFT collection – 78 NFTs each containing a pair of mirrored images. All of the NFTs have the same character: a Tibetan nomad singer presenting you with the holy Hadag and giving you their most sincere blessing. Each NFT has a different color scheme and contemporary art style as a modern interpretation of traditional Tibetan culture. 
## Key features

1. IC-wrapped Authentication to XRP users.
2. Standardized NFT Implementation (EXT)
3. Serverless XRPL NFT Issuer Server
4. Chain-dependent Art Piece 

## Development overview
The project is developed by 6 components: 

[1] **An NFT canister** following the fashion of EXT-NFT. The NFT is portable to 3rd party marketplace to freely trade. Since we enable the inter-canister calls, we need to hard code the canister controller as NFT minter when initializing the actor.  

[2] **An assets canister** to host all metadata. 

[3] **An account manager canister** to manage users’ XRP NFT accounts. This canister stores the user’s XRP public and private key and only the authenticated user can query his/her keys. Meanwhile, only the serverless XRP issuer can verify if the inputting principal ID and XRP keys are correctly associated to prevent brute force attacks. 

[4] **A bridge-like canister** to stake cross-chain NFT and bound IC NFT token identifier and XRP NFTokenId. This canister also serves as custodian to stake IC NFT when it lives on the XRP network. The two core methods of {ic2xrp} and {xrp2ic} methods make records to the cross-chain ledger and only serverless XRP issuer can call those methods. The {xrp2ic} will also invoke an inter-canister calls to release NFT back to users. 

[5] [**A severless XRP issuer**](https://github.com/Itoka-DAO/xrp_server) with its own IC identity to handle XRP mining and burning operations. The issuer can verify user’s principal and XRP keys, token ownership from IC NFT canister, state of which blockchain and call {ic2xrp} and {xrp2ic} from bridge canister.

[6] [**A frontend**](https://github.com/Itoka-DAO/icxrp) for showcase gallery and verify if cross chain is successful. 

![scheme](https://user-images.githubusercontent.com/46518089/174692046-76330399-e401-4817-8472-43c83274d877.png)

### Prerequisites

1. `dfx` ^0.10.0 

## How to use?
 
```shell
git clone https://github.com/Itoka-DAO/IC-XRP.git
npm install
deploy_ic.sh./
python3 mint_nft.py
```
## How to claim the NFT and customize the metadata?

The `bazahei_airdrop_spreadsheet - Sheet1.csv` is the sheet to whom you would like to drop. The `_csv2json.js` will help you parse the csv to json and tag the metadata location. You can modify your metadata on 

```javascript
jsondata[row[0]] = {
      principalID: row[1],
      ic_url: `{YOUR IC METADATA LOCATION}`,
      xrp_url: `{YOUR XRP METADATA LOCATION}`,
    };
  })
```

OR directly access `mintInfo.json` and `_mint.js`.

## How to IC2XRP?

To mint XRP NFT, please depoly a severless [XRP issuer](https://github.com/Itoka-DAO/xrp_server) along with canisters and follow transcation follow. 






