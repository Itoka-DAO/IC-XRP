dfx build --network ic;
dfx canister --network ic install nft --mode=reinstall;
dfx canister --network ic install xrp --mode=reinstall;
dfx canister --network ic install bridge --mode=reinstall;
dfx canister --network ic call xrp addCustodian '(principal "73jfg-yhj3z-ymx2k-jay75-at7w7-j2m74-msxax-ytnhk-bcp7t-vpsa7-5qe")';
dfx canister --network ic call nft setMinter '(principal "73jfg-yhj3z-ymx2k-jay75-at7w7-j2m74-msxax-ytnhk-bcp7t-vpsa7-5qe")';
dfx canister --network ic call bridge addCustodian '(principal "73jfg-yhj3z-ymx2k-jay75-at7w7-j2m74-msxax-ytnhk-bcp7t-vpsa7-5qe")';
dfx canister --network ic call bridge setXrplIssuerPrincipal '(principal "73jfg-yhj3z-ymx2k-jay75-at7w7-j2m74-msxax-ytnhk-bcp7t-vpsa7-5qe")';