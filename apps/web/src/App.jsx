import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    category: ""
  });
  const [escrowAmount, setEscrowAmount] = useState("");
  const [ethQuote, setEthQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");

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
        setAuthStatus("Connected");
      })
      .catch((error) => {
        console.error(error);
        handleLogout();
      });

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

      const client = createWalletClient({ transport: custom(window.ethereum) });
      const [address] = await client.requestAddresses();
      const challengeResponse = await fetch(`${apiUrl}/api/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address })
      });
      const challengeResult = await challengeResponse.json();

      if (!challengeResponse.ok) {
        throw new Error(challengeResult.error ?? "Unable to start authentication");
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
      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyResult.error ?? "Unable to verify wallet");
      }

      setWallet(verifyResult.data.user.wallet);
      setUserId(verifyResult.data.user.id);
      setToken(verifyResult.data.token);
      localStorage.setItem("trust_trade_token", verifyResult.data.token);
      setAuthStatus("Connected");
    } catch (error) {
      console.error(error);
      setAuthStatus(error.message);
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
      setEditForm({
        title: result.data.title,
        description: result.data.description,
        price: result.data.price,
        category: result.data.category
      });
      setEditMode(false);
      setEscrowAmount("");
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
      const hash = await walletClient.writeContract({
        address: escrowContractAddress,
        abi: escrowAbi,
        functionName: "createEscrow",
        account,
        args: [
          selectedListing.seller.wallet,
          getListingContractId(selectedListing.id),
          escrowDeliveryWindow,
          calculateRequiredWei(selectedListing.price, ethQuote.ratePaise)
        ],
        value: parseEther(escrowAmount)
      });

      setStatus({ type: "loading", message: "Waiting for blockchain confirmation..." });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setStatus({
        type: "success",
        message: `Escrow funded. Transaction: ${receipt.transactionHash}`
      });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: error.shortMessage ?? error.message });
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <button className="wallet-button" type="button" onClick={handleConnectWallet}>
          {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect MetaMask"}
        </button>
        {wallet && (
          <button className="logout-button" type="button" onClick={() => handleLogout()}>
            Logout
          </button>
        )}
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
                      Listing price: ₹{selectedListing.price}
                    </p>
                    <p className="escrow-price">
                      Required escrow: <strong>{escrowAmount} ETH</strong>
                    </p>
                    <p className="muted-copy">
                      Rate: ₹{ethQuote.ethInr.toLocaleString("en-IN")} per ETH. Quote expires at{" "}
                      {new Date(ethQuote.expiresAt).toLocaleTimeString()}.
                    </p>
                    <button type="button" className="secondary-button" onClick={() => loadEthQuote(selectedListing.id, selectedListing.price)}>
                      Refresh quote
                    </button>
                  </>
                )}
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
                  {status.type === "loading" ? "Processing..." : "Fund with escrow"}
                </button>
                {!escrowContractAddress && (
                  <p className="muted-copy">Configure the deployed escrow contract first.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
