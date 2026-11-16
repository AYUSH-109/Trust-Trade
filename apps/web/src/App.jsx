import { useEffect, useState } from "react";
import { createWalletClient, custom, parseEventLogs } from "viem";
import {
  escrowAbi,
  escrowContractAddress,
  escrowDeliveryWindow,
  calculateRequiredWei,
  formatEther,
  getEscrowClients,
  getListingContractId,
  parseEther
} from "./escrow";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const maximumImages = 5;
const targetChainId = BigInt(import.meta.env.VITE_CHAIN_ID ?? "11155111");
const targetChainName = import.meta.env.VITE_CHAIN_NAME ?? "Sepolia";

function getWalletErrorMessage(error) {
  if (error?.code === 4001 || error?.name === "UserRejectedRequestError") {
    return "Signature request was cancelled in MetaMask.";
  }
  if (error?.code === -32002) {
    return "MetaMask already has a request open. Open the extension and finish it first.";
  }
  if (error?.name === "ConnectorNotFoundError") {
    return "MetaMask is not available in this browser.";
  }
  return error?.shortMessage ?? error?.message ?? "Wallet sign-in failed.";
}

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") ?? "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok) {
    throw new Error(result.error ?? fallbackMessage);
  }
  return result;
}

function App() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: ""
  });
  const [files, setFiles] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsStatus, setListingsStatus] = useState("loading");
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [wallet, setWallet] = useState("");
  const [authStatus, setAuthStatus] = useState("idle");
  const [chainId, setChainId] = useState("");
  const [networkStatus, setNetworkStatus] = useState("idle");
  const [token, setToken] = useState(() => localStorage.getItem("trust_trade_token") ?? "");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    contactInfo: ""
  });
  const [profileStatus, setProfileStatus] = useState({ type: "idle", message: "" });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    category: ""
  });
  const [escrowAmount, setEscrowAmount] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderAmount, setSelectedOrderAmount] = useState("");
  const [ethQuote, setEthQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");
  const [screen, setScreen] = useState("landing");
  const [profileOpen, setProfileOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatRecipientId, setChatRecipientId] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Session expired");
        setWallet(result.data.wallet);
        setUserId(result.data.id);
        setProfile({
          name: result.data.name ?? "",
          email: result.data.email ?? "",
          phone: result.data.phone ?? "",
          contactInfo: result.data.contactInfo ?? ""
        });
        setAuthStatus("Connected");
        setScreen("marketplace");
      })
      .catch((error) => {
        console.error(error);
        handleLogout();
      });

    return undefined;
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    fetch(`${apiUrl}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load orders");
        setOrders(result.data);
      })
      .catch((error) => console.error(error));

    return undefined;
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    fetch(`${apiUrl}/api/offers`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load offers");
        setOffers(result.data);
      })
      .catch((error) => console.error(error));

    return undefined;
  }, [token]);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = () => {
      handleLogout("Wallet changed. Connect again.");
    };
    const handleChainChanged = (nextChainId) => {
      setChainId(nextChainId);
      if (BigInt(nextChainId) !== targetChainId) {
        setNetworkStatus("unsupported");
        handleLogout(`Unsupported network. Switch MetaMask to ${targetChainName}.`);
        return;
      }

      setNetworkStatus("supported");
      handleLogout("Network changed. Connect again.");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    async function loadListings() {
      try {
        const response = await fetch(`${apiUrl}/api/listings`);
        if (!response.ok) throw new Error("Unable to load listings");
        const result = await response.json();
        setListings(result.data);
        setListingsStatus("ready");
      } catch (error) {
        console.error(error);
        setListingsStatus("error");
      }
    }

    loadListings();
  }, []);

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    };
  }, [files]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleFilesChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setFiles(
      selectedFiles.slice(0, maximumImages).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }))
    );
  }

  async function ensureSupportedNetwork() {
    if (!window.ethereum) {
      setNetworkStatus("unsupported");
      setAuthStatus("MetaMask is not installed.");
      return false;
    }

    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    setChainId(currentChainId);

    if (BigInt(currentChainId) !== targetChainId) {
      setNetworkStatus("unsupported");
      setAuthStatus(`Switch MetaMask to ${targetChainName} before connecting.`);
      return false;
    }

    setNetworkStatus("supported");
    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Creating listing..." });

    const body = new FormData();
    Object.entries(form).forEach(([name, value]) => body.append(name, value));
    files.forEach(({ file }) => body.append("images", file));

    try {
      const response = await fetch(`${apiUrl}/api/listings`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body
      });
      const result = await response.json();

      if (!response.ok) {
        const message = result.error ?? Object.values(result.errors ?? {}).join(", ");
        throw new Error(message || "Unable to create listing");
      }

      setStatus({
        type: "success",
        message: `Listing created with ${result.data.images.length} image(s).`
      });
      setListings((current) => [result.data, ...current]);
      setForm({ title: "", description: "", price: "", category: "" });
      setFiles([]);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function handleConnectWallet() {
    if (!window.ethereum) {
      setAuthStatus("MetaMask is not installed");
      return;
    }

    setAuthStatus("Connecting...");

    try {
      if (!(await ensureSupportedNetwork())) return;

      const client = createWalletClient({
        chain: {
          id: Number(targetChainId),
          name: targetChainName,
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [window.location.origin] } }
        },
        transport: custom(window.ethereum)
      });
      const addresses = await client.requestAddresses();
      const address = addresses[0];
      if (!address) {
        throw new Error("MetaMask did not return an account. Unlock the wallet and try again.");
      }
      const challengeResponse = await fetch(`${apiUrl}/api/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address })
      });
      const challengeResult = await readApiResponse(challengeResponse, "Unable to start authentication");
      if (!challengeResult.data?.message || !challengeResult.data?.nonce) {
        throw new Error("The server returned an invalid sign-in challenge.");
      }

      const signature = await client.signMessage({
        account: address,
        message: challengeResult.data.message
      });
      const verifyResponse = await fetch(`${apiUrl}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          nonce: challengeResult.data.nonce,
          signature
        })
      });
      const verifyResult = await readApiResponse(verifyResponse, "Unable to verify wallet");
      if (!verifyResult.data?.token || !verifyResult.data?.user?.id) {
        throw new Error("The server returned an invalid sign-in response.");
      }

      setWallet(verifyResult.data.user.wallet);
      setUserId(verifyResult.data.user.id);
      setToken(verifyResult.data.token);
      localStorage.setItem("trust_trade_token", verifyResult.data.token);
      setAuthStatus("Connected");
      setScreen("marketplace");
    } catch (error) {
      console.error(error);
      setAuthStatus(getWalletErrorMessage(error));
    }

  }

  function handleLogout(message = "Disconnected") {
    localStorage.removeItem("trust_trade_token");
    setToken("");
    setWallet("");
    setUserId("");
    setChainId("");
    setNetworkStatus("idle");
    setAuthStatus(message);
    setEditMode(false);
    setScreen("landing");
    setProfileOpen(false);
  }

  function navigateTo(nextScreen) {
    setScreen(nextScreen);
    setProfileOpen(false);
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileStatus({ type: "loading", message: "Saving profile..." });
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update profile");
      setProfile({
        name: result.data.name ?? "",
        email: result.data.email ?? "",
        phone: result.data.phone ?? "",
        contactInfo: result.data.contactInfo ?? ""
      });
      setProfileStatus({ type: "success", message: "Profile saved." });
    } catch (error) {
      setProfileStatus({ type: "error", message: error.message });
    }
  }

  async function handleListingSelect(listingId) {
    setDetailStatus("loading");

    try {
      const response = await fetch(`${apiUrl}/api/listings/${listingId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load listing");
      }

      setSelectedListing(result.data);
      setChatRecipientId(result.data.seller.id);
      setEditForm({
        title: result.data.title,
        description: result.data.description,
        price: result.data.price,
        category: result.data.category
      });
      setEditMode(false);
      setEscrowAmount("");
      setSelectedOrderId("");
      setSelectedOrderAmount("");
      await loadEthQuote(result.data.id, result.data.price);
      setDetailStatus("ready");
    } catch (error) {
      console.error(error);
      setDetailStatus("error");
    }

  }

  async function loadEthQuote(listingId, listingPrice = selectedListing?.price) {
    setQuoteStatus("loading");

    try {
      const response = await fetch(`${apiUrl}/api/market/eth-inr`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load ETH/INR quote");

      const requiredWei = calculateRequiredWei(listingPrice, result.data.ratePaise);
      setEthQuote({ ...result.data, listingId });
      setEscrowAmount(formatEther(requiredWei));
      setQuoteStatus("ready");
    } catch (error) {
      console.error(error);
      setEthQuote(null);
      setQuoteStatus("error");
    }
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function handleUpdateListing(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Saving listing..." });

    try {
      const response = await fetch(`${apiUrl}/api/listings/${selectedListing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update listing");

      setSelectedListing(result.data);
      setListings((current) =>
        current.map((listing) => (listing.id === result.data.id ? result.data : listing))
      );
      setEditMode(false);
      setStatus({ type: "success", message: "Listing updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function handleDeleteListing() {
    if (!window.confirm("Delete this listing?")) return;

    try {
      const response = await fetch(`${apiUrl}/api/listings/${selectedListing.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete listing");

      setListings((current) =>
        current.filter((listing) => listing.id !== selectedListing.id)
      );
      setSelectedListing(null);
      setStatus({ type: "success", message: "Listing deleted." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

  }

  async function handleBuyWithEscrow() {
    if (!window.ethereum) {
      setStatus({ type: "error", message: "MetaMask is not installed." });
      return;
    }
    if (!escrowContractAddress) {
      setStatus({ type: "error", message: "Escrow contract is not configured." });
      return;
    }
    if (!wallet || selectedListing.seller.wallet.toLowerCase() === wallet.toLowerCase()) {
      setStatus({ type: "error", message: "You cannot buy your own listing." });
      return;
    }
    if (!escrowAmount || Number(escrowAmount) <= 0) {
      setStatus({ type: "error", message: "The required ETH amount is not available." });
      return;
    }
    if (
      !ethQuote ||
      ethQuote.listingId !== selectedListing.id ||
      Date.parse(ethQuote.expiresAt) <= Date.now()
    ) {
      setStatus({ type: "error", message: "The ETH/INR quote expired. Refresh it before paying." });
      await loadEthQuote(selectedListing.id, selectedListing.price);
      return;
    }

    setStatus({ type: "loading", message: "Confirm the escrow transaction in MetaMask..." });

    try {
      if (!(await ensureSupportedNetwork())) return;

      const { publicClient, walletClient } = getEscrowClients(
        window.ethereum,
        targetChainId
      );
      const [account] = await walletClient.requestAddresses();
      const paymentPrice = selectedOrderAmount || selectedListing.price;
      const expectedWei = calculateRequiredWei(paymentPrice, ethQuote.ratePaise);
      const hash = await walletClient.writeContract({
        address: escrowContractAddress,
        abi: escrowAbi,
        functionName: "createEscrow",
        account,
        args: [
          selectedListing.seller.wallet,
          getListingContractId(selectedListing.id),
          escrowDeliveryWindow,
          expectedWei
        ],
        value: parseEther(formatEther(expectedWei))
      });

      setStatus({ type: "loading", message: "Waiting for blockchain confirmation..." });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (selectedOrderId) {
        const events = parseEventLogs({
          abi: escrowAbi,
          logs: receipt.logs,
          eventName: "EscrowCreated"
        });
        const escrowId = events[0]?.args?.escrowId;
        if (escrowId === undefined) throw new Error("Escrow confirmation did not include an escrow ID");
        const orderResponse = await fetch(`${apiUrl}/api/orders/${selectedOrderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status: "FUNDED",
            escrowId: escrowId.toString(),
            fundingTxHash: receipt.transactionHash
          })
        });
        const orderResult = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(orderResult.error ?? "Unable to link escrow to order");
        setOrders((current) => current.map((order) => order.id === selectedOrderId ? orderResult.data : order));
        setSelectedOrderId("");
        setSelectedOrderAmount("");
      }
      setStatus({
        type: "success",
        message: `Escrow funded. Transaction: ${receipt.transactionHash}`
      });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: error.shortMessage ?? error.message });
    }
  }

  async function handleMakeOffer(event) {
    event.preventDefault();
    if (!token) {
      setStatus({ type: "error", message: "Connect MetaMask before sending an offer." });
      return;
    }
    if (!selectedListing || !offerAmount || Number(offerAmount) <= 0) {
      setStatus({ type: "error", message: "Enter a positive offer amount." });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          amount: offerAmount,
          message: offerMessage
        })
      });
      const result = await readApiResponse(response, "Unable to send offer");
      if (!result.data) throw new Error("The server returned an invalid offer.");

      setOffers((current) => [result.data, ...current]);
      setOfferAmount("");
      setOfferMessage("");
      setStatus({ type: "success", message: "Offer sent to the seller." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  function handleChatWithSeller() {
    if (!token) {
      setStatus({ type: "error", message: "Connect MetaMask before chatting with the seller." });
      return;
    }
    setChatRecipientId(selectedListing.seller.id);
    setMessages([]);
    navigateTo("chat");
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!chatMessage.trim() || !selectedListing) return;

    try {
      const response = await fetch(`${apiUrl}/api/offers/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          recipientId: chatRecipientId || selectedListing.seller.id,
          body: chatMessage.trim()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to send message");

      setMessages((current) => [
        ...current,
        { id: result.data.id, text: result.data.body, mine: true }
      ]);
      setChatMessage("");
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

  }

  async function handleOfferStatus(offerId, nextStatus) {
    try {
      const response = await fetch(`${apiUrl}/api/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update offer");
      setOffers((current) =>
        current.map((offer) => {
          if (offer.id === offerId) return result.data;
          if (nextStatus === "ACCEPTED" && offer.listingId === result.data.listingId && offer.status === "PENDING") {
            return { ...offer, status: "REJECTED" };
          }
          return offer;
        })
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }

  }

  async function handleCreateOrder(offerId) {
      try {
        const response = await fetch(`${apiUrl}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ offerId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to start order");
        setOrders((current) => [result.data, ...current.filter((order) => order.id !== result.data.id)]);
        setStatus({ type: "success", message: "Order started. Fund it through escrow to continue." });
        navigateTo("orders");
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      }
    }

  async function handleOrderStatus(orderId, nextStatus) {
      try {
        const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: nextStatus })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to update order");
        setOrders((current) => current.map((order) => order.id === orderId ? result.data : order));
      } catch (error) {
        setStatus({ type: "error", message: error.message });
    }
  }

  return (
    <main className="app-shell">
      {screen === "landing" && (
        <section className="landing-screen">
          <div className="landing-glow landing-glow-one" />
          <div className="landing-glow landing-glow-two" />
          <header className="topbar landing-topbar">
            <button className="brand-mark" type="button" onClick={() => navigateTo("landing")}>
              <span className="brand-orb">✦</span>
              Trust Trade
            </button>
            <button className="glass-button" type="button" onClick={() => navigateTo("login")}>
              Sign in <span>↗</span>
            </button>
          </header>
          <div className="landing-content">
            <p className="eyebrow">THE CAMPUS EXCHANGE</p>
            <h1>Trade with trust.<br /><em>Move with confidence.</em></h1>
            <p className="landing-copy">
              A calmer marketplace for campus life. Find what you need, make a fair offer,
              and let escrow keep the exchange honest.
            </p>
            <div className="landing-actions">
              <button type="button" onClick={() => navigateTo("login")}>Enter marketplace <span>→</span></button>
              <span className="landing-note">Protected by on-chain escrow</span>
            </div>
          </div>
          <div className="landing-bento">
            <div className="landing-mini-card mini-card-large">
              <span className="mini-icon">◒</span>
              <strong>Fair exchange</strong>
              <p>Offers, bargains, and transparent settlement.</p>
            </div>
            <div className="landing-mini-card mini-card-dark">
              <span className="mini-icon">⌁</span>
              <strong>Campus, connected</strong>
              <p>Everything students need, close to home.</p>
            </div>
            <div className="landing-mini-card mini-card-price">
              <span>₹</span><strong>10k+</strong><small>items traded</small>
            </div>
          </div>
        </section>
      )}

      {screen === "login" && (
        <section className="login-screen">
          <div className="login-card clay-card">
            <button className="back-button" type="button" onClick={() => navigateTo("landing")}>← Back</button>
            <div className="login-symbol">✦</div>
            <p className="eyebrow">WELCOME TO TRUST TRADE</p>
            <h1>Your campus,<br /><em>in your hands.</em></h1>
            <p className="hero-copy">
              Connect a MetaMask wallet to create your profile. Use a different wallet
              to test another account.
            </p>
            <button className="login-button" type="button" onClick={handleConnectWallet}>
              {authStatus === "Connecting..." ? "Connecting..." : "Continue with MetaMask"} <span>→</span>
            </button>
            {authStatus !== "idle" && <p className="wallet-status">{authStatus}</p>}
            <p className="login-footnote">Sepolia test network · No passwords required</p>
          </div>
          <div className="login-art">
            <div className="art-orb orb-one" />
            <div className="art-orb orb-two" />
            <div className="art-note">
              <span>01</span>
              <strong>Buy better.<br />Sell simpler.</strong>
            </div>
          </div>
        </section>
      )}

      {screen !== "landing" && screen !== "login" && (
      <>
      <header className="topbar app-topbar">
        <button className="brand-mark" type="button" onClick={() => navigateTo("marketplace")}>
          <span className="brand-orb">✦</span>
          Trust Trade
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={screen === "marketplace" ? "nav-active" : ""} type="button" onClick={() => navigateTo("marketplace")}>Marketplace</button>
          <button className={screen === "offers" ? "nav-active" : ""} type="button" onClick={() => navigateTo("offers")}>Offers <span className="nav-count">{offers.length}</span></button>
          <button className={screen === "orders" ? "nav-active" : ""} type="button" onClick={() => navigateTo("orders")}>Orders <span className="nav-count">{orders.length}</span></button>
          <button className={screen === "chat" ? "nav-active" : ""} type="button" onClick={() => navigateTo("chat")}>Chat</button>
        </nav>
        <div className="profile-wrap">
          <button className="profile-button" type="button" onClick={() => setProfileOpen((current) => !current)}>
            <span className="profile-avatar">{wallet ? wallet.slice(2, 4).toUpperCase() : "TT"}</span>
            <span className="profile-name">{wallet ? `${wallet.slice(0, 6)}...` : "Profile"}</span>
            <span>⌄</span>
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <button type="button" onClick={() => navigateTo("create")}>＋ Create listing</button>
              <button type="button" onClick={() => navigateTo("profile")}>◎ My profile</button>
              <button type="button" onClick={() => navigateTo("my-listings")}>▦ My listings</button>
              <button type="button" onClick={() => navigateTo("offers")}>◌ Available offers</button>
              <button type="button" onClick={() => navigateTo("orders")}>▣ Orders</button>
              <button type="button" onClick={() => navigateTo("chat")}>◍ Chat with clients</button>
              <button type="button" className="menu-logout" onClick={() => handleLogout()}>Log out</button>
            </div>
          )}
        </div>
      </header>
      <div className="page-shell">
      {(screen === "marketplace" || screen === "create") && (
      <>
      {screen === "marketplace" && (
      <header className="hero">
        {networkStatus === "unsupported" && (
          <p className="network-warning">
            Unsupported network. Switch MetaMask to {targetChainName}.
          </p>
        )}
        {networkStatus === "supported" && chainId && (
          <p className="network-status">Network: {targetChainName}</p>
        )}
        <p className="eyebrow">TRUST TRADE</p>
        <h1>Sell what you no longer need.</h1>
        <p className="hero-copy">
          Create a campus listing with secure image storage. Escrow payments are
          coming next.
        </p>
        {authStatus && authStatus !== "idle" && (
          <p className="wallet-status">{authStatus}</p>
        )}
      </header>
      )}

      {screen === "create" && (
      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NEW LISTING</p>
            <h2>Tell your campus about it</h2>
          </div>
          <span className="step-badge">01 / 04</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              Item title
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Engineering Mathematics textbook"
                required
              />
            </label>

            <label>
              Category
              <select name="category" value={form.category} onChange={handleChange} required>
                <option value="">Choose category</option>
                <option value="Textbooks">Textbooks</option>
                <option value="Calculators">Calculators</option>
                <option value="Lab equipment">Lab equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the condition, pickup location, and anything a buyer should know."
              rows="5"
              required
            />
          </label>

          <div className="field-grid">
            <label>
              Price
              <div className="price-input">
                <span>₹</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>
            </label>

          </div>

          <label className="upload-field">
            Item photos
            <span className="upload-box">
              <strong>Choose up to 5 photos</strong>
              <small>JPEG, PNG, or WebP · 5 MB maximum each</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
              />
            </span>
          </label>

          {files.length > 0 && (
            <div className="preview-grid" aria-label="Selected image previews">
              {files.map(({ file, previewUrl }) => (
                <img key={`${file.name}-${previewUrl}`} src={previewUrl} alt={file.name} />
              ))}
            </div>
          )}

          {status.message && (
            <p className={`status-message ${status.type}`} role="status">
              {status.message}
            </p>
          )}

          <button type="submit" disabled={status.type === "loading" || !token}>
            {status.type === "loading" ? "Creating..." : "Publish listing"}
          </button>
          {!token && (
            <p className="muted-copy">Connect MetaMask before publishing a listing.</p>
          )}
        </form>
      </section>
      )}

      {screen === "marketplace" && (
      <section className="marketplace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CAMPUS MARKETPLACE</p>
            <h2>Recently listed</h2>
          </div>
          <span className="listing-count">{listings.length} items</span>
        </div>

        {listingsStatus === "loading" && <p className="muted-copy">Loading listings...</p>}
        {listingsStatus === "error" && (
          <p className="status-message error">Unable to load listings.</p>
        )}
        {listingsStatus === "ready" && listings.length === 0 && (
          <p className="muted-copy">No listings yet. Create the first one above.</p>
        )}
        {listings.length > 0 && (
          <div className="listing-grid">
            {listings.map((listing) => (
              <button
                className="listing-card"
                key={listing.id}
                type="button"
                onClick={() => handleListingSelect(listing.id)}
              >
                {listing.images[0] ? (
                  <img src={listing.images[0].url} alt={listing.title} />
                ) : (
                  <div className="image-placeholder">No image</div>
                )}
                <div className="listing-card-content">
                  <div className="listing-card-topline">
                    <span>{listing.category}</span>
                    <strong>₹{listing.price}</strong>
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {screen === "marketplace" && (
      <>
      {detailStatus === "loading" && (
        <p className="muted-copy detail-status">Loading listing details...</p>
      )}
      {detailStatus === "error" && (
        <p className="status-message error detail-status">
          Unable to load listing details.
        </p>
      )}
      {selectedListing && detailStatus === "ready" && (
        <section className="detail-card">
          <div className="detail-gallery">
            {selectedListing.images.length > 0 ? (
              selectedListing.images.map((image) => (
                <img key={image.id} src={image.url} alt={selectedListing.title} />
              ))
            ) : (
              <div className="image-placeholder">No image</div>
            )}
          </div>
          <div className="detail-copy">
            <button
              className="close-detail"
              type="button"
              onClick={() => setSelectedListing(null)}
            >
              Close
            </button>
            <p className="eyebrow">{selectedListing.category}</p>
            <h2>{selectedListing.title}</h2>
            <p className="detail-price">₹{selectedListing.price}</p>
            <p className="detail-description">{selectedListing.description}</p>
            <p className="seller-line">
              Listed by {selectedListing.seller.name ?? selectedListing.seller.wallet}
            </p>
            {selectedListing.seller.id === userId ? (
              editMode ? (
                <form className="edit-form" onSubmit={handleUpdateListing}>
                  <label>
                    Title
                    <input name="title" value={editForm.title} onChange={handleEditChange} />
                  </label>
                  <label>
                    Description
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      rows="4"
                    />
                  </label>
                  <label>
                    Price
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={handleEditChange}
                    />
                  </label>
                  <label>
                    Category
                    <input name="category" value={editForm.category} onChange={handleEditChange} />
                  </label>
                  <button type="submit" disabled={status.type === "loading"}>
                    Save changes
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="owner-actions">
                  <p className="muted-copy">This is your listing. Switch to a different MetaMask account to make an offer.</p>
                  <button type="button" onClick={() => setEditMode(true)}>
                    Edit listing
                  </button>
                  <button type="button" className="danger-button" onClick={handleDeleteListing}>
                    Delete listing
                  </button>
                </div>
              )
            ) : (
              <div className="escrow-actions">
                {!token && (
                  <p className="status-message error">
                    Connect MetaMask to make an offer or chat with the seller.
                  </p>
                )}
                {quoteStatus === "loading" && (
                  <p className="muted-copy">Loading live ETH/INR price...</p>
                )}
                {quoteStatus === "error" && (
                  <p className="status-message error">
                    Unable to load the live ETH/INR price.
                    <button type="button" className="secondary-button" onClick={() => loadEthQuote(selectedListing.id, selectedListing.price)}>
                      Retry quote
                    </button>
                  </p>
                )}
                {quoteStatus === "ready" && ethQuote && (
                  <>
                    <p className="escrow-price">
                      {selectedOrderId ? "Agreed order amount" : "Listing price"}: ₹{selectedOrderAmount || selectedListing.price}
                    </p>
                    <p className="escrow-price">
                      Required escrow: <strong>{escrowAmount} ETH</strong>
                    </p>
                    <p className="muted-copy">
                      Rate: ₹{ethQuote.ethInr.toLocaleString("en-IN")} per ETH. Quote expires at{" "}
                      {new Date(ethQuote.expiresAt).toLocaleTimeString()}.
                    </p>
                    <button type="button" className="secondary-button" onClick={() => loadEthQuote(selectedListing.id, selectedOrderAmount || selectedListing.price)}>
                      Refresh quote
                    </button>
                  </>
                )}
                {selectedOrderId ? (
                  <button
                    className="escrow-button"
                    type="button"
                    onClick={handleBuyWithEscrow}
                    disabled={
                      !token ||
                      !escrowContractAddress ||
                      quoteStatus !== "ready" ||
                      status.type === "loading"
                    }
                  >
                    {status.type === "loading" ? "Processing..." : "Fund order escrow"}
                  </button>
                ) : (
                  <p className="muted-copy">Escrow becomes available after a seller accepts your offer and you start an order.</p>
                )}
                <form className="offer-form" onSubmit={handleMakeOffer}>
                  <label>
                    Make an offer (₹)
                    <input type="number" min="1" step="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder={selectedListing.price} />
                  </label>
                  <input value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} placeholder="Add a note to the seller (optional)" />
                  <div className="detail-action-row">
                    <button type="submit" className="secondary-button" disabled={!token || status.type === "loading"}>
                      {status.type === "loading" ? "Sending..." : "Send offer"}
                    </button>
                    <button type="button" className="secondary-button" onClick={handleChatWithSeller}>
                      Chat with seller
                    </button>
                  </div>
                </form>
                {!escrowContractAddress && (
                  <p className="muted-copy">Configure the deployed escrow contract first.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      </>
      )}
      </>
      )}

      {screen === "create" && (
        null
      )}

      {screen === "my-listings" && (
        <section className="workspace-card">
          <p className="eyebrow">YOUR SPACE</p>
          <h1>My listings</h1>
          <div className="listing-grid">
            {listings.filter((listing) => listing.seller.id === userId).map((listing) => (
              <button className="listing-card" key={listing.id} type="button" onClick={() => { navigateTo("marketplace"); handleListingSelect(listing.id); }}>
                {listing.images[0] ? <img src={listing.images[0].url} alt={listing.title} /> : <div className="image-placeholder">No image</div>}
                <div className="listing-card-content"><h3>{listing.title}</h3><strong>₹{listing.price}</strong></div>
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === "profile" && (
        <section className="workspace-card profile-workspace">
          <p className="eyebrow">YOUR IDENTITY</p>
          <h1>My profile</h1>
          <p className="hero-copy">Share only the contact details you want other campus users to see.</p>
          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <label>
              Display name
              <input name="name" value={profile.name} onChange={handleProfileChange} placeholder="How should buyers address you?" />
            </label>
            <div className="field-grid">
              <label>
                Email
                <input name="email" type="email" value={profile.email} onChange={handleProfileChange} placeholder="you@example.com" />
              </label>
              <label>
                Phone
                <input name="phone" value={profile.phone} onChange={handleProfileChange} placeholder="+91 ..." />
              </label>
            </div>
            <label>
              Contact information
              <textarea name="contactInfo" value={profile.contactInfo} onChange={handleProfileChange} rows="4" placeholder="Preferred contact method or campus pickup details" />
            </label>
            <label>
              Connected wallet
              <input value={wallet} readOnly />
            </label>
            {profileStatus.message && <p className={`status-message ${profileStatus.type}`} role="status">{profileStatus.message}</p>}
            <button type="submit" disabled={profileStatus.type === "loading"}>{profileStatus.type === "loading" ? "Saving..." : "Save profile"}</button>
          </form>
        </section>
      )}

      {screen === "offers" && (
        <section className="workspace-card">
          <p className="eyebrow">NEGOTIATE FAIRLY</p>
          <h1>Available offers</h1>
          {offers.length === 0 ? <p className="muted-copy">Offers from buyers will appear here as they bargain with you.</p> : (
            <div className="offer-list">{offers.map((offer) => <article className="offer-row" key={offer.id}><div><strong>{offer.listing.title}</strong><p>{offer.message || "No note attached"}</p></div><b>₹{offer.amount}</b><span>{offer.status}</span>{offer.sellerId === userId && offer.status === "PENDING" && <><button type="button" onClick={() => handleOfferStatus(offer.id, "ACCEPTED")}>Accept</button><button type="button" className="secondary-button" onClick={() => handleOfferStatus(offer.id, "REJECTED")}>Decline</button></>}{offer.buyerId === userId && offer.status === "ACCEPTED" && !orders.some((order) => order.offerId === offer.id) && <button type="button" onClick={() => handleCreateOrder(offer.id)}>Start order</button>}<button type="button" onClick={() => { setSelectedListing({ id: offer.listingId, title: offer.listing.title, seller: offer.seller }); setChatRecipientId(offer.buyerId); navigateTo("chat"); }}>Chat</button></article>)}</div>
          )}
        </section>
      )}

      {screen === "orders" && (
        <section className="workspace-card">
          <p className="eyebrow">ESCROW WORKSPACE</p>
          <h1>Your orders</h1>
          {orders.length === 0 ? <p className="muted-copy">Accepted offers become orders here.</p> : (
            <div className="offer-list">{orders.map((order) => {
              const isBuyer = order.buyerId === userId;
              return <article className="offer-row order-row" key={order.id}>
                <div><strong>{order.listing.title}</strong><p>{isBuyer ? "Buying from" : "Selling to"} {isBuyer ? order.seller.wallet : order.buyer.wallet}</p></div>
                <b>{order.status.replaceAll("_", " ")}</b>
                {order.status === "AWAITING_ESCROW" && isBuyer && <button type="button" onClick={() => { setSelectedOrderId(order.id); setSelectedOrderAmount(order.offerAmount ?? order.listing.price); setSelectedListing({ id: order.listingId, title: order.listing.title, price: order.listing.price, seller: order.seller }); loadEthQuote(order.listingId, order.offerAmount ?? order.listing.price); navigateTo("marketplace"); }}>Fund escrow</button>}
                {order.status === "FUNDED" && !isBuyer && <button type="button" onClick={() => handleOrderStatus(order.id, "SHIPPED")}>Mark shipped</button>}
                {order.status === "SHIPPED" && isBuyer && <button type="button" onClick={() => handleOrderStatus(order.id, "DELIVERED")}>Confirm delivery</button>}
                {["FUNDED", "SHIPPED"].includes(order.status) && isBuyer && <button type="button" className="secondary-button" onClick={() => handleOrderStatus(order.id, "DISPUTED")}>Raise dispute</button>}
              </article>;
            })}</div>
          )}
        </section>
      )}

      {screen === "chat" && (
        <section className="workspace-card chat-workspace">
          <div><p className="eyebrow">DIRECT MESSAGES</p><h1>Chat with clients</h1><p className="hero-copy">Bargain clearly, then move the agreed amount into escrow.</p></div>
          <div className="chat-panel">
            <div className="message-list">{messages.length === 0 ? <p className="muted-copy">Start a conversation from an offer.</p> : messages.map((message) => <div className={message.mine ? "message mine" : "message"} key={message.id}>{message.text}</div>)}</div>
            <form onSubmit={handleSendMessage} className="chat-composer"><input value={chatMessage} onChange={(event) => setChatMessage(event.target.value)} placeholder="Write a message..." /><button type="submit">Send</button></form>
          </div>
        </section>
      )}
      </div>
      </>
      )}
    </main>
  );
}

export default App;
