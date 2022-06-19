const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ ok: IDL.Principal, err: IDL.Text });
  const TokenIndex = IDL.Nat32;
  const Balance = IDL.Nat;
  const TokenIdentifier = IDL.Text;
  const CommonError = IDL.Variant({
    InvalidToken: TokenIdentifier,
    Other: IDL.Text,
  });
  const BalanceResponse = IDL.Variant({ ok: Balance, err: CommonError });
  const AccountIdentifier__1 = IDL.Text;
  const TokenIdentifier__1 = IDL.Text;
  const Metadata = IDL.Variant({
    fungible: IDL.Record({
      decimals: IDL.Nat8,
      metadata: IDL.Opt(IDL.Vec(IDL.Nat8)),
      name: IDL.Text,
      symbol: IDL.Text,
    }),
    nonfungible: IDL.Record({ metadata: IDL.Opt(IDL.Vec(IDL.Nat8)) }),
  });
  const MetadataURL = IDL.Variant({
    metadata_ic: Metadata,
    metadata_xrp: IDL.Text,
  });
  const NFTokenID = IDL.Text;
  const TokenInfo = IDL.Record({
    tokenIdentifier: TokenIdentifier__1,
    tokenIndex: TokenIndex,
    metadata: MetadataURL,
    isOnIC: IDL.Bool,
    nftokenID: NFTokenID,
  });
  const Result_7 = IDL.Variant({ ok: IDL.Vec(TokenInfo), err: IDL.Text });
  const Result_6 = IDL.Variant({ ok: IDL.Bool, err: IDL.Text });
  const Result_5 = IDL.Variant({ ok: Metadata, err: IDL.Text });
  const Result_2 = IDL.Variant({ ok: IDL.Text, err: IDL.Text });
  const Result_1 = IDL.Variant({ ok: TokenIndex, err: IDL.Text });
  const Result_4 = IDL.Variant({ ok: NFTokenID, err: IDL.Text });
  const Result_3 = IDL.Variant({ ok: TokenIdentifier__1, err: IDL.Text });
  const Operation = IDL.Variant({ XRP2IC: IDL.Null, IC2XRP: IDL.Null });
  const XrpPublicKey = IDL.Text;
  const Account = IDL.Variant({ ic: IDL.Principal, xrp: XrpPublicKey });
  const TokenId = IDL.Record({ ic: TokenIndex, xrp: NFTokenID });
  const Time = IDL.Int;
  const CrossBridgeTranscation = IDL.Record({
    op: Operation,
    to: Account,
    tokenIndex: TokenId,
    from: Account,
    timestamp: Time,
    index: IDL.Nat,
  });
  const AccountIdentifier = IDL.Text;
  const TransferResponse = IDL.Variant({
    ok: Balance,
    err: IDL.Variant({
      CannotNotify: AccountIdentifier,
      InsufficientBalance: IDL.Null,
      InvalidToken: TokenIdentifier,
      Rejected: IDL.Null,
      Unauthorized: AccountIdentifier,
      Other: IDL.Text,
    }),
  });
  const Bridge = IDL.Service({
    addCustodian: IDL.Func([IDL.Principal], [Result], []),
    balance_bridge: IDL.Func([TokenIndex], [BalanceResponse], []),
    getAccountIdentifier: IDL.Func(
      [IDL.Principal],
      [AccountIdentifier__1],
      ["query"]
    ),
    getAllTokenInfo: IDL.Func([], [Result_7], ["query"]),
    getCustodian: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    getIsOnIC: IDL.Func([TokenIndex], [Result_6], ["query"]),
    getMetadata_ic: IDL.Func([TokenIndex], [Result_5], ["query"]),
    getMetadata_xrp: IDL.Func([TokenIndex], [Result_2], ["query"]),
    getTokenId_ic: IDL.Func([NFTokenID], [Result_1], ["query"]),
    getTokenId_xrp: IDL.Func([TokenIndex], [Result_4], ["query"]),
    getTokenIdentifier: IDL.Func([TokenIndex], [Result_3], ["query"]),
    getTransactions: IDL.Func(
      [IDL.Nat, IDL.Nat],
      [IDL.Vec(CrossBridgeTranscation)],
      ["query"]
    ),
    getXrplIssuerPrincipal: IDL.Func([], [IDL.Principal], ["query"]),
    ic2xrp: IDL.Func(
      [TokenIndex, NFTokenID, IDL.Principal, XrpPublicKey],
      [BalanceResponse],
      []
    ),
    setIdx2TokenIdentifier: IDL.Func([TokenIdentifier__1], [Result_1], []),
    setMetadata_ic: IDL.Func([], [Result_2], []),
    setMetadata_xrp: IDL.Func([TokenIndex, IDL.Text], [Result_1], []),
    setXrplIssuerPrincipal: IDL.Func([IDL.Principal], [Result], []),
    thisCanister: IDL.Func([], [IDL.Principal], ["query"]),
    xrp2ic: IDL.Func(
      [TokenIndex, NFTokenID, XrpPublicKey, IDL.Principal],
      [TransferResponse],
      []
    ),
  });
  return Bridge;
};
module.exports = { idlFactory };
