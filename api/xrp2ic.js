const { idlFactory: idlFactory_nft } = require("./nft.did");
const { idlFactory: idlFactory_xrp } = require("./xrp.did");
const { idlFactory: idlFactory_bridge } = require("./bridge.did");

var xrpl = require("xrpl");
const Identity = require("@dfinity/identity");
const { Actor } = require("@dfinity/agent");
const { HttpAgent } = require("@dfinity/agent");
const { Principal } = require("@dfinity/principal");

const sha256 = require("sha256");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Ed25519KeyIdentity, Secp256k1KeyIdentity } = Identity;

// *******************ENV VAR BEGIN*******************
const icPem = process.env.PRINCIPAL;
const xrpIssuerPrivateKey = process.env.ISSUER;
const xrpNFTServer = process.env.SERVER;
const canisterId_xrp = process.env.CANISTERID_XRP;
const canisterId_nft = process.env.CANISTERID_NFT;
const canisterId_bridge = process.env.CANISTERID_BRIDGE;
const AccountIdentifier_bridge = process.env.AID_BRIDGE;
// *******************ENV VAR END*******************

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

let getMapping = async () => {
  const res = await actor_xrp.getMapping().catch((e) => {
    return "Error" + e;
  });
  return res;
};

let getRegistry = async () => {
  const res = await actor_nft.getRegistry().catch((e) => {
    return "Error" + e;
  });
  return res;
};

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

let xrp2ic = async (_token_ic, _token_xrp, sender, receiver) => {
  const res = await actor_bridge
    .xrp2ic(BigInt(_token_ic), _token_xrp, sender, Principal.fromText(receiver))
    .catch((e) => {
      return "Error" + e;
    });
  return res;
};

let getTokenId_ic = async (_token) => {
  const res = await actor_bridge.getTokenId_ic(_token).catch((e) => {
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

let getNFTokenIDs = (nfts) => {
  let NFTokenIDs = nfts.result.account_nfts.map((item) => {
    return item.NFTokenID;
  });
  return NFTokenIDs;
};

let getNFTokenID_burntx = (tx) => {
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

  let NFTokenID = PreviousFields.filter(function (NFToken) {
    return FinalFields.indexOf(NFToken) < 0;
  });
  return NFTokenID[0];
};

export default async function handler(req, res) {
  const userPrincipal = req.body.principal;
  const userXrpPublicKey = req.body.xrpPublicKey;
  const userXrpPrivateKey = req.body.xrpPrivateKey;
  const NFTokenID = req.body.NFTokenID;
  // Check transaction results -------------------------------------------------

  getMapping().then(async (canisterRes_map) => {
    // 1.Check mapping XRPprivateKey == Mapping[Principal ID]
    let map = Object.fromEntries(new Map(canisterRes_map["ok"]));
    if (typeof map[userPrincipal] == "undefined") {
      res.status(400).json({ err: `Unknown Users: ${userPrincipal}` });
      return;
    } else if (map[userPrincipal]["privateKey"] != userXrpPrivateKey) {
      res.status(400).json({ err: `Unauthorized user: ${userPrincipal}` });
      return;
    }

    // 2. check {NFTokenID} if owner by {XRPprivateKey}
    const client = new xrpl.Client(xrpNFTServer);
    const clientWallet = xrpl.Wallet.fromSeed(userXrpPrivateKey);
    await client.connect();
    const nfts = await client.request({
      method: "account_nfts",
      account: clientWallet.classicAddress,
    });
    let NFTokenIDs = getNFTokenIDs(nfts);
    if (NFTokenIDs.includes(NFTokenID) == false) {
      client.disconnect();
      res.status(400).json({
        err: `${userXrpPublicKey} is not the owner of ${NFTokenID} or invalid token NFTokenID`,
      });
      return;
    }

    // 3. query {TokenIndex} from {bridgeTokenIndex(NFTokenID)}
    getTokenId_ic(NFTokenID).then(async (canisterRes_TokenId) => {
      if (typeof canisterRes_TokenId["ok"] == "undefined") {
        res.status(400).json({
          err: `Cannot found the corresponding IC index : ${NFTokenID}`,
        });
        return;
      }
      let TokenIndex = Number(canisterRes_TokenId["ok"]);
      //3* check if the corresponding {TokenIndex} is on IC (this step can be drepressed in furture)
      getIsOnIC(TokenIndex).then(async (canisterRes_IsOnIC) => {
        if (typeof canisterRes_IsOnIC["ok"] == "undefined") {
          res.status(400).json({ err: `Invalid token : ${TokenIndex}` });
          return;
        }
        if (canisterRes_IsOnIC["ok"] == true) {
          res.status(400).json({
            err: `The NFT has been on IC : ${TokenIndex}`,
          });
          return;
        }
        // 4. burn {NFTokenID}
        const transactionBlob = {
          TransactionType: "NFTokenBurn",
          Account: clientWallet.classicAddress,
          NFTokenID: NFTokenID,
        };
        const tx = await client.submitAndWait(transactionBlob, {
          wallet: clientWallet,
        });
        client.disconnect();
        // double check if the burn is successful
        let NFTokenID_check = getNFTokenID_burntx(tx);
        if (typeof NFTokenID_check == "undefined") {
          res.status(400).json({ err: "Burn failed" });
          return;
        }
        //5. request {bridge} to xrp2ic(_token_ic: TokenIndex, _token_xrp: NFTokenID, sender:XrpPublicKey, receiver:Principal)) to release the NFT and make recode on bridge ledger
        xrp2ic(TokenIndex, NFTokenID, userXrpPublicKey, userPrincipal).then(
          async (canisterRes_xrp2ic) => {
            if (typeof canisterRes_xrp2ic["ok"] == "undefined") {
              res.status(400).json({ res: "Ledger updated failed: xrp2ic" });
              return;
            } else {
              res.status(200).json({
                res: {
                  ic: TokenIndex,
                  xrp: NFTokenID,
                  direction: "XRP2IC",
                  tx: tx,
                },
              });
              return;
            }
          }
        );
      });
    });
  });

  // console.log(nfts);
  // // Check transaction results -------------------------------------------------
  // console.log("Transaction result:", tx.result.meta.TransactionResult);
  // console.log(
  //   "Balance changes:",
  //   JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2)
  // );
}
// End of burnToken()
