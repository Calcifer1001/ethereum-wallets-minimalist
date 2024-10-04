import { WalletSelectorContextProvider } from "@/contexts/WalletSelectorContext";
import ConnectButton from "@/components/ConnectButton";
import "../styles/modal.css";

export default function Home() {

  return (
    <WalletSelectorContextProvider>
      <ConnectButton />
    </WalletSelectorContextProvider>
  );
}
