const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ ok: IDL.Principal, err: IDL.Text });
  const PublicKey = IDL.Text;
  const XRPAccount = IDL.Record({
    publicKey: PublicKey,
    privateKey: IDL.Text,
  });
  const Result_2 = IDL.Variant({
    ok: IDL.Vec(IDL.Tuple(IDL.Principal, XRPAccount)),
    err: IDL.Text,
  });
  const Result = IDL.Variant({ ok: XRPAccount, err: IDL.Text });
  const XRPAccountManager = IDL.Service({
    addCustodian: IDL.Func([IDL.Principal], [Result_1], []),
    getAllPublicKey: IDL.Func([], [IDL.Vec(PublicKey)], ["query"]),
    getMapping: IDL.Func([], [Result_2], ["query"]),
    getXRPAccount: IDL.Func([], [Result], ["query"]),
    isRegisteredUser: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),
    removeCustodian: IDL.Func([IDL.Principal], [Result_1], []),
    setXRPAccount: IDL.Func([IDL.Text, IDL.Text], [Result], []),
    setXRPAccountByCustodian: IDL.Func(
      [IDL.Principal, IDL.Text, IDL.Text],
      [Result],
      []
    ),
    whoAreCustodians: IDL.Func([], [IDL.Vec(IDL.Principal)], ["query"]),
    whoami: IDL.Func([], [IDL.Principal], ["query"]),
  });
  return XRPAccountManager;
};
module.exports = { idlFactory };
