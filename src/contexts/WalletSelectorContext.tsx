'use client'
import React, { useCallback, useContext, useEffect, useState } from "react";
import { map, distinctUntilChanged } from "rxjs";
import {
    NetworkId,
    setupWalletSelector,
    Wallet,
} from "@near-wallet-selector/core";
import type { WalletSelector, AccountState } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { createConfig } from "wagmi";
import { createWeb3Modal } from "@web3modal/wagmi";
import { setupEthereumWallets } from "@near-wallet-selector/ethereum-wallets";
import { http, injected } from "@wagmi/core";
import { walletConnect } from "@wagmi/connectors";
import create from "zustand/vanilla";
import "@near-wallet-selector/modal-ui/styles.css";

export interface WalletStore {
    selector: WalletSelector | null;
    modal: WalletSelectorModal | null;
    account_id: string | null;
    wallet: Wallet | null;
}

export const store = create<WalletStore>(() => ({
    selector: null,
    modal: null,
    account_id: null,
    wallet: null,
}));

declare global {
    interface Window {
        selector: WalletSelector;
        modal: WalletSelectorModal;
        account_id: string | null;
        wallet: Wallet | null;
    }
}

interface WalletSelectorContextValue {
    selector: WalletSelector;
    modal: WalletSelectorModal;
    accounts: Array<AccountState>;
    accountId: string | null;
    // isConnected: boolean;
    // openConnectModal: (() => void) | undefined;
    // address: `0x${string}` | undefined;
    // network: Network;
}

export type Network = "near" | "aurora" | "ethereum" | "q" | "solana" | "icp";

enum Wallets {
    MyNearWallet = "mynearwallet",
    Here = "here",
    EthereumWallets = "ethereumwallets"
}

const WalletSelectorContext =
    React.createContext<WalletSelectorContextValue | null>(null);

export const WalletSelectorContextProvider: any = ({ children }: any) => {
    const NETWORK_ID = "testnet";
    const [selector, setSelector] = useState<WalletSelector | null>(null);
    const [modal, setModal] = useState<WalletSelectorModal | null>(null);
    const [accounts, setAccounts] = useState<Array<AccountState>>([]);
    const DEFAULT_ENABLE_WALLETS = [
        "mynearwallet",
        "here",
        "ethereumwallets"
    ];

    const setupWallets = () => {
        let modules: any[] = [];
        const enableWallets = DEFAULT_ENABLE_WALLETS;
        enableWallets.forEach((w: string) => {
            switch (w) {
                case Wallets.MyNearWallet: {
                    modules.push(
                        setupMyNearWallet({
                            iconUrl: "/assets/my-near-wallet-icon.png",
                        })
                    );
                    break;
                }
                case Wallets.Here: {
                    modules.push(setupHereWallet());
                    break;
                }
                case Wallets.EthereumWallets: {
                    modules.push(
                        setupEthereumWallets({ wagmiConfig, web3Modal, alwaysOnboardDuringSignIn: true }),
                    )
                    break
                }
            }
        });
        return modules;
    };

    const init = useCallback(async () => {
        const _selector = await setupWalletSelector({
            network: NETWORK_ID as NetworkId,
            debug: true,
            modules: setupWallets(),
        });

        const _modal = setupModal(_selector, {
            contractId: "meta-v2.pool.testnet",
        });
        const state = _selector.store.getState();
        setAccounts(state.accounts);

        store.setState({
            selector: _selector,
            modal: _modal,
            account_id: _selector.isSignedIn()
                ? _selector.store.getState().accounts.find((account) => account.active)
                    ?.accountId || null
                : null,
            wallet: _selector.isSignedIn() ? await _selector.wallet() : null,
        });

        // keep window global variables
        window.selector = _selector;
        window.modal = _modal;
        window.account_id = _selector.isSignedIn()
            ? _selector.store.getState().accounts.find((account) => account.active)
                ?.accountId || null
            : null;
        window.wallet = _selector.isSignedIn() ? await _selector.wallet() : null;

        setSelector(_selector);
        setModal(_modal);
    }, []);

    useEffect(() => {
        init().catch((err) => {
            console.error(1, err);
            alert("Failed to initialize wallet selector");
        });
    }, [init]);

    useEffect(() => {
        if (!selector) {
            return;
        }

        const subscription = selector.store.observable
            .pipe(
                map((state) => state.accounts), // If breaks, update rxjs
                distinctUntilChanged()
            )
            .subscribe(async (nextAccounts) => {
                const wallet = selector.isSignedIn() ? await selector.wallet() : null;
                setAccounts(nextAccounts);
                store.setState((prev) => ({
                    modal: modal,
                    selector: selector,
                    wallet: wallet,
                    account_id: nextAccounts.find(
                        (account: AccountState) => account.active
                    )?.accountId!,
                }));
                // keep window global VARIABLES
                window.account_id = nextAccounts.find(
                    (account: AccountState) => account.active
                )?.accountId!;
            });

        return () => subscription.unsubscribe();
    }, [selector]);

    if (!selector || !modal) {
        return null;
    }

    const accountId =
        accounts.find((account) => account.active)?.accountId || null;

    return (
        <WalletSelectorContext.Provider
            value={{
                selector,
                modal,
                accounts,
                accountId,
                // isConnected,
                // openConnectModal,
                // address,
                // network,
            }}
        >
            {children}
        </WalletSelectorContext.Provider>
    );
};

