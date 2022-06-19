const { idlFactory: idlFactory_nft } = require("../api_icxrp/nft.did");
const { idlFactory: idlFactory_xrp } = require("../api_icxrp/xrp.did");
const { idlFactory: idlFactory_bridge } = require("../api_icxrp/bridge.did");
const fs = require("fs");
var xrpl = require("xrpl");
const Identity = require("@dfinity/identity");
const { Actor } = require("@dfinity/agent");
const { HttpAgent } = require("@dfinity/agent");
const { Principal } = require("@dfinity/principal");
const sha256 = require("sha256");
const { createImportSpecifier } = require("typescript");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Ed25519KeyIdentity, Secp256k1KeyIdentity } = Identity;

// ***********************Environment Variables***********************
const icPem = "Hello Bazahei!!!!";
const canisterId_xrp = require("./canister_ids.json")["xrp"]["ic"];
const canisterId_nft = require("./canister_ids.json")["nft"]["ic"];
const canisterId_bridge = require("./canister_ids.json")["bridge"]["ic"];
// ***********************Environment Variables***********************

const privateKey = Uint8Array.from(sha256(icPem, { asBytes: true }));
const identity = Secp256k1KeyIdentity.fromSecretKey(privateKey);

const getActor = (canisterId, idlFactory, identity) => {
  const agent = new HttpAgent({
    fetch: fetch,
    identity: identity,
    host: `https://${canisterId}.ic0.app`,
  });

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: canisterId,
  });
  return actor;
};

let actor_xrp = getActor(canisterId_xrp, idlFactory_xrp, identity);
let actor_nft = getActor(canisterId_nft, idlFactory_nft, identity);
let actor_bridge = getActor(canisterId_bridge, idlFactory_bridge, identity);

