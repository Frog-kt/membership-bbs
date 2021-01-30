import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
	console.log("Server running");
});
