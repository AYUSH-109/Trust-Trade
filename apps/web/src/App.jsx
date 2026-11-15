import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState({ type: "idle", message: "" });

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
      setForm({ title: "", description: "", price: "", category: "", sellerId: "" });
      setFiles([]);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">TRUST TRADE</p>
        <h1>Sell what you no longer need.</h1>
        <p className="hero-copy">
          Create a campus listing with secure image storage. Escrow payments are
          coming next.
        </p>
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
    </main>
  );
}

export default App;