// **************************NFT Actor**************************
let getRegistry = async () => {
  const res = await actor_nft.getRegistry().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let mintNFT = async (MintRequest) => {
  const res = await actor_nft.mintNFT(MintRequest).catch((e) => {
    return "Error" + e;
  });
  return res;
};
// _principal :Text
// _metadata : [UFT8]
const getMintRequest = (_to, _metadata) => {
  let MintRequest = {
    to: { principal: Principal.fromText(_to) },
    metadata: [_metadata],
  };
  return MintRequest;
};

// **************************NFT Actor**************************

// **************************Bridge Actor**************************
let getMetadata_xrp = async (TokenIndex) => {
  const res = await actor_bridge.getMetadata_xrp(TokenIndex).catch((e) => {
    return "Error" + e;
  });
  return res;
};

let ic2xrp = async (_token_ic, _token_xrp, sender, receiver) => {
  const res = await actor_bridge
    .ic2xrp(BigInt(_token_ic), _token_xrp, Principal.fromText(sender), receiver)
    .catch((e) => {
      return "Error" + e;
    });
  return res;
};

let getIsOnIC = async (TokenIndex) => {
  const res = await actor_bridge.getIsOnIC(BigInt(TokenIndex)).catch((e) => {
    return "Error" + e;
  });
  return res;
};

let getAllTokenInfo = async () => {
  const res = await actor_bridge.getAllTokenInfo().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let setMetadata_ic = async () => {
  const res = await actor_bridge.setMetadata_ic().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let setMetadata_xrp = async (idx, xrl_url) => {
  const res = await actor_bridge.setMetadata_xrp(idx, xrl_url).catch((e) => {
    return "Error" + e;
  });
  return res;
};

const to32bits = (num) => {
  let b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
};

const computeTokenIdentifier = (principal, index) => {
  const padding = Buffer("\x0Atid");
  const array = new Uint8Array([
    ...padding,
    ...Principal.fromText(principal).toUint8Array(),
    ...to32bits(index),
  ]);
  let TokenIdentifier = Principal.fromUint8Array(array).toText();
  return TokenIdentifier;
};

let setIdx2TokenIdentifier = async (TokenIdentifier) => {
  const res = await actor_bridge
    .setIdx2TokenIdentifier(TokenIdentifier)
    .catch((e) => {
      return "Error" + e;
    });
  return res;
};

// **************************Bridge Actor**************************
// **************************XRP manager Actor**************************
let getMapping = async () => {
  const res = await actor_xrp.getMapping().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let whoami = async () => {
  const res = await actor_xrp.whoami().catch((e) => {
    return "Error" + e;
  });
  return res;
};
let isRegisteredUser = async (principal) => {
  const res = await actor_xrp
    .isRegisteredUser(Principal.fromText(principal))
    .catch((e) => {
      return "Error" + e;
    });
  return res;
};

let getXRPAccount = async () => {
  const res = await actor_xrp.getXRPAccount().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let setXRPAccount = async (_publicKey, _privateKey) => {
  const res = await actor_xrp
    .setXRPAccount(_publicKey, _privateKey)
    .catch((e) => {
      return "Error" + e;
    });
  return res;
};

// **************************XRP manager Actor**************************
// ************************** XRP ledger API**************************
let getNFTokenID_mint = (tx) => {
  let meta_serialized = tx.result.meta.AffectedNodes.map((item) => {
    return [
      item.ModifiedNode.LedgerEntryType,
      {
        FinalFields: item.ModifiedNode.FinalFields,
        PreviousFields: item.ModifiedNode.PreviousFields,
      },
    ];
  });

  let meta_json = Object.fromEntries(new Map(meta_serialized));

  let FinalFields = meta_json.NFTokenPage.FinalFields.NFTokens.map((item) => {
    return item.NFToken.NFTokenID;
  });

  let PreviousFields = meta_json.NFTokenPage.PreviousFields.NFTokens.map(
    (item) => {
      return item.NFToken.NFTokenID;
    }
  );

  let NFTokenID = FinalFields.filter(function (NFToken) {
    return PreviousFields.indexOf(NFToken) < 0;
  });
  return NFTokenID[0];
};
// ************************** XRP ledger API**************************

let text2blob = (text) => {
  return [...Buffer.from(text, "utf8")];
};

let blob2text = (blob) => {
  return Buffer.from(blob, "utf8").toString();
};

let serliezd = (tokenInfo) => {
  let tokenIdentifier = tokenInfo.tokenIdentifier;
  let tokenIndex = tokenInfo.tokenIndex;
  let isOnIC = tokenInfo.isOnIC;
  let metadata = tokenInfo.metadata;
  if (isOnIC) {
    metadata = blob2text(
      tokenInfo.metadata.metadata_ic.nonfungible.metadata[0]
    );
  } else {
    metadata = tokenInfo.metadata.metadata_xrp;
  }
  tokenSerliezd = {
    tokenIdentifier: tokenIdentifier,
    tokenIndex: tokenIndex,
    isOnIC: isOnIC,
    metadata: metadata,
  };
  return tokenSerliezd;
};

const setup = async (_to, ic_url, xrp_url) => {
  let mintRequest = getMintRequest(_to, ic_url);
  await mintNFT(mintRequest).then((index) => {
    console.log(`mintRequest: ${index}`);
    setMetadata_xrp(index, xrp_url).then((res) => {
      console.log(`setMetadata_xrp`, res);
      let tokenIdentifier = computeTokenIdentifier(canisterId_nft, index);
      // console.log(
      //   `computeTokenIdentifier: ${canisterId_nft},${index} maps to ${tokenIdentifier}`
      // );
      setIdx2TokenIdentifier(tokenIdentifier).then((res) => {
        console.log(`setIdx2TokenIdentifier`, res);
        setMetadata_ic().then((res) => {
          console.log(`setMetadata_ic: `, res);
          console.log(`complete token set up for `, index);
        });
      });
    });
  });
};

async function init() {
  // whoami().then((res) => {
  //   console.log(res.toString());
  // });

  var argv = require("minimist")(process.argv.slice(2));
  let i = argv.idx;
  let data = JSON.parse(fs.readFileSync("./mintInfo.json"));
  console.log(i, data[i]);
  let _to = data[i].principalID;
  let ic_url = data[i].ic_url;
  ic_url = text2blob(ic_url);
  let xrp_url = data[i].xrp_url;
  setup(_to, ic_url, xrp_url);
}

init();