export function useWalletSelector() {
    const context = useContext(WalletSelectorContext);

    if (!context) {
        throw new Error(
            "useWalletSelector must be used within a WalletSelectorContextProvider"
        );
    }

    return context;
}

//////////////////////////////////////// ETHEREUM WALLET ADDS ///////////////////
const NETWORK_ID = "testnet"
const evmWalletChains = {
    testnet: {
        nearEnv: "testnet",
        chainId: 398,
        walletExplorerUrl: "https://eth-explorer-testnet.near.org",
        explorerUrl: "https://testnet.nearblocks.io",
        ethRpcForNear: "https://eth-rpc.testnet.near.org",
        nearNativeRpc: "https://rpc.testnet.near.org"
    },
    mainnet: {
        chainId: 397,
        nearEnv: "mainnet",
        walletExplorerUrl: "https://eth-explorer.near.org",
        explorerUrl: "https://nearblocks.io",
        ethRpcForNear: "https://eth-rpc.mainnet.near.org",
        nearNativeRpc: "https://rpc.mainnet.near.org"
    }
}
export const EVMWalletChain = evmWalletChains[NETWORK_ID as NetworkId];
const reownProjectId = "040186c6dae322540b4ee1fbb732cb7d"
const nearChain = {
    id: EVMWalletChain.chainId,
    name: `NEAR Protocol Testnet`,
    nativeCurrency: {
        decimals: 18,
        name: "NEAR",
        symbol: "NEAR",
    },
    rpcUrls: {
        default: { http: [EVMWalletChain.ethRpcForNear] },
        public: { http: [EVMWalletChain.ethRpcForNear] },
    },
    blockExplorers: {
        default: {
            name: "NEAR Explorer",
            url: EVMWalletChain.walletExplorerUrl,
        },
    },
    testnet: true,
};
// export const wagmiConfig = createConfig();
// @ts-ignore
export const wagmiConfig = createConfig({
    chains: [nearChain],
    transports: { [nearChain.id]: http() },
    connectors: [
        walletConnect({ projectId: reownProjectId, showQrModal: false }),
        injected({ shimDisconnect: true }),
    ],
});

const web3Modal = createWeb3Modal({
    wagmiConfig: wagmiConfig,
    // Get a project ID at https://cloud.walletconnect.com
    projectId: reownProjectId,
});


// reconnect(wagmiConfig)
