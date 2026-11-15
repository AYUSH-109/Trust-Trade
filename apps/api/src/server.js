import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "trust-trade-api"
  });
});

app.listen(port, () => {
  console.log(`Trust Trade API listening on http://localhost:${port}`);
});