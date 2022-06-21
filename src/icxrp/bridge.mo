import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Option "mo:base/Option";
import TrieSet "mo:base/TrieSet";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Nat32 "mo:base/Nat32";
import erc721_token "canister:nft";

// *****EXT lib Begin*****
import ExtCore "./ext/motoko/ext/Core";
import ExtCommon "./ext/motoko/ext/Common";
// *****EXT lib End*****

// *****BiMap from aviate-labs
import BiMap "./BiMap/BiMap";
import BiHashMap "./BiMap/BiHashMap";

shared(msg) actor class Bridge() = this{
    // *****EXT type Begin*****
    type AccountIdentifier = ExtCore.AccountIdentifier;
    type User = ExtCore.User;
    type Metadata = ExtCommon.Metadata;
    type BalanceRequest = ExtCore.BalanceRequest;
    type BalanceResponse = ExtCore.BalanceResponse;
    type TransferRequest = ExtCore.TransferRequest;
    type TransferResponse = ExtCore.TransferResponse;
    type TokenIdentifier = ExtCore.TokenIdentifier;
    type TokenIndex  = ExtCore.TokenIndex;

    // *****EXT type End*****

    type Result<Ok, Err> = {#ok : Ok; #err : Err};
    private stable var initializer: Principal = msg.caller;
    private stable var _custodiansState : [Principal] = [];
    private stable var custodians = TrieSet.empty<Principal>();
    custodians := TrieSet.put(custodians,initializer,Principal.hash(initializer),Principal.equal);
    

    // **************************Custodian management Begin**********************************
    // helper function
    private func _isCustodian(principal: Principal): Bool {
        return TrieSet.mem(custodians, principal, Principal.hash(principal), Principal.equal);
    };

    public shared (msg) func addCustodian(_custodian:Principal) : async Result<Principal, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };

        custodians := TrieSet.put(custodians,_custodian,Principal.hash(_custodian),Principal.equal);
        return #ok(_custodian);
        
    };
    // query
    public shared query (msg) func getCustodian() : async [Principal] {
        return TrieSet.toArray(custodians);
    };
    // **************************Custodian management End**********************************


    // **************************Set Up Begin**********************************

	private stable var _tokenMetadataState_ic : [(TokenIndex, Metadata)] = [];
    private var tokenMetadata_ic : HashMap.HashMap<TokenIndex, Metadata> = HashMap.fromIter(_tokenMetadataState_ic.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
	
    private stable var _tokenMetadataState_xrp : [(TokenIndex, Text)] = [];
    private var tokenMetadata_xrp : HashMap.HashMap<TokenIndex, Text> = HashMap.fromIter(_tokenMetadataState_xrp.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
    
    private stable var _idx2TokenIdentifierState : [(TokenIndex , TokenIdentifier)] = [];
    private var idx2TokenIdentifier : HashMap.HashMap<TokenIndex , TokenIdentifier> = HashMap.fromIter(_idx2TokenIdentifierState.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
    
    private stable var xrplIssuerPrivateKey:Text = "";
    private stable var xrplIssuerPrincipal:Principal = Principal.fromText("aaaaa-aa");  // Initialize by Blackhole

    // helper
    private func _thisCanister() : Principal {
      return Principal.fromActor(this);
    };

    // setter
    public shared (msg) func setXrplIssuerPrincipal(_xrplIssuerPrincipal:Principal) : async Result<Principal, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };
        
        xrplIssuerPrincipal := _xrplIssuerPrincipal;
        return #ok(xrplIssuerPrincipal);
    };

    public shared (msg) func setMetadata_xrp(_token:TokenIndex,_metadata:Text) : async Result<TokenIndex, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };
        tokenMetadata_xrp.put(_token,_metadata);
        return #ok(_token);
    };

    // Since EXT TokenIdentifier is so confused and terrible for frontend developement. 
    // We will preset the TokenIdentifier so we can use TokenIndex 
    public shared (msg) func setIdx2TokenIdentifier(_tokenIdentifier:TokenIdentifier) : async Result<TokenIndex, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };

        let idx = ExtCore.TokenIdentifier.getIndex(_tokenIdentifier);
        idx2TokenIdentifier.put(idx,_tokenIdentifier);
        return #ok(idx);
    };
    
    // =>Inter-canister call
    public shared (msg) func setMetadata_ic(): async Result<Text, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };

        // query from icNFTCanister
        let temp_tokenMetadataState:[(TokenIndex, Metadata)] = await erc721_token.getTokens();
        tokenMetadata_ic := HashMap.fromIter(temp_tokenMetadataState.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
        
        return #ok("Copy completed");
    };

    // query
    public query func getXrplIssuerPrincipal() : async Principal {
        return xrplIssuerPrincipal;
    };

    public query func getMetadata_ic(_token:TokenIndex) : async Result<Metadata, Text> {
        switch (tokenMetadata_ic.get(_token)){
            case (?metadata) {
                return #ok(metadata);
            };
            case _{
                return #err("Invalid token");
            };
        };
    };

    public query func getMetadata_xrp(_token:TokenIndex) : async Result<Text, Text> {
        switch (tokenMetadata_xrp.get(_token)){
            case (?metadata) {
                return #ok(metadata);
            };
            case _{
                return #err("Invalid token");
            };
        };
    };

    public query func getTokenIdentifier(_token:TokenIndex) : async Result<TokenIdentifier, Text> {
        switch (idx2TokenIdentifier.get(_token)){
            case (?tokenIdentifier) {
                return #ok(tokenIdentifier);
            };
            case _{
                return #err("Invalid token");
            };
        };
    };

    public query func getAccountIdentifier(_user:Principal) : async AccountIdentifier {
        let user:User = #principal(_user);
        return ExtCore.User.toAID(user);
    };


    public query func thisCanister() : async Principal {
      return Principal.fromActor(this);
    };



    // TODO: deploy after HTTP request enabel
    // public shared (msg) func setXrplIssuerPrivateKey(_xrplIssuerPrivateKey:Text) : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         xrplIssuerPrivateKey := _xrplIssuerPrivateKey;
    //         return #ok(xrplIssuerPrivateKey);
    //     }
    // };
    
    // public query shared (msg) func getXrplIssuerPrivateKey() : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         return #ok(xrplIssuerPrivateKey);
    //     }
    // };

    // public shared (msg) func setXRPLIssuerPrivateKey(_xrplIssuerPrivateKey:Text) : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         xrplIssuerPrivateKey := _xrplIssuerPrivateKey;
    //         return #ok(xrplIssuerPrivateKey);
    //     }
    // };
    
    // public shared (msg) func getXRPLIssuerPrivateKey() : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         return #ok(xrplIssuerPrivateKey);
    //     }
    // };

    // public shared (msg) func setICNFTCanister(_icNFTCanister:Principal) : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         icNFTCanister := _icNFTCanister;
    //         return #ok(Principal.toText(icNFTCanister));
    //     }
    // };
    
    // public shared (msg) func getICNFTCanister() : async Result<Text, Text> {
    //     if(not _isCustodian(msg.caller)){
    //         return #err("Unauthorized");
    //     }
    //     else{
    //         return #ok(Principal.toText(icNFTCanister));
    //     }
    // };
    // **************************Set Up End**********************************



    // **********************************Bridge**********************************
    type NFTokenID = Text; //The XRP tokenID ex. 000800000F042965467FB816B448462FD2FA45E23BC3F4D70A85CBBD00000022
    type XrpPublicKey = Text;

    type Account = {
        #ic: Principal;
        #xrp: XrpPublicKey;
    };

    type Operation = {
        #IC2XRP;
        #XRP2IC;
    };

    type TokenId = {
        ic:TokenIndex;
        xrp:NFTokenID;
    };

    type CrossBridgeTranscation = {
        op: Operation;
        index: Nat;
        tokenIndex: TokenId;
        from: Account;
        to: Account;
        timestamp: Time.Time;
    };

    private var _memo: Blob = Blob.fromArray([0:Nat8]);
    private stable var _tokenIdBiMapState : [(TokenIndex , NFTokenID)] = []; //We bound each TokenIndex(ic) with NFTokenID(xrp)
    private var tokenIdBiMap:BiMap.BiMap<TokenIndex, NFTokenID> = BiMap.fromIter(_tokenIdBiMapState.vals(),      
                                                                            BiHashMap.empty<TokenIndex,  NFTokenID>(0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash),
                                                                            BiHashMap.empty<NFTokenID, TokenIndex>(0, Text.equal, Text.hash),
                                                                            Text.equal);
    private stable var _isOnICState : [(TokenIndex , Bool)] = [];
    private var isOnIC : HashMap.HashMap<TokenIndex , Bool> = HashMap.fromIter(_isOnICState.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
    
    private stable var txs: [CrossBridgeTranscation] = [];
    private stable var txIndex: Nat = 0;



    private func Array_append<T>(xs:[T],ys:[T]):[T]{
        let zs : Buffer.Buffer<T> = Buffer.Buffer(xs.size()+ys.size());
        for (x in xs.vals()) {
            zs.add(x);
        };
        for (y in ys.vals()) {
            zs.add(y);
        };
        return zs.toArray();
    };

    private func addTxRecord(
        _op: Operation,
        _tokenIndex: TokenId,
        _from: Account,
        _to: Account,
        _timestamp: Time.Time): Nat {

        let record: CrossBridgeTranscation = {
            op = _op;
            index = txIndex;
            tokenIndex = _tokenIndex;
            from = _from;
            to = _to;
            timestamp = _timestamp;
        };
        txs := Array_append(txs, [record]);
        txIndex += 1;
        return txIndex - 1;
    };




    // Core 

    // Inter-canister call
    // to save Cycles, only custodian is enable to invoke this function for testing.
    // Users check the ownership by ext canister API `balance` not here
    // commet for production
    public shared (msg) func balance_bridge(_token: TokenIndex): async BalanceResponse {
        if (not _isCustodian(msg.caller) == false){
            return #err(#Other ("Unauthorized"));
        };
        switch (idx2TokenIdentifier.get(_token)){
            case (?tokenIdentifier) {
                let request: BalanceRequest = { 
                    user = #principal(msg.caller); 
                    token= tokenIdentifier;
                };
                let res:BalanceResponse = await erc721_token.balance(request);
                return res;
            };     
            case (_){
                return #err(#Other("The TokenIdentifier does not set up yet, or InvalidToken"));
            };
        };
    };


    // ic2xrp: this function has to update after Dfinity enables the HTTP request from canister
    // invoke this function right after/before mint NFT on xrp
    public shared (msg) func ic2xrp(_token_ic: TokenIndex, _token_xrp: NFTokenID, sender:Principal, receiver:XrpPublicKey): async BalanceResponse {
        
        // 1. verify {msg.caller} is the xrp issuer 
        if (msg.caller != xrplIssuerPrincipal){
            return #err(#Other("Only xrp issuer can invoke this func"));
        };
        
        switch (idx2TokenIdentifier.get(_token_ic)){
            case (?tokenIdentifier) {
                // 1. Verify if {thisCanister()} is the owner of {token} on {icNFTCanister} [Inter-canister call]
                let request: BalanceRequest = { 
                    user = #principal(_thisCanister()); 
                    token= tokenIdentifier;
                };
                let res: BalanceResponse = await erc721_token.balance(request);
                switch (res){
                    case (#ok 0){
                        return #err(#Other("The NFT does not stake on the bridge"));
                    };
                    case _{
                        switch (isOnIC.get(_token_ic)){
                            case (?false){
                                return #err(#Other("The NFT has been on XRP"));
                            };
                            case (_){
                                isOnIC.put(_token_ic,false);
                            };
                        };

                        let token:TokenId = {
                            ic = _token_ic;
                            xrp = _token_xrp;
                        };
                        let txid = addTxRecord(#IC2XRP,token, #ic(sender),#xrp(receiver),Time.now());
                        let ow:BiMap.Overwritten<TokenIndex,NFTokenID> = tokenIdBiMap.replace(_token_ic, _token_xrp);
                        return res;
                    };
                };
                // 2. send request to mint {token} on XRPL (update when Dfinity's canister outbound HTTP request is ready)
                // TODO
            };     
            case (_){
                return #err(#Other("The TokenIdentifier does not set up yet, or InvalidToken"));
            };
        };
    };
    // // => TODO: outbound HTTP request [Implement once Dfinity is done the upgrade]
    // private func requestMint_XRP(token: Nat) async async Result<Text, Text> {
    //     return #ok("[Implement once Dfinity is done the upgrade]")
    // }

    // xrp2ic: Only xrp issuer can call this func
    // invoke this function after burning NFT on xrp
    public shared (msg) func xrp2ic(_token_ic: TokenIndex, _token_xrp: NFTokenID, sender:XrpPublicKey, receiver:Principal): async TransferResponse {
        // 1. verify {msg.caller} is the xrp issuer 
        if (msg.caller != xrplIssuerPrincipal){
            return #err(#Unauthorized("Only xrp issuer can invoke this func"));
        };

        switch (idx2TokenIdentifier.get(_token_ic)){
            case (?tokenIdentifier) {
                switch (isOnIC.get(_token_ic)){
                    case (?true){
                        return #err(#Other("The NFT has been on IC"));
                    };
                    case (_){
                        isOnIC.put(_token_ic,true);
                    };
                };
                // 2. Verify if {receiver} is the owner of {_token} XRPL (update when Dfinity's canister outbound HTTP request is ready)
                // TODO

                // 3. send request to burn {_token} on XRPL (update when Dfinity's canister outbound HTTP request is ready)
                // TODO
                
                // 4. send tranfer the nft to mint {token} on IC [Inter-canister call]
                let req: TransferRequest = {
                    from = #principal(_thisCanister());
                    to = #principal(receiver);
                    token = tokenIdentifier;
                    amount = 1;
                    memo = _memo;
                    notify = false;
                    subaccount = null;
                };
                let res:TransferResponse =  await erc721_token.transfer(req);

                let token:TokenId = {
                    ic = _token_ic;
                    xrp = _token_xrp;
                };

                let txid = addTxRecord(#XRP2IC,token, #xrp(sender),#ic(receiver),Time.now());
                // ic2xrpMapping.put(_token_ic,_token_xrp);
                // xrp2icMapping.put(_token_xrp,_token_ic);
                let ow:BiMap.Overwritten<TokenIndex,NFTokenID> = tokenIdBiMap.replace(_token_ic, _token_xrp);

                return res;
            };     
            case (_){
                return #err(#Other("The TokenIdentifier does not set up yet, or InvalidToken"));
            };
        };
    };

    // // => TODO: outbound HTTP request [Implement once Dfinity is done the upgrade]
    // private func isOwner_XRP(token: Nat,_xrp_privateKey:Text) async async Result<Text, Text> {
    //     return #ok("[Implement once Dfinity is done the upgrade]")
    // }

    // // => TODO: outbound HTTP request [Implement once Dfinity is done the upgrade]
    // private func requestBurn_XRP(token: Nat,_xrp_privateKey:Text) async async Result<Text, Text> {
    //     return #ok("[Implement once Dfinity is done the upgrade]")
    // }
    
    // query
    // get the ic TokenIndex
    public query func getTokenId_ic(_token:NFTokenID) : async Result<TokenIndex,Text>{
        switch(tokenIdBiMap.getByRight(_token)){
            case (?tokenIndex) {
                return #ok(tokenIndex);
            };
            case _{
                return #err("Invalid token, or never cross bridge yet");
            };
        }; 
    };

    // get the xrp NFTokenID
    public query func getTokenId_xrp(_token:TokenIndex) : async Result<NFTokenID,Text>{
        switch(tokenIdBiMap.getByLeft(_token)){
            case (?nftokenID) {
                return #ok(nftokenID);
            };
            case _{
                return #err("Invalid token, or never cross bridge yet");
            };
        };
    };

    public query func getTransactions(start: Nat, limit: Nat): async [CrossBridgeTranscation] {
        var res: [CrossBridgeTranscation] = [];
        var i = start;
        while (i < start + limit and i < txs.size()) {
            res := Array_append(res, [txs[i]]);
            i += 1;
        };
        return res;
    };

    public query func getIsOnIC(_token:TokenIndex): async Result<Bool,Text> {
        switch(idx2TokenIdentifier.get(_token)){
            case (?tokenIdentifier) {
                switch (isOnIC.get(_token)){
                    case (?true){
                        return #ok(true);
                    };
                    case (?false){
                        return #ok(false);
                    };
                    case (_){
                        return #ok(true);
                    }
                };
            };
            case _{
                return #err("Invalid token");
            };
        };
    };

    private func _getIsOnIC(_token:TokenIndex): Result<Bool,Text> {
        switch(idx2TokenIdentifier.get(_token)){
            case (?tokenIdentifier) {
                switch (isOnIC.get(_token)){
                    case (?true){
                        return #ok(true);
                    };
                    case (?false){
                        return #ok(false);
                    };
                    case (_){
                        return #ok(true);
                    }
                };
            };
            case _{
                return #err("Invalid token");
            };
        };
    };

    type MetadataURL = {
        #metadata_ic : Metadata;
        #metadata_xrp : Text;
    };

    type TokenInfo = {
        tokenIndex : TokenIndex;
        tokenIdentifier: TokenIdentifier;
        nftokenID : NFTokenID;
        isOnIC: Bool;
        metadata: MetadataURL;
    };

    public query func getAllTokenInfo(): async Result<[TokenInfo],Text>{
        var res: [TokenInfo] = [];
        var limit = idx2TokenIdentifier.size();
        var i = 0;
        var _tokenIndex : TokenIndex = 0;
        var _tokenIdentifier: TokenIdentifier = "";
        var _isOnIC: Bool = true;
        var _metadata: MetadataURL = #metadata_xrp("");
        var _nftokenID:NFTokenID = "";
        var tokenInfo: TokenInfo = {
            tokenIndex = _tokenIndex;
            tokenIdentifier = _tokenIdentifier;
            nftokenID = _nftokenID;
            isOnIC = _isOnIC;
            metadata = _metadata;
        };

        while (i < limit) {
            _tokenIndex:= Nat32.fromNat(i);
            switch(idx2TokenIdentifier.get(_tokenIndex)){
                case(?tokenIdentifier){
                    _tokenIdentifier:=tokenIdentifier;
                };
                case (_) {
                    // return (#err("Invalid tokenIndex"));
                    return (#err("Invalid tokenIndex: idx2TokenIdentifier"));
                };
            };

            switch(tokenIdBiMap.getByLeft(_tokenIndex)){
                case (?nftokenID) {
                    _nftokenID := nftokenID;
                };
                case _ {
                    _nftokenID := "";
                };
            };

            switch(_getIsOnIC(_tokenIndex)){
                case(#ok onIC){
                    _isOnIC:=onIC;
                    if(_isOnIC){
                        switch (tokenMetadata_ic.get(_tokenIndex)){
                            case (?metadata) {
                                _metadata := #metadata_ic(metadata)
                            };
                            case _{
                                return #err("tokenIndex: tokenMetadata_ic");
                            };
                        };
                    }
                    else{
                        switch (tokenMetadata_xrp.get(_tokenIndex)){
                            case (?metadata) {
                                _metadata := #metadata_xrp(metadata)
                            };
                            case _{
                                return #err("tokenIndex: tokenMetadata_xrp");
                            };
                        };
                    };
                };
                case(#err err_msg){
                    return #err("tokenIndex: _getIsOnIC");
                };
            };
            tokenInfo:= {
                tokenIndex = _tokenIndex;
                tokenIdentifier = _tokenIdentifier;
                nftokenID = _nftokenID;
                isOnIC = _isOnIC;
                metadata = _metadata;
            };
            res := Array_append(res, [tokenInfo]);
            i += 1;
        };
        return #ok(res);
        };


    // **********************************Bridge**********************************

    system func preupgrade() {
        _custodiansState := TrieSet.toArray(custodians);
        _tokenMetadataState_ic := Iter.toArray(tokenMetadata_ic.entries());
        _tokenMetadataState_xrp := Iter.toArray(tokenMetadata_xrp.entries());
        _idx2TokenIdentifierState := Iter.toArray(idx2TokenIdentifier.entries());
        _tokenIdBiMapState := Iter.toArray(tokenIdBiMap.entries());
        _isOnICState:= Iter.toArray(isOnIC.entries());

    };

    system func postupgrade() {
        custodians := TrieSet.fromArray<Principal>(_custodiansState,Principal.hash,Principal.equal);
        tokenMetadata_ic := HashMap.fromIter(_tokenMetadataState_ic.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
        tokenMetadata_xrp := HashMap.fromIter(_tokenMetadataState_xrp.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
        idx2TokenIdentifier := HashMap.fromIter(_idx2TokenIdentifierState.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
        tokenIdBiMap:= BiMap.fromIter(_tokenIdBiMapState.vals(),      
                                    BiHashMap.empty<TokenIndex,  NFTokenID>(0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash),
                                    BiHashMap.empty<NFTokenID, TokenIndex>(0, Text.equal, Text.hash),
                                    Text.equal);
        isOnIC := HashMap.fromIter(_isOnICState.vals(), 0, ExtCore.TokenIndex.equal, ExtCore.TokenIndex.hash);
        _custodiansState := [];
        _tokenMetadataState_ic :=[];
        _tokenMetadataState_xrp := [];
        _idx2TokenIdentifierState := [];
        _tokenIdBiMapState := [];
        _isOnICState :=[];
    };
};
