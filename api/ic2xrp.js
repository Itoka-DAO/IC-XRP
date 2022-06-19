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

let getIsOnIC = async (TokenIndex) => {
  const res = await actor_bridge.getIsOnIC(BigInt(TokenIndex)).catch((e) => {
    return "Error" + e;
  });
  return res;
};

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

export default async function handler(req, res) {
  const userPrincipal = req.body.principal;
  const userXrpPublicKey = req.body.xrpPublicKey;
  const userXrpPrivateKey = req.body.xrpPrivateKey;
  const TokenIndex = req.body.TokenIndex;

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
    // 2.Check {TokenIndex} is on IC and owned by bridge
    getRegistry().then(async (canisterRes_reg) => {
      let reg = Object.fromEntries(new Map(canisterRes_reg));
      if (reg[TokenIndex] != AccountIdentifier_bridge) {
        res
          .status(400)
          .json({ err: `NFT is not staking on bridge: ${TokenIndex}` });
        return;
      }
      getIsOnIC(TokenIndex).then(async (canisterRes_IsOnIC) => {
        if (typeof canisterRes_IsOnIC["ok"] == "undefined") {
          res
            .status(400)
            .json({ err: `getIsOnIC: Invalid token : ${TokenIndex}` });
          return;
        }
        if (canisterRes_IsOnIC["ok"] == false) {
          res.status(400).json({
            err: `The NFT has been on XRP : ${TokenIndex}`,
          });
          return;
        }
        // 3. Query {metadata_xrp} from {bridge}
        getMetadata_xrp(TokenIndex).then(async (canisterRes_meta) => {
          let metadata_xrp = canisterRes_meta["ok"];
          // 4. mint {metadata_xrp} on XRPL
          const clientWallet = xrpl.Wallet.fromSeed(userXrpPrivateKey);
          const custodianWallet = xrpl.Wallet.fromSeed(xrpIssuerPrivateKey);
          const client = new xrpl.Client(xrpNFTServer);
          await client.connect();
          const accSetTransactionBlob = {
            TransactionType: "AccountSet",
            Account: custodianWallet.classicAddress,
            NFTokenMinter: clientWallet.classicAddress,
            SetFlag: 10, //Allow another acc to mint token.
          };
          const accSetRes = await client.submitAndWait(accSetTransactionBlob, {
            wallet: custodianWallet,
          });
          const transactionBlob = {
            TransactionType: "NFTokenMint",
            Issuer: custodianWallet.classicAddress,
            Account: clientWallet.classicAddress,
            URI: xrpl.convertStringToHex(metadata_xrp), //get from canisterRes_meta["ok"];
            Flags: 9,
            TransferFee: 0,
            NFTokenTaxon: 0, //Required, but if you have no use for it, set to zero.
          };
          const tx = await client.submitAndWait(transactionBlob, {
            wallet: clientWallet,
          });
          client.disconnect();
          let NFTokenID = getNFTokenID_mint(tx);
          // 5. Bound the NFTokenID with TokenIndex, submit to bridge ledger
          ic2xrp(TokenIndex, NFTokenID, userPrincipal, userXrpPublicKey).then(
            async (canisterRes_ic2xrp) => {
              if (typeof canisterRes_ic2xrp["ok"] == "undefined") {
                res.status(400).json({ res: "Ledger updated failed: ic2xrp" });
                return;
              } else {
                res.status(200).json({
                  res: {
                    ic: TokenIndex,
                    xrp: NFTokenID,
                    direction: "IC2XRP",
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
  });
} //End of mintToken
