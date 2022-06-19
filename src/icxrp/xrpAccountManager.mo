import Principal "mo:base/Principal";
import TrieSet "mo:base/TrieSet";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Result "mo:base/Result";
import Iter "mo:base/Iter";

shared(msg) actor class XRPAccountManager() {
    type PublicKey = Text; 
    private stable var owner_: Principal = msg.caller;
    private stable var _custodiansState: [Principal] = [];
    private var custodians = TrieSet.empty<Principal>();
    custodians := TrieSet.put(custodians,owner_,Principal.hash(owner_),Principal.equal);
    private stable var account_number = 0;
    private stable var icp_xrp_map_state : [(Principal, XRPAccount)] = [];// Every ic user bound with one xrp account
    private var icp_xrp_map : HashMap.HashMap<Principal , XRPAccount> = HashMap.fromIter(icp_xrp_map_state.vals(), 0, Principal.equal, Principal.hash);
    
    type Result<Ok, Err> = {#ok : Ok; #err : Err};

    public type XRPAccount = {
        publicKey:PublicKey;
        privateKey:Text;
    };

    // Pre-set: 
    // Commet for production 
    // 1
    // let new_account1 : XRPAccount = {
    //     publicKey ="rhvr23phYr6etpQrqJ7gKiSrZwV537ht8p";
    //     privateKey = "sntutyJG497hCN5gbQgdjVhyGSU5q";
    // };
    // let preSetUser1 = Principal.fromText("5gmo5-uvhcx-d4fqb-yhovm-7din3-qfkn7-3zacz-b46b2-wunfx-z5mn7-zqe");
    // icp_xrp_map.put(preSetUser1, new_account1);
    // // 2
    // let new_account2 : XRPAccount = {
    //     publicKey ="r96zT8AQBH5TtzPtMBTF743KGWVhBYWdm9";
    //     privateKey = "ssN1jZverzY8N6jht1dWXEcysTBqb";
    // };
    // let preSetUser2 = Principal.fromText("kye5v-m3cab-25yej-36xcv-xbaem-jctnm-rblgw-xa526-v7fne-4rsz3-5qe");
    // icp_xrp_map.put(preSetUser2, new_account2);


    //Custodians management
    private func _isCustodian(principal: Principal): Bool {
        return TrieSet.mem(custodians, principal, Principal.hash(principal), Principal.equal);
    };

    // dfx canister --network ic call xrp whoAreCustodians
    public query func whoAreCustodians() : async [Principal] {
        return TrieSet.toArray(custodians);
    };

    public shared query (msg) func whoami() : async Principal {
        return msg.caller;
    };

    // dfx canister --network ic call xrp addCustodian "(principal \"ijans-xmfmz-dn2yn-q3aa5-lvuvu-jc3rw-z4a25-up7zn-46sxi-dogsc-tqe\")"
    public shared (msg) func addCustodian(new_custodian:Principal) :  async Result<Principal, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        }else if(_isCustodian(new_custodian)){
            return #err("The object has already existed");
        }else{
            custodians := TrieSet.put(custodians,new_custodian,Principal.hash(new_custodian),Principal.equal);
            return #ok(new_custodian);
        }
    };

    public shared (msg) func removeCustodian(removed_custodian:Principal) :  async Result<Principal, Text> {
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        }else if(not _isCustodian(removed_custodian)){
            return #err("The object does not exist");
        }
        else
        {
            custodians := TrieSet.delete(custodians,removed_custodian,Principal.hash(removed_custodian),Principal.equal);
            return #ok(removed_custodian);
        }
    };

    // get mapping for xrp issuer 
    public shared query (msg) func getMapping() : async Result<[(Principal, XRPAccount)], Text>
    {   
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };
        return #ok(Iter.toArray(icp_xrp_map.entries()));
    };

    public query func isRegisteredUser(who:Principal) : async Bool {   
        switch (icp_xrp_map.get(who)) {
            case (?user) {
                return true
            };
            case _ {
                return false 
            };
        };  
    };

    public shared query (msg)  func getXRPAccount() : async Result<XRPAccount, Text> {   
        switch (icp_xrp_map.get(msg.caller)) {
            case (?user) {
                return #ok(user)
            };
            case _ {
                return #err("User does not have a XRP account. Set an account for the user first")
            };
        };  
    };


    private func getPublicKey(account:XRPAccount):PublicKey{
        return account.publicKey;
    };    


    public shared query func getAllPublicKey() : async [PublicKey] {   
        return Iter.toArray(Iter.map<XRPAccount,PublicKey>(icp_xrp_map.vals(),getPublicKey));
    };


    public shared (msg) func setXRPAccount(_publicKey:Text,_privateKey:Text) : async Result<XRPAccount, Text> {   
        switch (icp_xrp_map.get(msg.caller)) {
            case (?user) {
                return #err("Prevent from overriding: User has a XRP account");
            };
            case _ {
                let new_account : XRPAccount = {
                    publicKey =_publicKey;
                    privateKey = _privateKey;
                };
                icp_xrp_map.put(msg.caller, new_account);
                return #ok(new_account);
            };
        }; 
    };

    public shared (msg) func setXRPAccountByCustodian(who:Principal,_publicKey:Text,_privateKey:Text) : async Result<XRPAccount, Text> {   
        if(not _isCustodian(msg.caller)){
            return #err("Unauthorized");
        };
        let new_account : XRPAccount = {
            publicKey =_publicKey;
            privateKey = _privateKey;
        };
        icp_xrp_map.put(who, new_account);
        return #ok(new_account);
    };


    system func preupgrade() {
        icp_xrp_map_state := Iter.toArray(icp_xrp_map.entries());
        _custodiansState := TrieSet.toArray(custodians);
    };
    system func postupgrade() {
        _custodiansState := [];
        icp_xrp_map_state:= [];
    };
};
