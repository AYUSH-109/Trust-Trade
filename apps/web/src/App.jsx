import { useEffect, useState } from "react";
import { createWalletClient, custom } from "viem";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const maximumImages = 5;

function App() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    sellerId: ""
  });
  const [files, setFiles] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsStatus, setListingsStatus] = useState("loading");
  const [selectedListing, setSelectedListing] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [wallet, setWallet] = useState("");
  const [authStatus, setAuthStatus] = useState("idle");

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

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Creating listing..." });

    const body = new FormData();
    Object.entries(form).forEach(([name, value]) => body.append(name, value));
    files.forEach(({ file }) => body.append("images", file));

    try {
      const response = await fetch(`${apiUrl}/api/listings`, {
        method: "POST",
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
      setForm({ title: "", description: "", price: "", category: "", sellerId: "" });
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
      setAuthStatus("Connected");
    } catch (error) {
      console.error(error);
      setAuthStatus(error.message);
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
      setDetailStatus("ready");
    } catch (error) {
      console.error(error);
      setDetailStatus("error");
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <button className="wallet-button" type="button" onClick={handleConnectWallet}>
          {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect MetaMask"}
        </button>
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

            <label>
              Seller ID <span className="muted">(temporary)</span>
              <input
                name="sellerId"
                value={form.sellerId}
                onChange={handleChange}
                placeholder="Paste an existing User ID"
                required
              />
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

          <button type="submit" disabled={status.type === "loading"}>
            {status.type === "loading" ? "Creating..." : "Publish listing"}
          </button>
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
            <button className="escrow-button" type="button" disabled>
              Buy with escrow (coming next)
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
