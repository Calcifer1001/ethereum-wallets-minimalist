'use client'
import { useWalletSelector } from "@/contexts/WalletSelectorContext";

const ConnectButton = () => {
    const { selector, modal, accounts, accountId } = useWalletSelector();
  
    const handleSignIn = () => {
      modal.show();
    };
  
    return (
      <>
        <button onClick={() => handleSignIn()}>
          Connect
        </button>
      </>
    );
  };
  
  export default ConnectButton;